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
  CalendarDays,
  Moon,
  Sun,
  Megaphone,
  Menu,
  X,
} from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { BrandLogo } from '../BrandLogo';

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--bg-base)' }}>
      {/* Mobile Header */}
      <header
        className="md:hidden h-14 px-4 flex items-center justify-between sticky top-0 z-20"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <BrandLogo variant="wordmark" className="h-6 w-auto" />
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(30,215,96,0.14)', color: 'var(--accent)', border: '1px solid var(--accent)30' }}
          >
            Admin
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Buka menu navigasi"
          className="p-2 rounded-lg"
          style={{ color: 'var(--text-base)' }}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`w-60 flex flex-col fixed inset-y-0 left-0 z-30 transform transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between gap-2 px-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <Link to="/dashboard" className="flex items-center focus:outline-none">
            <BrandLogo variant="wordmark" className="h-7 w-auto" />
          </Link>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(30,215,96,0.15)', color: 'var(--accent)', border: '1px solid var(--accent)30' }}
          >
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-3"
            style={{ color: 'var(--text-dim)', letterSpacing: '1.5px' }}>
            Menu Utama
          </p>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className="siap-nav-link"
            >
              <div className="flex items-center gap-3">
                <item.icon className="siap-nav-icon" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
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
            className="siap-sidebar-action mb-1"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? 'Mode Terang' : 'Mode Gelap'}
          </button>
          <button
            onClick={() => setConfirmLogout(true)}
            className="siap-sidebar-action siap-sidebar-action-danger"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-60 flex flex-col min-w-0">
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
