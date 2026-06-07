import React from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  MapPin,
  FileText,
  ClipboardCheck,
  CalendarClock,
  Users,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const pendingReports = useNotificationStore((s) => s.pendingReports);

  const handleLogout = () => {
    logout();
    router.navigate({ to: '/login' });
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Absensi', icon: MapPin, to: '/absensi' },
    { label: 'Laporan', icon: FileText, to: '/laporan', badge: pendingReports },
    { label: 'Serah Terima', icon: ClipboardCheck, to: '/serah-terima' },
    { label: 'Izin / Cuti', icon: CalendarClock, to: '/izin-cuti' },
    { label: 'Staff', icon: Users, to: '/staff' },
    { label: 'Pengaturan', icon: Settings, to: '/pengaturan' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SIAP Admin</h1>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">Menu</p>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-150"
              activeProps={{
                className: "bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white shadow-lg shadow-indigo-600/20",
              }}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </div>
              {item.badge && item.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-300 font-bold text-sm">
              {user?.nama?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.nama || 'Admin'}</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-64 flex flex-col min-w-0">
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
