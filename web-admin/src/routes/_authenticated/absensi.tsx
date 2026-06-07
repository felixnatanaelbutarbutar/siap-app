import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { Calendar, Filter, Download, Eye, X, MapPin } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/absensi')({
  component: AbsensiPage,
});

function AbsensiPage() {
  const [activeTab, setActiveTab] = useState<'HARIAN' | 'BULANAN'>('HARIAN');
  const [dateHarian, setDateHarian] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [divisiHarian, setDivisiHarian] = useState('SEMUA');
  const [staffHarian, setStaffHarian] = useState('SEMUA');
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [divisiBulanan, setDivisiBulanan] = useState('SEMUA');
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const stored = localStorage.getItem('siap-admin-auth');
    const token = stored ? JSON.parse(stored)?.state?.token : null;
    const socket = io('http://localhost:3000', { auth: { token } });
    socket.on('absensi:new', () => {
      queryClient.invalidateQueries({ queryKey: ['absensi-harian'] });
    });
    return () => { socket.disconnect(); };
  }, [queryClient]);

  const { data: logs } = useQuery({
    queryKey: ['absensi-harian', dateHarian, divisiHarian, staffHarian],
    queryFn: async () => {
      const params: any = { tanggal: dateHarian };
      if (divisiHarian !== 'SEMUA') params.divisi = divisiHarian;
      const res = await api.get('/admin/absensi', { params });
      const rawData = res.data.data;
      const grouped: Record<string, any> = rawData.reduce((acc: any, curr: any) => {
        if (!acc[curr.staff_id]) {
          acc[curr.staff_id] = { id: curr.staff_id, nama: curr.staff.nama, divisi: curr.staff.divisi, masuk: '-', istirahat: '-', keluar: '-', total: '-', status: 'HADIR', lat: curr.lat, lng: curr.lng, foto_masuk: null, foto_keluar: null };
        }
        const time = format(new Date(curr.waktu_server), 'HH:mm');
        if (curr.jenis === 'MASUK') { acc[curr.staff_id].masuk = time; acc[curr.staff_id].foto_masuk = curr.foto_url; }
        if (curr.jenis === 'MULAI_ISTIRAHAT') acc[curr.staff_id].istirahat = time;
        if (curr.jenis === 'KELUAR') { acc[curr.staff_id].keluar = time; acc[curr.staff_id].foto_keluar = curr.foto_url; }
        if (acc[curr.staff_id].masuk !== '-' && acc[curr.staff_id].keluar !== '-') {
          const m = parseInt(acc[curr.staff_id].masuk.split(':')[0]);
          const k = parseInt(acc[curr.staff_id].keluar.split(':')[0]);
          acc[curr.staff_id].total = `${k - m} Jam`;
        }
        return acc;
      }, {});
      let finalData = Object.values(grouped);
      if (staffHarian !== 'SEMUA') finalData = finalData.filter((item: any) => item.nama === staffHarian);
      return finalData;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['absensi-bulanan', bulan, tahun, divisiBulanan],
    queryFn: async () => {
      const params: any = { bulan, tahun };
      if (divisiBulanan !== 'SEMUA') params.divisi = divisiBulanan;
      const res = await api.get('/admin/statistik/kehadiran', { params });
      const tableData = res.data.data || [];
      const chartData = Array.from({ length: 30 }).map((_, i) => ({
        tanggal: i + 1,
        SATPAM: Math.floor(Math.random() * 5) + 15,
        CS: Math.floor(Math.random() * 5) + 10,
        UTILITY: Math.floor(Math.random() * 5) + 8,
      }));
      return { tableData, chartData };
    }
  });

  const handleExportCSV = async () => {
    try {
      const params: any = { bulan, tahun };
      if (divisiBulanan !== 'SEMUA') params.divisi = divisiBulanan;
      const res = await api.get('/admin/export/absensi', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekap_absensi_${bulan}_${tahun}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Gagal export CSV');
    }
  };

  const DivisiBadge = ({ divisi }: { divisi: string }) => {
    const colors: Record<string, string> = {
      KEAMANAN: 'bg-indigo-50 text-indigo-700',
      SATPAM: 'bg-indigo-50 text-indigo-700',
      CUSTOMER_SERVICE: 'bg-emerald-50 text-emerald-700',
      CS: 'bg-emerald-50 text-emerald-700',
      UTILITY: 'bg-orange-50 text-orange-700',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[divisi] || 'bg-slate-100 text-slate-600'}`}>{divisi}</span>;
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      HADIR: 'bg-emerald-50 text-emerald-700',
      TERLAMBAT: 'bg-amber-50 text-amber-700',
      ALFA: 'bg-red-50 text-red-700',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Absensi</h1>
        <p className="text-slate-600 text-sm mt-1">Kelola data kehadiran staff</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['HARIAN', 'BULANAN'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`}>
            {tab === 'HARIAN' ? 'Log Harian' : 'Rekap Bulanan'}
          </button>
        ))}
      </div>

      {activeTab === 'HARIAN' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Tanggal</label>
              <input type="date" value={dateHarian} onChange={e => setDateHarian(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Divisi</label>
              <select value={divisiHarian} onChange={e => setDivisiHarian(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                <option value="SEMUA">Semua Divisi</option>
                <option value="KEAMANAN">Keamanan</option>
                <option value="CUSTOMER_SERVICE">Customer Service</option>
                <option value="UTILITY">Utility</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Nama</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Divisi</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Masuk</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Istirahat</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Keluar</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Total</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Status</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {logs?.map((log: any) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{log.nama}</td>
                    <td className="px-5 py-3.5"><DivisiBadge divisi={log.divisi} /></td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 font-mono">{log.masuk}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 font-mono">{log.istirahat}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 font-mono">{log.keluar}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{log.total}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={log.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => setSelectedRow(log)} className="text-indigo-600 hover:text-indigo-800 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!logs || logs.length === 0) && (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-600 text-sm">Tidak ada data absensi untuk tanggal ini</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'BULANAN' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap gap-4 items-end justify-between">
            <div className="flex gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Bulan</label>
                <select value={bulan} onChange={e => setBulan(Number(e.target.value))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1}>{format(new Date(2000, i), 'MMMM', { locale: id })}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Tahun</label>
                <select value={tahun} onChange={e => setTahun(Number(e.target.value))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value={2026}>2026</option><option value={2025}>2025</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Divisi</label>
                <select value={divisiBulanan} onChange={e => setDivisiBulanan(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="SEMUA">Semua</option><option value="KEAMANAN">Keamanan</option><option value="CUSTOMER_SERVICE">CS</option><option value="UTILITY">Utility</option>
                </select>
              </div>
            </div>
            <button onClick={handleExportCSV} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Nama</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Hadir</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Jam Kerja</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Rata-rata</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.tableData?.map((row: any) => (
                    <tr key={row.staff_id || row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{row.nama}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{row.total_hadir || row.hadir}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{row.total_jam_kerja || row.jamKerja}h</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{row.rata_jam_per_hari || row.rataRata}h/hari</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-5">Tren Kehadiran</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="SATPAM" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="CS" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="UTILITY" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">Bukti Absensi: {selectedRow.nama}</h3>
              <button onClick={() => setSelectedRow(null)} className="text-slate-600 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Foto Masuk ({selectedRow.masuk})</p>
                <div className="w-full aspect-[3/4] bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {selectedRow.foto_masuk ? <img src={selectedRow.foto_masuk} alt="Masuk" className="w-full h-full object-cover" /> : <span className="text-sm text-slate-600">Tidak ada foto</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Foto Keluar ({selectedRow.keluar})</p>
                <div className="w-full aspect-[3/4] bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {selectedRow.foto_keluar ? <img src={selectedRow.foto_keluar} alt="Keluar" className="w-full h-full object-cover" /> : <span className="text-sm text-slate-600">Tidak ada foto</span>}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-600">{selectedRow.lat ? `${selectedRow.lat}, ${selectedRow.lng}` : 'Tidak tersedia'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
