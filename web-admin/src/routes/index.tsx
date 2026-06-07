import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const token = useAuthStore.getState().token;
    if (token) {
      throw redirect({ to: '/dashboard' });
    } else {
      throw redirect({ to: '/login' });
    }
  },
});
