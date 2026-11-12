import { Link } from '@tanstack/react-router';
import { BrandLogo } from './BrandLogo';

export function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-base)', color: 'var(--text-base)' }}
    >
      <div
        className="max-w-md w-full p-8 rounded-xl text-center space-y-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex justify-center pb-1">
          <BrandLogo variant="emblem" tone="accent" className="w-14 h-14" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          404
        </p>
        <h1 className="text-2xl font-bold">Halaman Tidak Ditemukan</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Rute yang Anda tuju tidak tersedia di panel admin SIAP.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-2.5 rounded-full text-sm font-bold uppercase"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
