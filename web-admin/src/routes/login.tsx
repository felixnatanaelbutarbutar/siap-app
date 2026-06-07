import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Zap, Loader2, AlertCircle } from 'lucide-react';

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
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, var(--bg-base) 50%, #0d1a0d 100%)' }}
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
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Zap className="w-6 h-6" style={{ color: 'var(--accent-text)' }} />
            </div>
            <span className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>SIAP</span>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-4" style={{ color: 'var(--text-base)' }}>
            Sistem Informasi<br />
            <span style={{ color: 'var(--accent)' }}>Absensi</span> &<br />Pelaporan
          </h1>
          <p className="text-base mb-12" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Platform manajemen kehadiran, pelaporan, dan operasional gedung yang terintegrasi secara real-time.
          </p>

          <div className="flex gap-10">
            {[
              { num: '100+', label: 'Staff Aktif' },
              { num: '24/7', label: 'Live Tracking' },
              { num: 'Real-time', label: 'Monitoring' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{stat.num}</p>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{stat.label}</p>
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
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Zap className="w-5 h-5" style={{ color: 'var(--accent-text)' }} />
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--text-base)' }}>SIAP Admin</span>
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
