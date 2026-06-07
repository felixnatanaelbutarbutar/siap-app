import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { api } from '../../services/api';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ShieldCheck, Sparkles, Wrench, AlertTriangle, Activity, Radio } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

const createIcon = (color: string) => new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background-color:${color};width:12px;height:12px;border-radius:50%;border:2px solid var(--text-base);box-shadow:0 2px 8px rgba(0,0,0,0.6);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const ICONS = {
  SATPAM: createIcon('var(--accent)'),
  CS: createIcon('var(--info)'),
  UTILITY: createIcon('var(--warning)'),
  INACTIVE: createIcon('var(--border-bright)'),
};

// Dark card container
const DarkCard = ({ children, className = '', style = {} }: any) => (
  <div
    className={`rounded-xl overflow-hidden ${className}`}
    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', ...style }}
  >
    {children}
  </div>
);

function DashboardPage() {
  const [liveLocations, setLiveLocations] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => { const { data } = await api.get('/admin/dashboard/summary'); return data.data; },
    refetchInterval: 60000,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: async () => { const { data } = await api.get('/admin/dashboard/chart'); return data.data; },
  });

  const { data: recentActivities } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: async () => { const { data } = await api.get('/admin/dashboard/activities'); return data.data || []; },
    refetchInterval: 30000,
  });

  useEffect(() => { if (recentActivities) setActivities(recentActivities); }, [recentActivities]);

  useEffect(() => {
    const s = io('http://localhost:3000');
    s.on('update_location', (data: any) => {
      setLiveLocations(prev => {
        const idx = prev.findIndex(l => l.id === data.id);
        if (idx >= 0) { const a = [...prev]; a[idx] = { ...a[idx], ...data, lastUpdate: Date.now() }; return a; }
        return [...prev, { ...data, lastUpdate: Date.now() }];
      });
    });
    s.on('new_activity', (data: any) => setActivities(prev => [data, ...prev].slice(0, 10)));
    return () => { s.disconnect(); };
  }, []);

  const StatCard = ({ title, icon: Icon, color, hadir, tidakHadir, istirahat }: any) => (
    <DarkCard className="p-5 hover:scale-[1.01] transition-transform cursor-default">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', letterSpacing: '1.2px' }}>{title}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { val: hadir ?? 0, label: 'Hadir', c: 'var(--accent)' },
          { val: tidakHadir ?? 0, label: 'Absen', c: 'var(--error)' },
          { val: istirahat ?? 0, label: 'Istirahat', c: 'var(--warning)' },
        ].map(({ val, label, c }) => (
          <div key={label} className="text-center py-3 rounded-lg" style={{ background: 'var(--bg-input)' }}>
            <p className="text-xl font-bold" style={{ color: c }}>{val}</p>
            <p className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: 'var(--text-dim)', letterSpacing: '0.8px' }}>{label}</p>
          </div>
        ))}
      </div>
    </DarkCard>
  );

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase"
          style={{ background: 'rgba(30,215,96,0.1)', border: '1px solid rgba(30,215,96,0.2)', color: 'var(--accent)', letterSpacing: '1.2px' }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
          Live
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <DarkCard key={i} className="p-5 animate-pulse">
              <div className="h-4 rounded w-1/2 mb-5" style={{ background: 'var(--bg-input)' }} />
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map(j => <div key={j} className="h-14 rounded-lg" style={{ background: 'var(--bg-input)' }} />)}
              </div>
            </DarkCard>
          ))
        ) : (
          <>
            <StatCard title="Keamanan" icon={ShieldCheck} color="var(--accent)" {...summary?.keamanan} />
            <StatCard title="Cleaning Service" icon={Sparkles} color="var(--info)" {...summary?.cs} />
            <StatCard title="Utility" icon={Wrench} color="var(--warning)" {...summary?.utility} />
            <DarkCard className="p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(243,114,127,0.15)', border: '1px solid rgba(243,114,127,0.3)' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--error)' }} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', letterSpacing: '1.2px' }}>Perlu Tindakan</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: summary?.pending?.laporan ?? 0, label: 'Laporan', c: 'var(--warning)' },
                  { val: summary?.pending?.barangRusak ?? 0, label: 'Barang Rusak', c: 'var(--error)' },
                ].map(({ val, label, c }) => (
                  <div key={label} className="text-center py-3 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                    <p className="text-xl font-bold" style={{ color: c }}>{val}</p>
                    <p className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: 'var(--text-dim)', letterSpacing: '0.8px' }}>{label}</p>
                  </div>
                ))}
              </div>
            </DarkCard>
          </>
        )}
      </div>

      {/* Map & Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <DarkCard className="xl:col-span-2">
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 8px rgba(30,215,96,0.6)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-base)' }}>Live Tracking</span>
            <span className="ml-auto text-xs" style={{ color: 'var(--text-dim)' }}>{liveLocations.length} aktif</span>
          </div>
          <div className="h-[360px] relative z-0">
            {typeof window !== 'undefined' && (
              <MapContainer center={[-6.200000, 106.816666]} zoom={16} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <Circle center={[-6.200000, 106.816666]} radius={200} pathOptions={{ color: 'var(--accent)', fillColor: 'var(--accent)', fillOpacity: 0.06, weight: 1 }} />
                {liveLocations.map(loc => {
                  const isInactive = Date.now() - loc.lastUpdate > 300000;
                  const icon = isInactive ? ICONS.INACTIVE : ((ICONS as any)[loc.role] || ICONS.INACTIVE);
                  return (
                    <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={icon}>
                      <Popup><p className="font-bold" style={{ color: 'var(--text-base)' }}>{loc.nama}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{loc.role}</p></Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            )}
            {liveLocations.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-[400]" style={{ background: 'rgba(18,18,18,0.5)' }}>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-bright)' }}>
                  <Radio className="w-4 h-4" />
                  Belum ada staff aktif
                </div>
              </div>
            )}
          </div>
        </DarkCard>

        <DarkCard className="flex flex-col" style={{ height: '440px' }}>
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <Activity className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-base)' }}>Aktivitas Terbaru</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Activity className="w-8 h-8 mb-2" style={{ color: '#2a2a2a' }} />
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Belum ada aktivitas</p>
              </div>
            ) : (
              activities.map((act: any, i: number) => (
                <div key={act.id || i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors"
                  style={{ cursor: 'default' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-input)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                    style={{ background: 'var(--bg-input)', color: 'var(--accent)', border: '1px solid #2a2a2a' }}>
                    {act.nama?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-base)' }}>{act.nama}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{act.aksi}</p>
                  </div>
                  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-dim)' }}>{format(new Date(act.waktu), 'HH:mm')}</span>
                </div>
              ))
            )}
          </div>
        </DarkCard>
      </div>

      {/* Chart */}
      <DarkCard className="p-6">
        <h3 className="text-sm font-bold mb-6" style={{ color: 'var(--text-base)' }}>Statistik Kehadiran 7 Hari Terakhir</h3>
        {chartLoading ? (
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-sm animate-pulse" style={{ color: 'var(--text-dim)' }}>Memuat data...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} stroke="none" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} stroke="none" axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ background: 'var(--bg-input)', border: '1px solid var(--border-bright)', borderRadius: 8, boxShadow: 'var(--shadow-base) 0px 8px 24px', color: 'var(--text-base)' }}
              />
              <Bar dataKey="Keamanan" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="CS" fill="var(--info)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Utility" fill="var(--warning)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </DarkCard>
    </div>
  );
}
