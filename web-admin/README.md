# SIAP Web Admin

Dashboard supervisor berbasis web (Vite + React 18 + TypeScript).

> **Setup lengkap akan dilakukan di TASK-16** (Setup Web Admin & Layout)

## Struktur yang akan dibuat di TASK-16:

```
src/
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── AbsensiPage.tsx
│   ├── LaporanPage.tsx
│   ├── SerahTerimaPage.tsx
│   ├── SatpamPage.tsx
│   └── PengaturanPage.tsx
├── components/
│   ├── layout/Sidebar.tsx
│   ├── layout/Header.tsx
│   └── layout/ProtectedRoute.tsx
├── stores/authStore.ts
└── services/api.ts
```

## Dependencies (akan diinstall di TASK-16):
- shadcn/ui (komponen UI)
- TanStack Router (routing)
- TanStack Table (data grid)
- Recharts (grafik statistik)
- react-leaflet (peta live tracking)
- Axios + Zustand
- socket.io-client
