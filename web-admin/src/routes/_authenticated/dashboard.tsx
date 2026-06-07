import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { api } from '../../services/api';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Users, ShieldCheck, Sparkles, Wrench, AlertTriangle, FileWarning, Activity } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

const createIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

const ICONS = {
  SATPAM: createIcon('#6366f1'),
  CS: createIcon('#22c55e'),
  UTILITY: createIcon('#f97316'),
  INACTIVE: createIcon('#9ca3af'),
};

function DashboardPage() {
  const [liveLocations, setLiveLocations] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/summary');
      return data.data;
    },
    refetchInterval: 60000,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/chart');
      return data.data;
    },
  });

  const { data: recentActivities } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/activities');
      return data.data || [];
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (recentActivities) setActivities(recentActivities);
  }, [recentActivities]);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');

    newSocket.on('update_location', (data: any) => {
      setLiveLocations(prev => {
        const index = prev.findIndex(loc => loc.id === data.id);
        if (index >= 0) {
          const newArr = [...prev];
          newArr[index] = { ...newArr[index], ...data, lastUpdate: Date.now() };
          return newArr;
        }
        return [...prev, { ...data, lastUpdate: Date.now() }];
      });
    });

    newSocket.on('new_activity', (data: any) => {
      setActivities(prev => [data, ...prev].slice(0, 10));
    });

    return () => { newSocket.disconnect(); };
  }, []);

  const StatCard = ({ title, icon: Icon, iconBg, hadir, tidakHadir, istirahat }: any) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center bg-emerald-50 rounded-xl py-3">
          <p className="text-2xl font-bold text-emerald-600">{hadir ?? 0}</p>
          <p className="text-[11px] font-medium text-emerald-600/70">Hadir</p>
        </div>
        <div className="text-center bg-red-50 rounded-xl py-3">
          <p className="text-2xl font-bold text-red-500">{tidakHadir ?? 0}</p>
          <p className="text-[11px] font-medium text-red-500/70">Absen</p>
        </div>
        <div className="text-center bg-blue-50 rounded-xl py-3">
          <p className="text-2xl font-bold text-blue-500">{istirahat ?? 0}</p>
          <p className="text-[11px] font-medium text-blue-500/70">Istirahat</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 text-sm mt-1">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
              <div className="h-5 bg-slate-100 rounded w-1/2 mb-5" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="h-16 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard title="Keamanan" icon={ShieldCheck} iconBg="bg-indigo-500" {...summary?.keamanan} />
            <StatCard title="Customer Service" icon={Sparkles} iconBg="bg-emerald-500" {...summary?.cs} />
            <StatCard title="Utility" icon={Wrench} iconBg="bg-orange-500" {...summary?.utility} />

            {/* Action Required */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-semibold">Action Required</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center bg-white/10 rounded-xl py-3">
                  <p className="text-2xl font-bold text-amber-400">{summary?.pending?.laporan ?? 0}</p>
                  <p className="text-[11px] font-medium text-white/60">Laporan Pending</p>
                </div>
                <div className="text-center bg-white/10 rounded-xl py-3">
                  <p className="text-2xl font-bold text-red-400">{summary?.pending?.barangRusak ?? 0}</p>
                  <p className="text-[11px] font-medium text-white/60">Barang Rusak</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Map & Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h3 className="font-semibold text-slate-900 text-sm">Live Tracking</h3>
          </div>
          <div className="h-[380px] relative z-0">
            {typeof window !== 'undefined' && (
              <MapContainer center={[-6.200000, 106.816666]} zoom={16} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Circle center={[-6.200000, 106.816666]} radius={200} pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.08, weight: 2 }} />
                {liveLocations.map(loc => {
                  const isInactive = Date.now() - loc.lastUpdate > 300000;
                  const icon = isInactive ? ICONS.INACTIVE : ((ICONS as any)[loc.role] || ICONS.INACTIVE);
                  return (
                    <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={icon}>
                      <Popup><p className="font-semibold">{loc.nama}</p><p className="text-xs text-slate-600">{loc.role}</p></Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            )}
            {liveLocations.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-[400] bg-black/30 backdrop-blur-sm">
                <p className="text-white font-medium text-sm bg-slate-900/80 px-4 py-2 rounded-lg">Belum ada staff aktif</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 flex flex-col h-[440px]">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-slate-900 text-sm">Aktivitas Terbaru</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-slate-300 text-3xl mb-2">—</p>
                <p className="text-xs text-slate-600">Belum ada aktivitas</p>
              </div>
            ) : (
              activities.map((act: any, i: number) => (
                <div key={act.id || i} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
                  <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-indigo-600">{act.nama?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{act.nama}</p>
                    <p className="text-xs text-slate-600 truncate">{act.aksi}</p>
                  </div>
                  <span className="text-[11px] text-slate-600 flex-shrink-0">{format(new Date(act.waktu), 'HH:mm')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-6">Statistik Kehadiran 7 Hari Terakhir</h3>
        {chartLoading ? (
          <div className="h-[250px] flex items-center justify-center">
            <div className="animate-pulse text-slate-300 font-medium">Memuat data...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
              <Bar dataKey="Keamanan" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="CS" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Utility" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
