import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  if (Platform.OS === 'android' && configured.includes('localhost')) {
    return configured.replace('localhost', '10.0.2.2');
  }
  return configured;
}

const BASE_URL = resolveBaseUrl();

// ── Token storage (SecureStore on device, memory fallback for web) ─────────────
const memoryStore: Record<string, string> = {};

export const TokenStorage = {
  async get(key: string): Promise<string | null> {
    try { return await SecureStore.getItemAsync(key); }
    catch { return memoryStore[key] ?? null; }
  },
  async set(key: string, value: string): Promise<void> {
    try { await SecureStore.setItemAsync(key, value); }
    catch { memoryStore[key] = value; }
  },
  async delete(key: string): Promise<void> {
    try { await SecureStore.deleteItemAsync(key); }
    catch { delete memoryStore[key]; }
  },
};

// ── Axios instance ─────────────────────────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request — attach bearer token
api.interceptors.request.use(async (config) => {
  const token = await TokenStorage.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response — handle 401 + refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        original.headers!.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }
    original._retry = true;
    isRefreshing = true;
    try {
      const refresh = await TokenStorage.get('refreshToken');
      if (!refresh) throw new Error('No refresh token');
      const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh });
      const { accessToken, refreshToken } = res.data.data;
      await TokenStorage.set('accessToken', accessToken);
      await TokenStorage.set('refreshToken', refreshToken);
      processQueue(null, accessToken);
      original.headers!.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      await TokenStorage.delete('accessToken');
      await TokenStorage.delete('refreshToken');
      // Signal logout to store
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nearme:logout'));
      }
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (d: Record<string, unknown>) => api.post('/auth/register', d),
  login:    (d: Record<string, unknown>) => api.post('/auth/login', d),
  refresh:  (t: string)                  => api.post('/auth/refresh', { refresh_token: t }),
  logout:   (t?: string)                 => api.post('/auth/logout', { refresh_token: t }),
  logoutAll:()                           => api.post('/auth/logout-all'),
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const usersApi = {
  getMe:          ()                              => api.get('/users/me'),
  updateMe:       (d: Record<string, unknown>)   => api.patch('/users/me', d),
  deleteMe:       ()                              => api.delete('/users/me'),
  cancelDeletion: ()                              => api.post('/users/me/cancel-deletion'),
  getProfile:     (id: string)                   => api.get(`/users/${id}`),
  checkHandle:    (h: string)                    => api.get(`/users/handle/${h}/available`),
  adminList:      (p: Record<string, unknown>)   => api.get('/users', { params: p }),
  adminGetUser:   (id: string)                   => api.get(`/users/admin/${id}`),
  banUser:        (id: string, r?: string)       => api.post(`/users/${id}/ban`, { reason: r }),
  unbanUser:      (id: string)                   => api.post(`/users/${id}/unban`),
  setRole:        (id: string, role: string)     => api.patch(`/users/${id}/role`, { role }),
};

// ── Feed ───────────────────────────────────────────────────────────────────────
export const feedApi = {
  getFeed:             (p: Record<string, unknown>) => api.get('/feed', { params: p }),
  getAlgorithm:        ()                           => api.get('/feed/algorithm'),
  getAlgorithmVersions:()                           => api.get('/feed/algorithm/versions'),
  updateAlgorithm:     (d: Record<string, unknown>) => api.put('/feed/algorithm', d),
  getAnalytics:        (days: number)               => api.get('/feed/analytics', { params: { days } }),
};

// ── Places ─────────────────────────────────────────────────────────────────────
export const placesApi = {
  search:      (p: Record<string, unknown>) => api.get('/places/search', { params: p }),
  nearby:      (p: Record<string, unknown>) => api.get('/places/nearby',  { params: p }),
  getById:     (id: string)                 => api.get(`/places/${id}`),
  getDetail:   (id: string)                 => api.get(`/places/${id}/detail`),
  upsert:      (d: Record<string, unknown>) => api.post('/places', d),
  upsertDetail:(id: string, d: Record<string, unknown>) => api.put(`/places/${id}/detail`, d),
  feature:     (id: string)                 => api.post(`/places/${id}/feature`),
  adminList:   (p: Record<string, unknown>) => api.get('/places', { params: p }),
};

// ── Saves ──────────────────────────────────────────────────────────────────────
export const savesApi = {
  save:        (d: Record<string, unknown>) => api.post('/saves', d),
  unsave:      (id: string)                 => api.delete(`/saves/place/${id}`),
  getMySaves:  (p: Record<string, unknown>) => api.get('/saves', { params: p }),
  checkSaved:  (id: string)                 => api.get(`/saves/place/${id}/check`),
  getSave:     (id: string)                 => api.get(`/saves/place/${id}`),
  getSaveCount:(id: string)                 => api.get(`/saves/place/${id}/count`),
  getAnalytics:()                           => api.get('/saves/analytics'),
};

