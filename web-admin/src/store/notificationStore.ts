import { create } from 'zustand';

interface NotificationState {
  pendingReports: number;
  activeSosCount: number;
  setPendingReports: (count: number) => void;
  decrementPending: () => void;
  setActiveSosCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  pendingReports: 0,
  activeSosCount: 0,
  setPendingReports: (count) => set({ pendingReports: count }),
  decrementPending: () => set((state) => ({ pendingReports: Math.max(0, state.pendingReports - 1) })),
  setActiveSosCount: (count) => set({ activeSosCount: Math.max(0, count) }),
}));
