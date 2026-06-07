import { create } from 'zustand';

interface NotificationState {
  pendingReports: number;
  setPendingReports: (count: number) => void;
  decrementPending: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  pendingReports: 0, // Mock initial state, later updated by fetch
  setPendingReports: (count) => set({ pendingReports: count }),
  decrementPending: () => set((state) => ({ pendingReports: Math.max(0, state.pendingReports - 1) })),
}));
