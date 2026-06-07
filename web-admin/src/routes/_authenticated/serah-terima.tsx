import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '../../services/api';
import { X, ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/serah-terima')({
  component: SerahTerimaPage,
});

const thStyle = { padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '1px', textAlign: 'left' as const, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-hover)' };

function SerahTerimaPage() {
  const [activeTab, setActiveTab] = useState<'BAST' | 'INVENTARIS'>('BAST');
  const [selectedBast, setSelectedBast] = useState<any | null>(null);

  const { data: listBast } = useQuery({
    queryKey: ['serah-terima-bast'],
    queryFn: async () => { const res = await api.get('/admin/serah-terima'); return res.data.data || []; }
  });

  const { data: listInv } = useQuery({
    queryKey: ['serah-terima-inv'],
    queryFn: async () => { const res = await api.get('/admin/inventaris/bermasalah'); return res.data.data || []; }
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const m: Record<string, { bg: string; text: string }> = {
      LENGKAP: { bg: 'rgba(30,215,96,0.12)', text: 'var(--accent)' },
      BERMASALAH: { bg: 'rgba(243,114,127,0.12)', text: 'var(--error)' },
    };
    const c = m[status] || { bg: 'var(--bg-input)', text: 'var(--text-secondary)' };
    return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>{status}</span>;
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>Serah Terima</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Riwayat BAST dan tracking inventaris</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-full w-fit" style={{ background: 'var(--bg-input)' }}>
        <button onClick={() => setActiveTab('BAST')}
          className="px-5 py-2 rounded-full text-sm font-bold uppercase transition-all"
          style={{ background: activeTab === 'BAST' ? 'var(--accent)' : 'transparent', color: activeTab === 'BAST' ? 'var(--accent-text)' : 'var(--text-secondary)', letterSpacing: '1px' }}>
          Riwayat BAST
        </button>
        <button onClick={() => setActiveTab('INVENTARIS')}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold uppercase transition-all"
          style={{ background: activeTab === 'INVENTARIS' ? 'var(--accent)' : 'transparent', color: activeTab === 'INVENTARIS' ? 'var(--accent-text)' : 'var(--text-secondary)', letterSpacing: '1px' }}>
          Inventaris Bermasalah
          {(listInv?.length || 0) > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--error)', color: 'var(--text-base)' }}>
              {listInv?.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'BAST' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr>{['Tanggal', 'Menyerahkan', 'Menerima', 'Divisi', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {listBast?.map((bast: any) => (
                <tr key={bast.id} className="cursor-pointer transition-colors"
                  onClick={() => setSelectedBast(bast)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}>{format(new Date(bast.created_at || bast.tanggal), 'dd MMM yyyy, HH:mm')}</td>
                  <td style={tdStyle}>{bast.staff_lama?.nama || bast.staffLama}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-base)', fontWeight: 600 }}>{bast.staff_baru?.nama || bast.staffBaru}</td>
                  <td style={tdStyle}>{bast.staff_lama?.divisi || bast.divisi}</td>
                  <td style={tdStyle}><StatusBadge status={bast.status || (bast.ada_masalah ? 'BERMASALAH' : 'LENGKAP')} /></td>
                </tr>
              ))}
              {(!listBast || listBast.length === 0) && (
                <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>Belum ada data serah terima</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'INVENTARIS' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {/* Alert header */}
          <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'rgba(243,114,127,0.08)', borderBottom: '1px solid rgba(243,114,127,0.2)' }}>
            <span className="text-xs font-bold uppercase" style={{ color: 'var(--error)', letterSpacing: '1px' }}>⚠ Inventaris Bermasalah</span>
          </div>
          <table className="w-full">
            <thead>
              <tr>{['Barang', 'Kondisi', 'Divisi', 'Tanggal', 'Petugas'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {listInv?.map((inv: any, i: number) => (
                <tr key={inv.id || i}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(243,114,127,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, color: 'var(--error)', fontWeight: 600 }}>{inv.barang || inv.nama}</td>
                  <td style={tdStyle}>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(243,114,127,0.12)', color: 'var(--error)' }}>{inv.kondisi}</span>
                  </td>
                  <td style={tdStyle}>{inv.divisi}</td>
                  <td style={tdStyle}>{inv.tanggal ? format(new Date(inv.tanggal), 'dd MMM yyyy') : '-'}</td>
                  <td style={{ ...tdStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {inv.staffLama || '-'} <ArrowRight className="w-3 h-3" style={{ color: 'var(--text-dim)' }} /> {inv.staffBaru || '-'}
                  </td>
                </tr>
              ))}
              {(!listInv || listInv.length === 0) && (
                <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>Tidak ada inventaris bermasalah</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* BAST Detail Modal */}
      {selectedBast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden animate-fadeInUp" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-base) 0px 8px 24px' }}>
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold" style={{ color: 'var(--text-base)' }}>Dokumen Serah Terima</h3>
              <button onClick={() => setSelectedBast(null)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Menyerahkan</p>
                  <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{selectedBast.staff_lama?.nama || selectedBast.staffLama}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(30,215,96,0.08)', border: '1px solid rgba(30,215,96,0.2)' }}>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--accent)80', letterSpacing: '1px' }}>Menerima</p>
                  <p className="font-bold" style={{ color: 'var(--accent)' }}>{selectedBast.staff_baru?.nama || selectedBast.staffBaru}</p>
                </div>
              </div>

              {selectedBast.barang_list && (
                <div>
                  <h4 className="font-bold text-sm mb-3" style={{ color: 'var(--text-base)' }}>Kondisi Inventaris</h4>
                  <div className="space-y-2">
                    {(selectedBast.barang_list || selectedBast.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ background: item.kondisi !== 'BAIK' ? 'rgba(243,114,127,0.08)' : 'var(--bg-input)', border: `1px solid ${item.kondisi !== 'BAIK' ? 'rgba(243,114,127,0.2)' : '#2a2a2a'}` }}>
                        <span className="text-sm font-medium" style={{ color: item.kondisi !== 'BAIK' ? 'var(--error)' : 'var(--text-secondary)' }}>{item.nama}</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: item.kondisi === 'BAIK' ? 'rgba(30,215,96,0.12)' : 'rgba(243,114,127,0.12)', color: item.kondisi === 'BAIK' ? 'var(--accent)' : 'var(--error)' }}>
                          {item.kondisi}
                        </span>
                      </div>
                    ))}
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
