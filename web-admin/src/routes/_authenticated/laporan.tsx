import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { useNotificationStore } from '../../store/notificationStore';
import { api } from '../../services/api';
import { Eye, CheckCircle2, XCircle, FileText, Image } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/laporan')({
  component: LaporanPage,
});

const thStyle = { padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '1px', textAlign: 'left' as const, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-hover)' };
const inputStyle = { background: 'var(--bg-input)', color: 'var(--text-base)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' };

function LaporanPage() {
  const [activeTab, setActiveTab] = useState<'HARIAN' | 'PER_JAM'>('HARIAN');
  const queryClient = useQueryClient();
  const setPendingReports = useNotificationStore((s) => s.setPendingReports);
  const decrementPending = useNotificationStore((s) => s.decrementPending);

  const [dateHarian, setDateHarian] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusHarian, setStatusHarian] = useState('SEMUA');
  const [selectedLaporan, setSelectedLaporan] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [reviewKomentar, setReviewKomentar] = useState('');

  const { data: laporanHarian } = useQuery({
    queryKey: ['laporan-harian', dateHarian, statusHarian],
    queryFn: async () => {
      const res = await api.get('/admin/laporan');
      let data = res.data.data || [];
      if (statusHarian !== 'SEMUA') data = data.filter((l: any) => l.status === statusHarian);
      return data.map((l: any) => ({
        id: l.id, waktu: format(new Date(l.created_at), 'HH:mm'),
        nama: l.pembuat?.nama || '-', divisi: l.pembuat?.divisi || '-',
        kategori: l.kategori || '-', judul: l.judul || l.kategori,
        status: l.status, deskripsi: l.deskripsi,
        foto_urls: l.foto_urls || [], komentar_admin: l.komentar_admin,
      }));
    }
  });

  useEffect(() => {
    if (laporanHarian) setPendingReports(laporanHarian.filter((l: any) => l.status === 'SUBMITTED').length);
  }, [laporanHarian, setPendingReports]);

  const reviewMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string; komentar: string }) => {
      await api.patch(`/admin/laporan/${payload.id}/review`, { status: payload.status, komentar: payload.komentar });
    },
    onSuccess: () => {
      decrementPending(); setIsSheetOpen(false); setSelectedLaporan(null);
      queryClient.invalidateQueries({ queryKey: ['laporan-harian'] });
    },
  });

  const handleOpenSheet = (laporan: any) => {
    setSelectedLaporan(laporan); setReviewStatus('APPROVED'); setReviewKomentar(''); setIsSheetOpen(true);
  };

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLaporan) reviewMutation.mutate({ id: selectedLaporan.id, status: reviewStatus, komentar: reviewKomentar });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const m: Record<string, { bg: string; text: string }> = {
      SUBMITTED: { bg: 'rgba(255,164,43,0.12)', text: 'var(--warning)' },
      PENDING: { bg: 'rgba(255,164,43,0.12)', text: 'var(--warning)' },
      APPROVED: { bg: 'rgba(30,215,96,0.12)', text: 'var(--accent)' },
      REJECTED: { bg: 'rgba(243,114,127,0.12)', text: 'var(--error)' },
    };
    const c = m[status] || { bg: 'var(--bg-input)', text: 'var(--text-secondary)' };
    return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>{status}</span>;
  };

  const timelineHours = Array.from({ length: 24 }).map((_, i) => i);
  const mockShiftStart = 8; const mockShiftEnd = 16;
  const mockLaporanTerkirim = [8, 9, 10, 11, 14, 15];

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>Laporan</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Review dan kelola laporan dari staff</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-full w-fit" style={{ background: 'var(--bg-input)' }}>
        {(['HARIAN', 'PER_JAM'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-full text-sm font-bold uppercase transition-all"
            style={{ background: activeTab === tab ? 'var(--accent)' : 'transparent', color: activeTab === tab ? 'var(--accent-text)' : 'var(--text-secondary)', letterSpacing: '1px' }}>
            {tab === 'HARIAN' ? 'Laporan Harian' : 'Per Jam (Satpam)'}
          </button>
        ))}
      </div>

      {activeTab === 'HARIAN' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end p-5 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Tanggal</label>
              <input type="date" value={dateHarian} onChange={e => setDateHarian(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Status</label>
              <select value={statusHarian} onChange={e => setStatusHarian(e.target.value)} style={inputStyle}>
                <option value="SEMUA">Semua</option>
                <option value="SUBMITTED">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <table className="w-full">
              <thead>
                <tr>{['Waktu', 'Pelapor', 'Kategori', 'Judul', 'Status', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {laporanHarian?.map((log: any) => (
                  <tr key={log.id}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--accent)' }}>{log.waktu}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-base)', fontWeight: 600 }}>{log.nama}</td>
                    <td style={tdStyle}>{log.kategori}</td>
                    <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.judul}</td>
                    <td style={tdStyle}><StatusBadge status={log.status} /></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => handleOpenSheet(log)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!laporanHarian || laporanHarian.length === 0) && (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>Tidak ada laporan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'PER_JAM' && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-bold text-sm mb-5" style={{ color: 'var(--text-base)' }}>Timeline Audit 24 Jam</h3>
            <div className="flex overflow-x-auto pb-4 gap-2">
              {timelineHours.map(hour => {
                const isShift = hour >= mockShiftStart && hour <= mockShiftEnd;
                const isReported = mockLaporanTerkirim.includes(hour);
                let bg = 'var(--bg-input)'; let color = 'var(--text-dim)';
                if (isShift && isReported) { bg = 'var(--accent)'; color = 'var(--accent-text)'; }
                else if (isShift && !isReported) { bg = 'rgba(243,114,127,0.2)'; color = 'var(--error)'; }
                return (
                  <div key={hour} className="flex flex-col items-center flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs" style={{ background: bg, color }}>
                      {hour}
                    </div>
                    {isShift && !isReported && <span className="text-[9px] font-bold mt-1" style={{ color: 'var(--error)' }}>GAP</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(243,114,127,0.1)', border: '1px solid rgba(243,114,127,0.2)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--error)' }}>⚠ Ditemukan 2 celah kosong pada shift ini.</span>
          </div>
        </div>
      )}

      {/* Review Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[480px] overflow-y-auto" style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}>
          <SheetHeader className="mb-6">
            <SheetTitle style={{ color: 'var(--text-base)', fontWeight: 700 }}>Review Laporan</SheetTitle>
          </SheetHeader>
          {selectedLaporan && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-input)' }}>
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Pelapor</p>
                  <p className="font-bold" style={{ color: 'var(--text-base)' }}>{selectedLaporan.nama}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Kategori / Judul</p>
                  <p style={{ color: 'var(--text-secondary)' }}>{selectedLaporan.kategori} — {selectedLaporan.judul}</p>
                </div>
              </div>

              {selectedLaporan.deskripsi && (
                <div>
                  <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Deskripsi</p>
                  <p className="text-sm p-4 rounded-xl" style={{ color: 'var(--text-secondary)', background: 'var(--bg-input)', lineHeight: '1.6' }}>{selectedLaporan.deskripsi}</p>
                </div>
              )}

              {selectedLaporan.foto_urls?.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Lampiran Foto</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedLaporan.foto_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        className="rounded-xl overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-input)', aspectRatio: '1' }}>
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {(selectedLaporan.status === 'SUBMITTED' || selectedLaporan.status === 'PENDING') ? (
                <form onSubmit={submitReview} className="space-y-4 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Keputusan</p>
                  <div className="flex gap-3">
                    {[
                      { val: 'APPROVED', label: 'Setujui', icon: CheckCircle2, active: { bg: 'rgba(30,215,96,0.15)', border: 'var(--accent)', text: 'var(--accent)' }, inactive: { bg: 'transparent', border: 'var(--border-bright)', text: 'var(--text-secondary)' } },
                      { val: 'REJECTED', label: 'Tolak', icon: XCircle, active: { bg: 'rgba(243,114,127,0.15)', border: 'var(--error)', text: 'var(--error)' }, inactive: { bg: 'transparent', border: 'var(--border-bright)', text: 'var(--text-secondary)' } },
                    ].map(({ val, label, icon: Icon, active, inactive }) => {
                      const isActive = reviewStatus === val;
                      const c = isActive ? active : inactive;
                      return (
                        <button key={val} type="button" onClick={() => setReviewStatus(val)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
                          style={{ background: c.bg, border: `2px solid ${c.border}`, color: c.text }}>
                          <Icon className="w-4 h-4" /> {label}
                        </button>
                      );
                    })}
                  </div>
                  <textarea value={reviewKomentar} onChange={e => setReviewKomentar(e.target.value)} rows={3}
                    className="w-full rounded-xl p-3 text-sm resize-none outline-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-bright)', color: 'var(--text-base)' }}
                    placeholder="Catatan (opsional)..." />
                  <button type="submit" disabled={reviewMutation.isPending}
                    className="w-full font-bold py-3.5 rounded-full uppercase transition-all disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: 'var(--accent-text)', letterSpacing: '1.4px', fontSize: 14 }}>
                    {reviewMutation.isPending ? 'Memproses...' : 'Simpan Keputusan'}
                  </button>
                </form>
              ) : (
                <div className="pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'var(--bg-input)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Status: <StatusBadge status={selectedLaporan.status} /></p>
                    {selectedLaporan.komentar_admin && <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{selectedLaporan.komentar_admin}</p>}
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
