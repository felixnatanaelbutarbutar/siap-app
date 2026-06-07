import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Toaster } from '../components/ui/toaster';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const NotFoundError = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-10 max-w-lg w-full text-center">
        <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Error 404</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Halaman yang Anda cari tidak dapat ditemukan. Mungkin rute telah dipindahkan atau Anda tidak memiliki akses.
        </p>
        <a href="/" className="inline-flex items-center justify-center gap-2 w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20">
          <ArrowLeft className="w-5 h-5" />
          Kembali ke Dashboard
        </a>
      </div>
    </div>
  );
};

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
  notFoundComponent: NotFoundError,
});
