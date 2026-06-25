import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Eye, X, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/izin-cuti')({
  component: IzinCutiPage,
});

const thStyle = { padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '1px', textAlign: 'left' as const, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-hover)' };

function IzinCutiPage() {
  const queryClient = useQueryClient();
  const [selectedIzin, setSelectedIzin] = useState<any>(null);
  const [komentar, setKomentar] = useState('');

  const { data: izinList, isLoading } = useQuery({
    queryKey: ['admin-izin'],
    queryFn: async () => { const res = await api.get('/admin/izin'); return res.data.data; }
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await api.put(`/admin/izin/${id}`, { status, komentar_admin: komentar });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-izin'] });
      setSelectedIzin(null);
      setKomentar('');
      // Show brief success indicator
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: data.message || 'Status izin berhasil diperbarui.', type: 'success' } }));
    },
    onError: () => {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Gagal memperbarui status izin.', type: 'error' } }));
    }
  });

  if (isLoading) return (
    <div className="flex items-center justify-center p-16">
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-dim)' }}>
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        Memuat data izin...
      </div>
    </div>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const m: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: 'rgba(255,164,43,0.12)', text: 'var(--warning)' },
      APPROVED: { bg: 'rgba(30,215,96,0.12)', text: 'var(--accent)' },
      REJECTED: { bg: 'rgba(243,114,127,0.12)', text: 'var(--error)' },
    };
    const c = m[status] || { bg: 'var(--bg-input)', text: 'var(--text-secondary)' };
    return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>{status}</span>;
  };

  const JenisBadge = ({ jenis }: { jenis: string }) => {
    const m: Record<string, { bg: string; text: string }> = {
      SAKIT: { bg: 'rgba(243,114,127,0.12)', text: 'var(--error)' },
      CUTI: { bg: 'rgba(83,157,245,0.12)', text: 'var(--info)' },
      IZIN: { bg: 'rgba(255,164,43,0.12)', text: 'var(--warning)' },
    };
    const c = m[jenis] || { bg: 'var(--bg-input)', text: 'var(--text-secondary)' };
    return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>{jenis}</span>;
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>Izin & Cuti</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Kelola permohonan izin dan cuti staff</p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <table className="w-full">
          <thead>
            <tr>{['Staff', 'Jenis', 'Tanggal', 'Status', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {izinList?.map((item: any) => (
              <tr key={item.id}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={tdStyle}>
                  <div className="font-semibold" style={{ color: 'var(--text-base)' }}>{item.staff.nama}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{item.staff.nik} · {item.staff.divisi.replace('_', ' ')}</div>
                </td>
                <td style={tdStyle}><JenisBadge jenis={item.jenis} /></td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                  {format(new Date(item.tanggal_mulai), 'dd MMM yyyy', { locale: id })}
                  <span style={{ color: 'var(--text-dim)' }}> s/d </span>
                  {format(new Date(item.tanggal_selesai), 'dd MMM yyyy', { locale: id })}
                </td>
                <td style={tdStyle}><StatusBadge status={item.status} /></td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <button onClick={() => setSelectedIzin(item)}
                    className="inline-flex items-center gap-1.5 font-bold text-xs uppercase transition-colors"
                    style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.8px' }}>
                    <Eye className="w-4 h-4" /> Detail
                  </button>
                </td>
              </tr>
            ))}
            {(!izinList || izinList.length === 0) && (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>Belum ada pengajuan izin/cuti.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedIzin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col animate-fadeInUp" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-base) 0px 8px 24px', maxHeight: '90vh' }}>
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-bold" style={{ color: 'var(--text-base)' }}>Detail Pengajuan Izin</h2>
              <button onClick={() => setSelectedIzin(null)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Staff</label>
                  <div className="font-bold" style={{ color: 'var(--text-base)' }}>{selectedIzin.staff.nama}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{selectedIzin.staff.nik}</div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Jenis Izin</label>
                  <div className="font-bold mt-1" style={{ color: 'var(--text-base)' }}><JenisBadge jenis={selectedIzin.jenis} /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Status</label>
                  <StatusBadge status={selectedIzin.status} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Tanggal</label>
                  <div className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {format(new Date(selectedIzin.tanggal_mulai), 'dd MMM yyyy')} – {format(new Date(selectedIzin.tanggal_selesai), 'dd MMM yyyy')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Keterangan / Alasan</label>
                <div className="p-4 rounded-xl text-sm leading-relaxed" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {selectedIzin.keterangan || 'Tidak ada keterangan tambahan.'}
                </div>
              </div>

              {selectedIzin.foto_url && (
                <div>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Lampiran Bukti</label>
                  <a
                    href={selectedIzin.foto_url}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold uppercase transition-all text-sm"
                    style={{ background: 'rgba(30,215,96,0.08)', border: '1px solid rgba(30,215,96,0.2)', color: 'var(--accent)', letterSpacing: '0.8px' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,215,96,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30,215,96,0.08)')}
                  >
                    <FileText className="w-4 h-4" /> Lihat Dokumen / Bukti Foto
                  </a>
                </div>
              )}

              {selectedIzin.status === 'PENDING' && (
                <div className="pt-5 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <label className="block text-xs font-bold uppercase" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Catatan Persetujuan (Opsional)</label>
                  <textarea
                    value={komentar}
                    onChange={(e) => setKomentar(e.target.value)}
                    className="w-full rounded-xl p-3 text-sm resize-none outline-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-bright)', color: 'var(--text-base)' }}
                    rows={3}
                    placeholder="Tulis alasan jika ditolak atau catatan tambahan..."
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => mutation.mutate({ id: selectedIzin.id, status: 'REJECTED' })}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase transition-all disabled:opacity-50"
                      style={{ background: 'transparent', border: '2px solid rgba(243,114,127,0.4)', color: 'var(--error)', letterSpacing: '0.8px', fontSize: 13 }}
                      disabled={mutation.isPending}
                    >
                      <XCircle className="w-4 h-4" /> Tolak
                    </button>
                    <button
                      onClick={() => mutation.mutate({ id: selectedIzin.id, status: 'APPROVED' })}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold uppercase transition-all disabled:opacity-50"
                      style={{ background: 'var(--accent)', color: 'var(--accent-text)', letterSpacing: '0.8px', fontSize: 13, boxShadow: 'var(--shadow-base) 0px 4px 8px' }}
                      disabled={mutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Setujui
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
