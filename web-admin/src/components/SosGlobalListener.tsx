import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { AlertTriangle, BellRing, MapPin, ShieldAlert, X, ExternalLink, Volume2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { API_BASE_URL, SOCKET_URL } from '../services/api';
import {
  getSavedSosChannelToken,
  playSosSiren,
  registerAdminSosBrowser,
  showBrowserSosNotification,
} from '../services/sosPush';
import type { SosAlertItem } from '../services/sosPush';

const PROMPT_DISMISSED_KEY = 'siap-sos-prompt-dismissed-at';

export const SosGlobalListener: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setActiveSosCount = useNotificationStore((s) => s.setActiveSosCount);

  const [activeAlerts, setActiveAlerts] = useState<SosAlertItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [activatingPush, setActivatingPush] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Saat admin login: jika izin notifikasi sudah granted -> otomatis daftar/refresh Web Push;
  // jika belum granted & belum terdaftar -> tampilkan prompt "Izinkan Notifikasi dari Web Ini" (Desktop & Mobile Browser)
  useEffect(() => {
    if (!token || user?.role !== 'ADMIN' || typeof window === 'undefined') {
      setShowPermissionPrompt(false);
      return;
    }

    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const hasChannel = Boolean(getSavedSosChannelToken());

    if (perm === 'granted') {
      registerAdminSosBrowser().catch(() => {});
      setShowPermissionPrompt(false);
      return;
    }

    if (perm === 'default' && !hasChannel) {
      const dismissedAt = Number(sessionStorage.getItem(PROMPT_DISMISSED_KEY) || 0);
      if (!dismissedAt) {
        setShowPermissionPrompt(true);
      }
    }
  }, [token, user?.role]);

  const handleAllowBrowserNotifications = async () => {
    setActivatingPush(true);
    try {
      await registerAdminSosBrowser();
      setShowPermissionPrompt(false);
    } catch {
      setShowPermissionPrompt(false);
    } finally {
      setActivatingPush(false);
    }
  };

  const handleDismissPrompt = () => {
    sessionStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()));
    setShowPermissionPrompt(false);
  };

  // Ambil daftar SOS aktif awal (baik saat login sebagai Admin MAUPUN saat tidak login via channel_token)
  useEffect(() => {
    const channelToken = getSavedSosChannelToken();
    const isAdminLoggedIn = Boolean(token && user?.role === 'ADMIN');

    if (!isAdminLoggedIn && !channelToken) return;

    const loadActive = async () => {
      try {
        const res = isAdminLoggedIn
          ? await fetch(`${API_BASE_URL}/sos?status=AKTIF`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : await fetch(`${API_BASE_URL}/sos/active-for-channel`, {
              headers: { 'x-sos-channel': channelToken! },
            });

        if (!res.ok) return;
        const json = await res.json();
        const rows: SosAlertItem[] = Array.isArray(json.data) ? json.data : [];
        setActiveAlerts(rows);
        setActiveSosCount(rows.length);
      } catch {}
    };

    loadActive();
  }, [token, user?.role, setActiveSosCount]);

  // Koneksi Socket.io global (tetap terhubung walau admin logout selama browser punya channel_token!)
  useEffect(() => {
    const channelToken = getSavedSosChannelToken();
    const isAdminLoggedIn = Boolean(token && user?.role === 'ADMIN');

    if (!isAdminLoggedIn && !channelToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const authPayload = isAdminLoggedIn
      ? { token }
      : { sosChannelToken: channelToken };

    const socket = io(SOCKET_URL, {
      auth: authPayload,
      reconnection: true,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('sos:alert', (alert: SosAlertItem) => {
      setActiveAlerts((prev) => {
        const filtered = prev.filter((a) => a.id !== alert.id);
        const next = [alert, ...filtered];
        setActiveSosCount(next.length);
        return next;
      });
      setDismissedIds((prev) => prev.filter((id) => id !== alert.id));

      if (!notifiedIdsRef.current.has(alert.id)) {
        notifiedIdsRef.current.add(alert.id);
        playSosSiren();
        void showBrowserSosNotification(alert);
      }
    });

    socket.on('sos:resolved', (resolved: SosAlertItem) => {
      setActiveAlerts((prev) => {
        const next = prev.filter((a) => a.id !== resolved.id);
        setActiveSosCount(next.length);
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?.role, setActiveSosCount]);

  const visibleAlerts = activeAlerts.filter((a) => !dismissedIds.includes(a.id));
  const latest = visibleAlerts[0] || null;

  if (!latest && !showPermissionPrompt) return null;

  return (
    <>
      {showPermissionPrompt && (
        <div
          className="fixed bottom-4 right-4 z-[9998] max-w-sm w-[calc(100vw-2rem)] rounded-2xl shadow-2xl p-4"
          style={{
            background: '#0f1c14',
            border: '1px solid rgba(34,197,94,0.4)',
            color: '#ffffff',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(220,38,38,0.2)', color: '#f87171' }}
            >
              <BellRing className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold leading-snug">
                Izinkan Notifikasi SOS di Perangkat Ini
              </p>
              <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
                Aktifkan notifikasi browser (Desktop atau HP) agar perangkat Anda tetap menerima peringatan darurat SOS meski tab ditutup atau sedang tidak login.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  disabled={activatingPush}
                  onClick={handleAllowBrowserNotifications}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black transition"
                >
                  {activatingPush ? 'Mengaktifkan...' : 'Izinkan Notifikasi'}
                </button>
                <button
                  type="button"
                  onClick={handleDismissPrompt}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-200/80 hover:text-white transition"
                >
                  Nanti Saja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {latest && (
    <div
      className="fixed top-4 right-4 z-[9999] max-w-md w-[calc(100vw-2rem)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-3"
      style={{
        background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
        border: '2px solid #f87171',
        color: '#ffffff',
      }}
      role="alert"
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.28)' }}>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-white animate-ping" />
          <ShieldAlert className="w-5 h-5 text-white" />
          <span className="text-xs font-extrabold tracking-widest uppercase">
            SOS DARURAT AKTIF ({visibleAlerts.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => playSosSiren()}
            title="Putar suara sirine"
            className="p-1.5 rounded-lg hover:bg-white/15 transition"
          >
            <Volume2 className="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            onClick={() => setDismissedIds((prev) => [...prev, latest.id])}
            title="Sembunyikan sementara"
            className="p-1.5 rounded-lg hover:bg-white/15 transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-extrabold text-base leading-tight">{latest.staff?.nama}</p>
            <p className="text-xs text-red-100">
              NIK {latest.staff?.nik} | {(latest.staff?.divisi || '').replace(/_/g, ' ')}
              {latest.area_nama ? ` | ${latest.area_nama}` : ''}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-white text-red-800 uppercase">
            {latest.kategori}
          </span>
        </div>

        <div className="rounded-xl p-3 text-sm leading-relaxed" style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
            <p className="font-medium text-white">{latest.keterangan}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {latest.lat != null && latest.lng != null ? (
            <a
              href={`https://www.google.com/maps?q=${latest.lat},${latest.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-100 hover:text-white underline"
            >
              <MapPin className="w-3.5 h-3.5" />
              Lihat Titik GPS
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-xs text-red-200">
              {new Date(latest.created_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              WIB
            </span>
          )}

          <a
            href={token ? '/sos' : '/login'}
            className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-white text-red-800 hover:bg-red-50 transition"
          >
            {token ? 'Buka & Tangani SOS' : 'Login & Tangani'}
          </a>
        </div>
      </div>
    </div>
      )}
    </>
  );
};
