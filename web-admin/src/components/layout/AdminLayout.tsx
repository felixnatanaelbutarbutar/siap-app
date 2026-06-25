import React, { useState, useEffect } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { useAuthStore } from '../../store/authStore';
import { ConfirmModal } from '../ConfirmModal';
import {
  LayoutDashboard,
  MapPin,
  FileText,
  ClipboardCheck,
  CalendarClock,
  Users,
  Settings,
  LogOut,
  Zap,
  CalendarDays,
  Moon,
  Sun,
  Megaphone,
} from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const pendingReports = useNotificationStore((s) => s.pendingReports);

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // default dark
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLogout = () => {
    logout();
    router.navigate({ to: '/login' });
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Absensi', icon: MapPin, to: '/absensi' },
    { label: 'Laporan', icon: FileText, to: '/laporan', badge: pendingReports },
    { label: 'Serah Terima', icon: ClipboardCheck, to: '/serah-terima' },
    { label: 'Izin & Cuti', icon: CalendarClock, to: '/izin-cuti' },
    { label: 'Staff', icon: Users, to: '/staff' },
    { label: 'Jadwal Kerja', icon: CalendarDays, to: '/jadwal' },
    { label: 'Kalender Shift', icon: CalendarClock, to: '/kalender' },
    { label: 'Pengumuman', icon: Megaphone, to: '/pengumuman' },
    { label: 'Pengaturan', icon: Settings, to: '/pengaturan' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* SIDEBAR */}
      <aside
        className="w-60 flex flex-col fixed inset-y-0 left-0 z-30"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <Zap className="w-4 h-4" style={{ color: 'var(--accent-text)' }} />
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text-base)' }}>SIAP</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full ml-auto"
            style={{ background: 'rgba(30,215,96,0.15)', color: 'var(--accent)', border: '1px solid var(--accent)30' }}>
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-3"
            style={{ color: 'var(--text-dim)', letterSpacing: '1.5px' }}>
            Menu Utama
          </p>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-base)] border-l-4 border-transparent"
              activeProps={{
                style: { 
                  background: 'var(--bg-hover)', 
                  color: 'var(--text-base)', 
                  borderLeftColor: 'var(--accent)'
                },
              }}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-[18px] h-[18px] transition-colors" />
                {item.label}
              </div>
              {item.badge && item.badge > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--error)', color: '#fff' }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-3 px-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--accent)20', color: 'var(--accent)', border: '1px solid var(--accent)30' }}
            >
              {user?.nama?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-base)' }}>{user?.nama || 'Admin'}</p>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Administrator</p>
            </div>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-base)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? 'Mode Terang' : 'Mode Gelap'}
          </button>
          <button
            onClick={() => setConfirmLogout(true)}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(243,114,127,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-60 flex flex-col min-w-0">
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>

      <ConfirmModal
        isOpen={confirmLogout}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari sesi Admin saat ini?"
        confirmText="Keluar"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
};
