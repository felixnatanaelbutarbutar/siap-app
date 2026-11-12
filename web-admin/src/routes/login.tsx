import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Loader2, AlertCircle } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { nik, password });

      if (data.success && data.data?.token) {
        const { token, user } = data.data;

        if (user.role !== 'ADMIN') {
          setError('Akses ditolak. Halaman ini hanya untuk Administrator.');
          setLoading(false);
          return;
        }

        setAuth(token, {
          id: String(user.id),
          nama: user.nama,
          role: user.role,
        });

        router.navigate({ to: '/dashboard' });
      } else {
        setError('Login gagal. Periksa kembali kredensial Anda.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Terjadi kesalahan. Coba lagi.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-center px-16"
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #121212 52%, #0d1f12 100%)', color: '#ffffff' }}
      >
        {/* Decorative circles */}
        <div className="absolute" style={{
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30,215,96,0.08) 0%, transparent 70%)',
          top: -100, left: -100,
        }} />
        <div className="absolute" style={{
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30,215,96,0.05) 0%, transparent 70%)',
          bottom: -80, right: -80,
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-12">
            <BrandLogo variant="wordmark" tone="white" className="h-11 w-auto" />
            <span
              className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{
                background: 'rgba(30,215,96,0.14)',
                color: '#1ed760',
                border: '1px solid rgba(30,215,96,0.3)',
              }}
            >
              Command Center
            </span>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-4" style={{ color: '#ffffff' }}>
            Sistem Informasi<br />
            <span style={{ color: '#1ed760' }}>Absensi</span> &<br />Pelaporan
          </h1>
          <p className="text-base mb-12" style={{ color: '#b3b3b3', lineHeight: '1.6' }}>
            Platform manajemen kehadiran, pelaporan, dan operasional gedung yang terintegrasi secara real-time.
          </p>

          <div className="flex gap-10">
            {[
              { num: '100+', label: 'Staff Aktif' },
              { num: '24/7', label: 'Live Tracking' },
              { num: 'Real-time', label: 'Monitoring' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold" style={{ color: '#1ed760' }}>{stat.num}</p>
                <p className="text-sm" style={{ color: '#8a8a8a' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'var(--bg-surface)' }}>
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <BrandLogo variant="wordmark" tone="auto" className="h-9 w-auto" />
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(30,215,96,0.14)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)30',
              }}
            >
              Admin
            </span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-base)' }}>Selamat Datang</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Masuk ke dashboard administrator</p>

          {error && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-lg mb-6 text-sm"
              style={{ background: 'rgba(243,114,127,0.1)', border: '1px solid rgba(243,114,127,0.3)', color: 'var(--error)' }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)', letterSpacing: '1.4px' }}>
                NIK (Nomor Induk)
              </label>
              <input
                type="text"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                className="w-full px-4 py-3.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  background: 'var(--bg-input)',
                  color: 'var(--text-base)',
                  border: '1px solid var(--border-bright)',
                  boxShadow: 'rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset',
                }}
                placeholder="Masukkan NIK Anda"
                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'rgb(18,18,18) 0px 1px 0px, var(--accent) 0px 0px 0px 1px inset'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-bright)'; e.target.style.boxShadow = 'rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset'; }}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)', letterSpacing: '1.4px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  background: 'var(--bg-input)',
                  color: 'var(--text-base)',
                  border: '1px solid var(--border-bright)',
                  boxShadow: 'rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset',
                }}
                placeholder="••••••••"
                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = 'rgb(18,18,18) 0px 1px 0px, var(--accent) 0px 0px 0px 1px inset'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-bright)'; e.target.style.boxShadow = 'rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset'; }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold py-3.5 rounded-full transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              style={{
                background: loading ? '#158c38' : 'var(--accent)',
                color: 'var(--accent-text)',
                letterSpacing: '1.4px',
                fontSize: '14px',
                boxShadow: 'var(--shadow-base) 0px 8px 8px',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : 'Masuk'}
            </button>
          </form>

          <div className="mt-10 pt-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              © 2026 SIAP — Botap Teknologi Cerdas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
