# NearMe — Expo Mobile App

Beautiful, production-ready React Native app built with Expo SDK 51.
Covers every API endpoint from the NearMe backend.

## Tech Stack

| Layer        | Technology                                  |
|---|---|
| Framework    | Expo SDK 51 + Expo Router v3 (file-based)   |
| Navigation   | Expo Router (tabs + stack + sheets)         |
| State        | Zustand (persisted with AsyncStorage)       |
| Server state | TanStack React Query v5                     |
| HTTP         | Axios + interceptors + auto-refresh         |
| Auth storage | expo-secure-store (encrypted on device)     |
| UI           | Custom dark design system                   |
| Animations   | react-native-reanimated v3                  |
| Location     | expo-location                               |
| Camera       | expo-image-picker                           |
| Haptics      | expo-haptics                                |
| Fonts        | @expo-google-fonts/syne + dm-sans           |
| Forms        | react-hook-form + zod                       |
| Dates        | date-fns                                    |

## Quick Start

### 1. Install dependencies

\`\`\`bash
cd nearme-expo
npm install
\`\`\`

### 2. Set API URL

Edit `.env`:
\`\`\`
EXPO_PUBLIC_API_URL=http://YOUR_API_HOST:3000/api/v1
\`\`\`

> For a physical device replace `localhost` with your computer's local IP address.

### 3. Run

\`\`\`bash
# iOS simulator
npx expo start --ios

# Android emulator  
npx expo start --android

# Expo Go (physical device — scan QR code)
npx expo start
\`\`\`

## Screen Map

### Auth
- `/login` — Email + password sign in
- `/register` — Register with handle availability check

### Tabs (always visible)
- `feed` — Ranked discovery feed (6-factor algorithm), GPS, filters
- `search` — Global search (places + posts) + search history
- `saves` — Bookmarked places with category filter + analytics
- `notifications` — Notification inbox with unread badge
- `profile` — User profile, sessions, GDPR deletion

### Detail Screens
- `/place/[placeId]` — Full place detail, community posts, save/like
- `/post/[postId]` — Post detail with likes, who liked, report
- `/user/[handle]` — Public user profile

### Admin (admin/moderator role required)
- `/admin` — Dashboard: all-table stats, cron triggers, search trends
- `/admin/users` — User management, ban/unban, role change
- `/admin/moderation` — Moderation queue (approve / reject)
- `/admin/reports` — Content reports (keep / remove post)
- `/admin/audit` — Immutable audit log with filters
- `/admin/algorithm` — Feed ranking weights visualisation + activation
- `/admin/posts` — All posts list with moderation actions
- `/admin/places` — Places cache list
- `/admin/sessions` — Active sessions, revoke
- `/admin/jobs` — Manually trigger all 7 DB maintenance cron jobs

## Features Implemented

### Every API endpoint is wired:
- ✅ Auth: register, login, refresh (auto), logout, logout-all
- ✅ Users: profile, edit, handle check, GDPR deletion, cancel deletion
- ✅ Feed: ranked feed, algorithm config, analytics
- ✅ Places: search, nearby, detail, upsert (admin), feature (admin)
- ✅ Saves: save, unsave, list, check, count, analytics
- ✅ Posts: create, view, like/unlike, check liked, who liked, delete
- ✅ Notifications: list, mark read, delete, clear all
- ✅ Reports: submit, my reports, admin list, resolve
- ✅ Search: global search, history, delete/clear history
- ✅ Sessions: list, revoke one, revoke all
- ✅ Audit: list, filter, summary
- ✅ Algorithm: list versions, active config, activate
- ✅ Admin dashboard: all table stats
- ✅ Admin analytics: user growth, post trends, top places, search trends
- ✅ Admin jobs: trigger all 7 PostgreSQL stored procedures

### UX / Design:
- 🎨 Dark theme with orange brand (`#F97316`)
- ✨ Spring animations (enter, exit, press feedback)
- 📳 Haptic feedback on interactions
- 🔄 Pull-to-refresh on all list screens
- ♾️ Pagination on lists
- 💬 Toast notifications (success + error)
- ⌨️ Keyboard-avoiding on auth forms
- 🔒 Secure token storage (expo-secure-store)
- 📍 Geolocation with permission flow
- 📷 Camera + gallery picker for posts
- 🌐 GDPR-safe: GPS coordinates ephemeral, never stored

## Project Structure

\`\`\`
nearme-expo/
├── app/                     ← Expo Router file-based routes
│   ├── _layout.tsx          ← Root layout (fonts, providers, auth guard)
│   ├── index.tsx            ← Redirect to feed or login
│   ├── (auth)/              ← Login, Register
│   └── (app)/               ← Protected routes
│       ├── (tabs)/          ← Bottom tab navigator
│       │   ├── feed.tsx
│       │   ├── search.tsx
│       │   ├── saves.tsx
│       │   ├── notifications.tsx
│       │   └── profile.tsx
│       ├── place/[placeId].tsx
│       ├── post/[postId].tsx
│       ├── user/[handle].tsx
│       └── admin/           ← All admin screens
├── src/
│   ├── api/index.ts         ← All API functions (axios)
│   ├── store/index.ts       ← Zustand stores
│   ├── theme/index.ts       ← Design system
│   ├── types/index.ts       ← TypeScript types
│   ├── hooks/index.ts       ← Custom hooks
│   └── components/
│       ├── ui/index.tsx     ← Button, Input, Card, Badge, Modal, ...
│       ├── feed/
│       │   ├── PlaceCard.tsx
│       │   └── FeedFiltersSheet.tsx
│       ├── posts/
│       │   ├── CreatePostSheet.tsx
│       │   └── ReportSheet.tsx
│       └── notifications/
│           └── NotificationItem.tsx
└── assets/
\`\`\`
