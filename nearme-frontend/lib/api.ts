import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken') || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401, refresh token
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          const { accessToken, refreshToken: newRefresh } = data.data;
          Cookies.set('accessToken', accessToken, { expires: 1 });
          Cookies.set('refreshToken', newRefresh, { expires: 60 });
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefresh);
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          clearTokens();
          if (typeof window !== 'undefined') window.location.href = '/login';
        }
      } else {
        clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function setTokens(accessToken: string, refreshToken: string) {
  Cookies.set('accessToken', accessToken, { expires: 1 });
  Cookies.set('refreshToken', refreshToken, { expires: 60 });
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getAccessToken() {
  return Cookies.get('accessToken') || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
}

// ── API service functions ──────────────────────────────────────────────────

// Auth
export const authApi = {
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  login: (data: Record<string, unknown>) => api.post('/auth/login', data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: (refreshToken?: string) => api.post('/auth/logout', { refresh_token: refreshToken }),
  logoutAll: () => api.post('/auth/logout-all'),
};

// Users
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: Record<string, unknown>) => api.patch('/users/me', data),
  deleteMe: () => api.delete('/users/me'),
  cancelDeletion: () => api.post('/users/me/cancel-deletion'),
  getProfile: (handleOrId: string) => api.get(`/users/${handleOrId}`),
  checkHandle: (handle: string) => api.get(`/users/handle/${handle}/available`),
  adminList: (params: Record<string, unknown>) => api.get('/users', { params }),
  adminGetUser: (userId: string) => api.get(`/users/admin/${userId}`),
  banUser: (userId: string, reason?: string) => api.post(`/users/${userId}/ban`, { reason }),
  unbanUser: (userId: string) => api.post(`/users/${userId}/unban`),
  setRole: (userId: string, role: string) => api.patch(`/users/${userId}/role`, { role }),
};

// Feed
export const feedApi = {
  getFeed: (params: Record<string, unknown>) => api.get('/feed', { params }),
  getAlgorithm: () => api.get('/feed/algorithm'),
  getAlgorithmVersions: () => api.get('/feed/algorithm/versions'),
  updateAlgorithm: (data: Record<string, unknown>) => api.put('/feed/algorithm', data),
  getAnalytics: (days: number) => api.get('/feed/analytics', { params: { days } }),
};

// Places
export const placesApi = {
  search: (params: Record<string, unknown>) => api.get('/places/search', { params }),
  nearby: (params: Record<string, unknown>) => api.get('/places/nearby', { params }),
  getById: (placeId: string) => api.get(`/places/${placeId}`),
  getDetail: (placeId: string) => api.get(`/places/${placeId}/detail`),
  upsert: (data: Record<string, unknown>) => api.post('/places', data),
  upsertDetail: (placeId: string, data: Record<string, unknown>) => api.put(`/places/${placeId}/detail`, data),
  feature: (placeId: string) => api.post(`/places/${placeId}/feature`),
  adminList: (params: Record<string, unknown>) => api.get('/places', { params }),
};

// Saves
export const savesApi = {
  save: (data: Record<string, unknown>) => api.post('/saves', data),
  unsave: (placeId: string) => api.delete(`/saves/place/${placeId}`),
  getMySaves: (params: Record<string, unknown>) => api.get('/saves', { params }),
  checkSaved: (placeId: string) => api.get(`/saves/place/${placeId}/check`),
  getSave: (placeId: string) => api.get(`/saves/place/${placeId}`),
  getSaveCount: (placeId: string) => api.get(`/saves/place/${placeId}/count`),
  getAnalytics: () => api.get('/saves/analytics'),
};

// Posts
export const postsApi = {
  create: (data: Record<string, unknown>) => api.post('/posts', data),
  getById: (postId: string) => api.get(`/posts/${postId}`),
  getMyPosts: (params: Record<string, unknown>) => api.get('/posts/me', { params }),
  getForPlace: (placeId: string, params: Record<string, unknown>) => api.get(`/posts/place/${placeId}`, { params }),
  like: (postId: string) => api.post(`/posts/${postId}/like`),
  unlike: (postId: string) => api.delete(`/posts/${postId}/like`),
  checkLiked: (postId: string) => api.get(`/posts/${postId}/like/check`),
  getLikes: (postId: string, params: Record<string, unknown>) => api.get(`/posts/${postId}/likes`, { params }),
  delete: (postId: string) => api.delete(`/posts/${postId}`),
  moderate: (postId: string, data: Record<string, unknown>) => api.patch(`/posts/${postId}/moderate`, data),
  getModerationQueue: (params: Record<string, unknown>) => api.get('/posts/moderation-queue', { params }),
  adminList: (params: Record<string, unknown>) => api.get('/posts', { params }),
};

// Notifications
export const notificationsApi = {
  getAll: (params: Record<string, unknown>) => api.get('/notifications', { params }),
  markAllRead: () => api.patch('/notifications/read-all'),
  markRead: (notifId: string) => api.patch(`/notifications/${notifId}/read`),
  delete: (notifId: string) => api.delete(`/notifications/${notifId}`),
  clearAll: () => api.delete('/notifications'),
  create: (data: Record<string, unknown>) => api.post('/notifications', data),
};

// Reports
export const reportsApi = {
  submit: (data: Record<string, unknown>) => api.post('/reports', data),
  getMyReports: (params: Record<string, unknown>) => api.get('/reports/me', { params }),
  adminList: (params: Record<string, unknown>) => api.get('/reports', { params }),
  resolve: (reportId: string, data: Record<string, unknown>) => api.patch(`/reports/${reportId}/resolve`, data),
};

// Search
export const searchApi = {
  search: (q: string) => api.get('/search', { params: { q } }),
  getHistory: () => api.get('/search/history'),
  deleteHistoryItem: (id: string) => api.delete(`/search/history/${id}`),
  clearHistory: () => api.delete('/search/history'),
};

// Sessions
export const sessionsApi = {
  getMySessions: () => api.get('/sessions/me'),
  revokeOne: (sessionId: string) => api.delete(`/sessions/me/${sessionId}`),
  revokeAll: () => api.delete('/sessions/me'),
  adminList: (params: Record<string, unknown>) => api.get('/sessions', { params }),
  adminGetUser: (userId: string) => api.get(`/sessions/user/${userId}`),
  adminRevokeUser: (userId: string) => api.delete(`/sessions/user/${userId}`),
};

// Audit
export const auditApi = {
  list: (params: Record<string, unknown>) => api.get('/audit', { params }),
  getById: (logId: string) => api.get(`/audit/${logId}`),
  getSummary: () => api.get('/audit/summary'),
  append: (data: Record<string, unknown>) => api.post('/audit', data),
};

// Algorithm
export const algorithmApi = {
  list: () => api.get('/algorithm'),
  getActive: () => api.get('/algorithm/active'),
  deploy: (data: Record<string, unknown>) => api.post('/algorithm', data),
  activate: (version: string) => api.patch(`/algorithm/${version}/activate`),
  delete: (version: string) => api.delete(`/algorithm/${version}`),
};

// Admin
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getRateLimits: () => api.get('/admin/rate-limits'),
  getUserAnalytics: (days: number) => api.get('/admin/analytics/users', { params: { days } }),
  getPostAnalytics: (days: number) => api.get('/admin/analytics/posts', { params: { days } }),
  getPlaceAnalytics: (limit: number) => api.get('/admin/analytics/places', { params: { limit } }),
  getSearchAnalytics: (limit: number) => api.get('/admin/analytics/search', { params: { limit } }),
  listJobs: () => api.get('/admin/jobs'),
  triggerJob: (jobName: string) => api.post(`/admin/jobs/${jobName}/trigger`),
};

// Health
export const healthApi = {
  check: () => api.get('/health', { baseURL: process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') }),
  ready: () => api.get('/health/ready', { baseURL: process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') }),
  detailed: () => api.get('/health/detailed', { baseURL: process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') }),
};
