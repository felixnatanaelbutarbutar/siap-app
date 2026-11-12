import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Toaster } from '../components/ui/toaster';
import { NotFoundPage } from '../components/NotFoundPage';

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
  notFoundComponent: NotFoundPage,
});
