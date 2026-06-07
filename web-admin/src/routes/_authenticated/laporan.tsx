import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { useNotificationStore } from '../../store/notificationStore';
import { api } from '../../services/api';
import { Eye, X, CheckCircle2, XCircle } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/laporan')({
  component: LaporanPage,
});

function LaporanPage() {
  const [activeTab, setActiveTab] = useState<'HARIAN' | 'PER_JAM'>('HARIAN');
  const queryClient = useQueryClient();
  const setPendingReports = useNotificationStore((s) => s.setPendingReports);
  const decrementPending = useNotificationStore((s) => s.decrementPending);

  const [dateHarian, setDateHarian] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [divisiHarian, setDivisiHarian] = useState('SEMUA');
  const [statusHarian, setStatusHarian] = useState('SEMUA');

  const [selectedLaporan, setSelectedLaporan] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [reviewKomentar, setReviewKomentar] = useState('');

  const { data: laporanHarian } = useQuery({
    queryKey: ['laporan-harian', dateHarian, divisiHarian, statusHarian],
    queryFn: async () => {
      const res = await api.get('/admin/laporan');
      let data = res.data.data || [];
      if (divisiHarian !== 'SEMUA') data = data.filter((l: any) => l.pembuat?.divisi === divisiHarian);
      if (statusHarian !== 'SEMUA') data = data.filter((l: any) => l.status === statusHarian);
      return data.map((l: any) => ({
        id: l.id,
        waktu: format(new Date(l.created_at), 'HH:mm'),
        nama: l.pembuat?.nama || '-',
        divisi: l.pembuat?.divisi || '-',
        kategori: l.kategori || '-',
        judul: l.judul || l.kategori,
        status: l.status,
        deskripsi: l.deskripsi,
        foto_urls: l.foto_urls || [],
        komentar_admin: l.komentar_admin,
      }));
    }
  });

  useEffect(() => {
    if (laporanHarian) {
      setPendingReports(laporanHarian.filter((l: any) => l.status === 'SUBMITTED').length);
    }
  }, [laporanHarian, setPendingReports]);

  const reviewMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string; komentar: string }) => {
      await api.patch(`/admin/laporan/${payload.id}/review`, { status: payload.status, komentar: payload.komentar });
    },
    onSuccess: () => {
      decrementPending();
      setIsSheetOpen(false);
      setSelectedLaporan(null);
      queryClient.invalidateQueries({ queryKey: ['laporan-harian'] });
    },
  });

  const handleOpenSheet = (laporan: any) => {
    setSelectedLaporan(laporan);
    setReviewStatus('APPROVED');
    setReviewKomentar('');
    setIsSheetOpen(true);
  };

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLaporan) {
      reviewMutation.mutate({ id: selectedLaporan.id, status: reviewStatus, komentar: reviewKomentar });
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      SUBMITTED: 'bg-amber-50 text-amber-700',
      PENDING: 'bg-amber-50 text-amber-700',
      APPROVED: 'bg-emerald-50 text-emerald-700',
      REJECTED: 'bg-red-50 text-red-700',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
  };

  const timelineHours = Array.from({ length: 24 }).map((_, i) => i);
  const mockShiftStart = 8;
  const mockShiftEnd = 16;
  const mockLaporanTerkirim = [8, 9, 10, 11, 14, 15];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Laporan</h1>
        <p className="text-slate-600 text-sm mt-1">Review dan kelola laporan dari staff</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['HARIAN', 'PER_JAM'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`}>
            {tab === 'HARIAN' ? 'Laporan Harian' : 'Per Jam (Satpam)'}
          </button>
        ))}
      </div>

      {activeTab === 'HARIAN' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Tanggal</label>
              <input type="date" value={dateHarian} onChange={e => setDateHarian(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Status</label>
              <select value={statusHarian} onChange={e => setStatusHarian(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="SEMUA">Semua</option>
                <option value="SUBMITTED">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Waktu</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Pelapor</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Kategori</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Judul</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Status</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {laporanHarian?.map((log: any) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-slate-600 font-mono">{log.waktu}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{log.nama}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{log.kategori}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 max-w-[200px] truncate">{log.judul}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={log.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => handleOpenSheet(log)} className="text-indigo-600 hover:text-indigo-800 transition-colors"><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {(!laporanHarian || laporanHarian.length === 0) && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-600 text-sm">Tidak ada laporan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'PER_JAM' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-5">Timeline Audit 24 Jam</h3>
            <div className="flex overflow-x-auto pb-4 gap-2">
              {timelineHours.map(hour => {
                const isShift = hour >= mockShiftStart && hour <= mockShiftEnd;
                const isReported = mockLaporanTerkirim.includes(hour);
                let bgClass = 'bg-slate-100 text-slate-600';
                if (isShift && isReported) bgClass = 'bg-emerald-500 text-white';
                else if (isShift && !isReported) bgClass = 'bg-red-500 text-white animate-pulse';
                return (
                  <div key={hour} className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-xs ${bgClass}`}>{hour}</div>
                    {isShift && !isReported && <span className="text-[9px] font-semibold text-red-500 mt-1">GAP</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-sm text-red-600 font-medium">⚠ Ditemukan 2 celah kosong pada shift ini.</p>
          </div>
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[480px] overflow-y-auto bg-white">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-lg font-bold text-slate-900">Review Laporan</SheetTitle>
          </SheetHeader>
          {selectedLaporan && (
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">Pelapor</p>
                <p className="font-semibold text-slate-900">{selectedLaporan.nama}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">Kategori / Judul</p>
                <p className="text-slate-700">{selectedLaporan.kategori} — {selectedLaporan.judul}</p>
              </div>
              {selectedLaporan.deskripsi && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-600">Deskripsi</p>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">{selectedLaporan.deskripsi}</p>
                </div>
              )}

              {(selectedLaporan.status === 'SUBMITTED' || selectedLaporan.status === 'PENDING') ? (
                <form onSubmit={submitReview} className="border-t border-slate-100 pt-5 space-y-4">
                  <h4 className="font-semibold text-slate-900">Keputusan</h4>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setReviewStatus('APPROVED')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${reviewStatus === 'APPROVED' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>
                      <CheckCircle2 className="w-4 h-4" /> Setujui
                    </button>
                    <button type="button" onClick={() => setReviewStatus('REJECTED')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${reviewStatus === 'REJECTED' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600'}`}>
                      <XCircle className="w-4 h-4" /> Tolak
                    </button>
                  </div>
                  <textarea value={reviewKomentar} onChange={e => setReviewKomentar(e.target.value)} rows={3}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Catatan (opsional)..." />
                  <button type="submit" disabled={reviewMutation.isPending}
                    className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {reviewMutation.isPending ? 'Memproses...' : 'Simpan Keputusan'}
                  </button>
                </form>
              ) : (
                <div className="border-t border-slate-100 pt-5">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm font-medium">Status: <StatusBadge status={selectedLaporan.status} /></p>
                    {selectedLaporan.komentar_admin && <p className="text-sm text-slate-600 mt-2">{selectedLaporan.komentar_admin}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
