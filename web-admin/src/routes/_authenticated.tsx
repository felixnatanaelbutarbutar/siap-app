import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore';
import { AdminLayout } from '../components/layout/AdminLayout';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw redirect({
        to: '/login',
      });
    }
  },
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});
