import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Toaster } from '../components/ui/toaster';
import { NotFoundPage } from '../components/NotFoundPage';
import { SosGlobalListener } from '../components/SosGlobalListener';

export const Route = createRootRoute({
  component: () => (
    <>
      <SosGlobalListener />
      <Outlet />
      <Toaster />
    </>
  ),
  notFoundComponent: NotFoundPage,
});
