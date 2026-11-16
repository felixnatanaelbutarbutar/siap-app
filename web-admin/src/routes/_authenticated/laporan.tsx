import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { useNotificationStore } from '../../store/notificationStore';
import { api } from '../../services/api';
import { Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';

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
      const params: any = { tanggal: dateHarian };
      if (statusHarian !== 'SEMUA') params.status = statusHarian;
      const res = await api.get('/admin/laporan', { params });
      let data = res.data.data || [];
      return data.map((l: any) => ({
        id: l.id,
        waktu: format(new Date(l.created_at), 'HH:mm'),
        nama: l.staff?.nama || l.pembuat?.nama || '-',
        divisi: l.divisi || l.staff?.divisi || '-',
        kategori: l.kategori || '-',
        judul: l.judul || l.kategori,
        status: l.status,
        deskripsi: l.deskripsi,
        foto_urls: l.foto_urls || [],
        komentar_admin: l.komentar_admin,
      }));
    }
  });

  const { data: laporanPerJamList, isLoading: loadingPerJam } = useQuery({
    queryKey: ['admin-laporan-perjam', dateHarian],
    queryFn: async () => {
      const res = await api.get('/admin/laporan/perjam', { params: { tanggal: dateHarian } });
      return res.data.data || [];
    },
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

  const groupedPerJam = useMemo(() => {
    if (!Array.isArray(laporanPerJamList)) return [];
    const map = new Map<string, { staff: any; items: any[]; hours: Set<number> }>();
    laporanPerJamList.forEach((item: any) => {
      const staffId = item.staff_id;
      if (!map.has(staffId)) {
        map.set(staffId, {
          staff: item.staff || { nama: 'Staff Satpam', nik: '-' },
          items: [],
          hours: new Set<number>(),
        });
      }
      const entry = map.get(staffId)!;
      entry.items.push(item);
      entry.hours.add(Number(item.jam));
    });
    return Array.from(map.values());
  }, [laporanPerJamList]);

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
            {tab === 'HARIAN' ? 'Laporan Harian' : 'Per 3 Jam (Satpam)'}
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
          <div className="flex flex-wrap gap-4 items-end p-5 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Tanggal Audit</label>
              <input type="date" value={dateHarian} onChange={e => setDateHarian(e.target.value)} style={inputStyle} />
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Total {groupedPerJam.length} staff Satpam bertugas • {laporanPerJamList?.length || 0} laporan terkirim
            </div>
          </div>

          {loadingPerJam ? (
            <div className="p-12 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
              Memuat data audit laporan per jam...
            </div>
          ) : groupedPerJam.length > 0 ? (
            groupedPerJam.map((group, gIdx) => (
              <div key={gIdx} className="p-6 rounded-xl space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-base)' }}>{group.staff.nama}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>NIK: {group.staff.nik || '-'}</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(30,215,96,0.12)', color: 'var(--accent)' }}>
                    {group.items.length} Laporan Masuk
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Timeline 24 Jam</p>
                  <div className="flex overflow-x-auto pb-2 gap-1.5">
                    {timelineHours.map(hour => {
                      const isReported = group.hours.has(hour);
                      let bg = isReported ? 'var(--accent)' : 'var(--bg-input)';
                      let color = isReported ? 'var(--accent-text)' : 'var(--text-dim)';
                      return (
                        <div key={hour} className="flex flex-col items-center flex-shrink-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: bg, color }}>
                            {hour}
                          </div>
                          <span className="text-[9px] mt-1" style={{ color: isReported ? 'var(--accent)' : 'var(--text-dim)' }}>
                            {String(hour).padStart(2, '0')}:00
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {group.items.map((item: any) => {
                    const statusBadgeBg = item.status_keamanan === 'AMAN' ? 'rgba(30,215,96,0.12)' : 'rgba(243,114,127,0.12)';
                    const statusBadgeColor = item.status_keamanan === 'AMAN' ? 'var(--accent)' : 'var(--error)';
                    return (
                      <div key={item.id} className="p-3 rounded-lg flex gap-3 items-start" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-bright)' }}>
                        {item.foto_url ? (
                          <a href={item.foto_url} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 block">
                            <img src={item.foto_url} alt="Foto Per Jam" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-surface)' }}>
                            <Clock className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs text-white">Jam {String(item.jam).padStart(2, '0')}:00</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: statusBadgeBg, color: statusBadgeColor }}>
                              {item.status_keamanan}
                            </span>
                          </div>
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                            {item.catatan || 'Kondisi terpantau aman.'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-dim)' }} />
              <p className="font-bold text-sm" style={{ color: 'var(--text-base)' }}>Belum Ada Laporan Per 3 Jam</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Staff Satpam belum mengirimkan checklist rutin 3 jam pada tanggal {dateHarian}.</p>
            </div>
          )}
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
