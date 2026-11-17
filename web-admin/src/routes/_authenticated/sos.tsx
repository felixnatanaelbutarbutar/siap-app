import React, { useEffect, useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  ShieldAlert,
  BellRing,
  BellOff,
  MapPin,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  getSavedSosChannelToken,
  registerAdminSosBrowser,
  unregisterAdminSosBrowser,
} from '../../services/sosPush';
import type { SosAlertItem } from '../../services/sosPush';
import { useNotificationStore } from '../../store/notificationStore';
import { toast } from '../../hooks/use-toast';

export const Route = createFileRoute('/_authenticated/sos')({
  component: SosAdminPage,
});

function SosAdminPage() {
  const [alerts, setAlerts] = useState<SosAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'SEMUA' | 'AKTIF' | 'DITANGANI'>('SEMUA');
  const [subscribedBrowsers, setSubscribedBrowsers] = useState(0);
  const [browserRegistered, setBrowserRegistered] = useState(() => Boolean(getSavedSosChannelToken()));
  const [pushLoading, setPushLoading] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const setActiveSosCount = useNotificationStore((s) => s.setActiveSosCount);

  const fetchSos = useCallback(async () => {
    try {
      setLoading(true);
      const q = filter === 'SEMUA' ? '' : `?status=${filter}`;
      const res = await api.get(`/sos${q}`);
      const list: SosAlertItem[] = res.data?.data || [];
      setAlerts(list);
      setActiveSosCount(res.data?.meta?.active_count ?? list.filter((a) => a.status === 'AKTIF').length);
      setSubscribedBrowsers(res.data?.meta?.subscribed_browsers ?? 0);
    } catch {
      toast({ title: 'Gagal memuat data SOS', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filter, setActiveSosCount]);

  useEffect(() => {
    fetchSos();
  }, [fetchSos]);

  const handleToggleBrowserPush = async () => {
    setPushLoading(true);
    try {
      if (browserRegistered) {
        await unregisterAdminSosBrowser();
        setBrowserRegistered(false);
        toast({ title: 'Notifikasi SOS Browser dinonaktifkan.' });
      } else {
        const res = await registerAdminSosBrowser();
        setBrowserRegistered(true);
        toast({ title: 'Notifikasi SOS Browser Aktif', description: res.message });
      }
      fetchSos();
    } catch (err: any) {
      toast({
        title: 'Gagal mengatur notifikasi browser',
        description: err?.response?.data?.message || err?.message,
        variant: 'destructive',
      });
    } finally {
      setPushLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await api.patch(`/sos/${id}/resolve`, {
        catatan_admin: notes[id] || 'Darurat telah ditangani dan situasi terkendali.',
      });
      toast({ title: 'SOS ditandai selesai ditangani.' });
      await fetchSos();
    } catch (err: any) {
      toast({
        title: 'Gagal menandai SOS',
        description: err?.response?.data?.message || 'Coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setResolvingId(null);
    }
  };

  const activeList = alerts.filter((a) => a.status === 'AKTIF');
  const historyList = alerts.filter((a) => a.status !== 'AKTIF');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#f87171' }}>
            SIAP | PUSAT TANGGAP DARURAT
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-base)' }}>
            SOS Darurat Lapangan
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Pantau sinyal darurat dari petugas lapangan secara real-time dan kelola notifikasi browser admin meski sedang tidak login.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSos}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold self-start md:self-auto"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-base)' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Segarkan
        </button>
      </div>

      {/* Kartu Aktivasi Notifikasi Browser (Bekerja Meski Tidak Login / Tab Ditutup) */}
      <div
        className="rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        style={{
          background: browserRegistered ? 'rgba(30,215,96,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${browserRegistered ? 'rgba(30,215,96,0.35)' : 'rgba(239,68,68,0.35)'}`,
        }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: browserRegistered ? 'rgba(30,215,96,0.18)' : 'rgba(239,68,68,0.18)',
              color: browserRegistered ? '#22c55e' : '#f87171',
            }}
          >
            {browserRegistered ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--text-base)' }}>
              Notifikasi Browser Darurat (Tetap Aktif Walau Tidak Login)
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {browserRegistered
                ? `Browser ini terdaftar via Service Worker Web Push & saluran SOS permanen (${subscribedBrowsers} perangkat browser aktif). Notifikasi darurat + sirine tetap muncul walau Admin sudah logout atau menutup tab.`
                : 'Aktifkan sekali di browser ini agar Administrator tetap menerima pop-up notifikasi OS saat petugas menekan tombol SOS, meskipun sedang tidak login atau berada di aplikasi lain.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={pushLoading}
          onClick={handleToggleBrowserPush}
          className="px-5 py-2.5 rounded-xl font-bold text-sm flex-shrink-0 transition"
          style={{
            background: browserRegistered ? 'var(--bg-surface)' : '#dc2626',
            color: browserRegistered ? 'var(--text-base)' : '#ffffff',
            border: browserRegistered ? '1px solid var(--border)' : 'none',
          }}
        >
          {pushLoading
            ? 'Memproses...'
            : browserRegistered
            ? 'Nonaktifkan di Browser Ini'
            : 'Aktifkan Notifikasi SOS Browser'}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['SEMUA', 'AKTIF', 'DITANGANI'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className="px-4 py-2 rounded-full text-xs font-bold tracking-wide transition"
            style={{
              background: filter === tab ? (tab === 'AKTIF' ? '#dc2626' : 'var(--accent)') : 'var(--bg-surface)',
              color: filter === tab ? '#ffffff' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {tab === 'SEMUA'
              ? `SEMUA (${alerts.length})`
              : tab === 'AKTIF'
              ? `DARURAT AKTIF (${activeList.length})`
              : `SUDAH DITANGANI (${historyList.length})`}
          </button>
        ))}
      </div>

      {/* Active SOS Cards */}
      {activeList.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 text-red-400">
            <ShieldAlert className="w-4 h-4" />
            Panggilan SOS Aktif Membutuhkan Tindakan Segera ({activeList.length})
          </h2>

          {activeList.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'linear-gradient(135deg, rgba(127,29,29,0.45) 0%, rgba(153,27,27,0.22) 100%)',
                border: '1.5px solid rgba(248,113,113,0.55)',
              }}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-600 text-white uppercase">
                      AKTIF | {item.kategori}
                    </span>
                    <span className="text-xs font-semibold text-red-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(item.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white">
                    {item.staff.nama} <span className="text-sm font-normal text-red-200">(NIK {item.staff.nik})</span>
                  </h3>
                  <p className="text-xs text-red-100">
                    Divisi: <strong>{item.staff.divisi.replace(/_/g, ' ')}</strong>
                    {item.area_nama ? ` | Area Tugas: ${item.area_nama}` : ''}
                  </p>
                </div>

                {item.lat != null && item.lng != null && (
                  <a
                    href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-red-800 hover:bg-red-50 transition self-start"
                  >
                    <MapPin className="w-4 h-4" />
                    Buka Lokasi GPS ({item.lat.toFixed(5)}, {item.lng.toFixed(5)})
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div
                className="rounded-xl p-3.5 flex items-start gap-2.5"
                style={{ background: 'rgba(0,0,0,0.32)' }}
              >
                <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-200 mb-0.5">
                    Keterangan Darurat dari Petugas
                  </p>
                  <p className="text-sm text-white font-medium leading-relaxed">{item.keterangan}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={notes[item.id] || ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  placeholder="Tulis tindakan penanganan (contoh: Tim bantuan sudah tiba di Gerbang Selatan)..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff',
                  }}
                />
                <button
                  type="button"
                  disabled={resolvingId === item.id}
                  onClick={() => handleResolve(item.id)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {resolvingId === item.id ? 'Menyimpan...' : 'Tandai Ditangani'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-sm" style={{ color: 'var(--text-base)' }}>
            Riwayat Panggilan SOS
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Memuat data SOS...
          </div>
        ) : historyList.length === 0 && activeList.length === 0 ? (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Belum ada panggilan SOS darurat yang tercatat.
          </div>
        ) : historyList.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Belum ada riwayat SOS yang selesai ditangani.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase">Waktu</th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase">Pelapor</th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase">Kategori</th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase">Keterangan Darurat</th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase">Penanganan Admin</th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold" style={{ color: 'var(--text-base)' }}>{item.staff.nama}</p>
                      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                        {item.staff.nik} | {item.staff.divisi.replace(/_/g, ' ')}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400">
                        {item.kategori}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs" style={{ color: 'var(--text-base)' }}>
                      {item.keterangan}
                    </td>
                    <td className="px-5 py-3.5 max-w-xs text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.catatan_admin || '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400">
                        DITANGANI
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