// ── Posts ──────────────────────────────────────────────────────────────────────
export const postsApi = {
  create:         (d: Record<string, unknown>) => api.post('/posts', d),
  getById:        (id: string)                 => api.get(`/posts/${id}`),
  getMyPosts:     (p: Record<string, unknown>) => api.get('/posts/me', { params: p }),
  getForPlace:    (pid: string, p: Record<string, unknown>) => api.get(`/posts/place/${pid}`, { params: p }),
  like:           (id: string)                 => api.post(`/posts/${id}/like`),
  unlike:         (id: string)                 => api.delete(`/posts/${id}/like`),
  checkLiked:     (id: string)                 => api.get(`/posts/${id}/like/check`),
  getLikes:       (id: string, p: Record<string, unknown>) => api.get(`/posts/${id}/likes`, { params: p }),
  delete:         (id: string)                 => api.delete(`/posts/${id}`),
  moderate:       (id: string, d: Record<string, unknown>) => api.patch(`/posts/${id}/moderate`, d),
  getModerationQ: (p: Record<string, unknown>) => api.get('/posts/moderation-queue', { params: p }),
  adminList:      (p: Record<string, unknown>) => api.get('/posts', { params: p }),
};

// ── Notifications ──────────────────────────────────────────────────────────────
export const notificationsApi = {
  getAll:    (p: Record<string, unknown>) => api.get('/notifications', { params: p }),
  markAllRead:()                           => api.patch('/notifications/read-all'),
  markRead:  (id: string)                  => api.patch(`/notifications/${id}/read`),
  delete:    (id: string)                  => api.delete(`/notifications/${id}`),
  clearAll:  ()                            => api.delete('/notifications'),
  create:    (d: Record<string, unknown>)  => api.post('/notifications', d),
};

// ── Reports ────────────────────────────────────────────────────────────────────
export const reportsApi = {
  submit:    (d: Record<string, unknown>)  => api.post('/reports', d),
  getMyReports:(p: Record<string, unknown>)=> api.get('/reports/me', { params: p }),
  adminList: (p: Record<string, unknown>)  => api.get('/reports', { params: p }),
  resolve:   (id: string, d: Record<string, unknown>) => api.patch(`/reports/${id}/resolve`, d),
};

// ── Search ─────────────────────────────────────────────────────────────────────
export const searchApi = {
  search:         (q: string) => api.get('/search', { params: { q } }),
  getHistory:     ()          => api.get('/search/history'),
  deleteHistoryItem:(id: string) => api.delete(`/search/history/${id}`),
  clearHistory:   ()          => api.delete('/search/history'),
};

// ── Sessions ───────────────────────────────────────────────────────────────────
export const sessionsApi = {
  getMySessions: ()           => api.get('/sessions/me'),
  revokeOne:     (id: string) => api.delete(`/sessions/me/${id}`),
  revokeAll:     ()           => api.delete('/sessions/me'),
  adminList:     (p: Record<string, unknown>) => api.get('/sessions', { params: p }),
  adminGetUser:  (uid: string) => api.get(`/sessions/user/${uid}`),
  adminRevoke:   (uid: string) => api.delete(`/sessions/user/${uid}`),
};

// ── Audit ──────────────────────────────────────────────────────────────────────
export const auditApi = {
  list:       (p: Record<string, unknown>) => api.get('/audit', { params: p }),
  getById:    (id: string)                 => api.get(`/audit/${id}`),
  getSummary: ()                           => api.get('/audit/summary'),
  append:     (d: Record<string, unknown>) => api.post('/audit', d),
};

// ── Algorithm ──────────────────────────────────────────────────────────────────
export const algorithmApi = {
  list:     ()               => api.get('/algorithm'),
  getActive:()               => api.get('/algorithm/active'),
  deploy:   (d: Record<string, unknown>) => api.post('/algorithm', d),
  activate: (v: string)     => api.patch(`/algorithm/${v}/activate`),
  delete:   (v: string)     => api.delete(`/algorithm/${v}`),
};

// ── Admin ──────────────────────────────────────────────────────────────────────
export const adminApi = {
  getDashboard:    ()           => api.get('/admin/dashboard'),
  getRateLimits:   ()           => api.get('/admin/rate-limits'),
  getUserAnalytics:(days: number)=> api.get('/admin/analytics/users', { params: { days } }),
  getPostAnalytics:(days: number)=> api.get('/admin/analytics/posts', { params: { days } }),
  getPlaceAnalytics:(limit: number)=> api.get('/admin/analytics/places', { params: { limit } }),
  getSearchAnalytics:(limit: number)=> api.get('/admin/analytics/search', { params: { limit } }),
  listJobs:        ()           => api.get('/admin/jobs'),
  triggerJob:      (name: string) => api.post(`/admin/jobs/${name}/trigger`),
};

// ── Health ─────────────────────────────────────────────────────────────────────
export const healthApi = {
  check:    () => axios.get(BASE_URL.replace('/api/v1', '/health')),
  ready:    () => axios.get(BASE_URL.replace('/api/v1', '/health/ready')),
  detailed: () => axios.get(BASE_URL.replace('/api/v1', '/health/detailed')),
};
