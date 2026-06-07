import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '../../services/api';
import { X, FileDown, AlertTriangle } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/serah-terima')({
  component: SerahTerimaPage,
});

function SerahTerimaPage() {
  const [activeTab, setActiveTab] = useState<'BAST' | 'INVENTARIS'>('BAST');
  const [selectedBast, setSelectedBast] = useState<any | null>(null);

  const { data: listBast } = useQuery({
    queryKey: ['serah-terima-bast'],
    queryFn: async () => {
      const res = await api.get('/admin/serah-terima');
      return res.data.data || [];
    }
  });

  const { data: listInv } = useQuery({
    queryKey: ['serah-terima-inv'],
    queryFn: async () => {
      const res = await api.get('/admin/inventaris/bermasalah');
      return res.data.data || [];
    }
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      LENGKAP: 'bg-emerald-50 text-emerald-700',
      BERMASALAH: 'bg-red-50 text-red-700',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Serah Terima</h1>
        <p className="text-slate-600 text-sm mt-1">Riwayat BAST dan tracking inventaris</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('BAST')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'BAST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`}>
          Riwayat BAST
        </button>
        <button onClick={() => setActiveTab('INVENTARIS')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'INVENTARIS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`}>
          Inventaris Bermasalah
          {(listInv?.length || 0) > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{listInv?.length}</span>}
        </button>
      </div>

      {activeTab === 'BAST' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Tanggal</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Staff Lama</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Staff Baru</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Divisi</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {listBast?.map((bast: any) => (
                <tr key={bast.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedBast(bast)}>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{format(new Date(bast.created_at || bast.tanggal), 'dd MMM yyyy, HH:mm')}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{bast.staff_lama?.nama || bast.staffLama}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{bast.staff_baru?.nama || bast.staffBaru}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{bast.staff_lama?.divisi || bast.divisi}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={bast.status || (bast.ada_masalah ? 'BERMASALAH' : 'LENGKAP')} /></td>
                </tr>
              ))}
              {(!listBast || listBast.length === 0) && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-600 text-sm">Belum ada data serah terima</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'INVENTARIS' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-red-50 border-b border-red-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-red-700">Barang</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-red-700">Kondisi</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-red-700">Divisi</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-red-700">Tanggal</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-red-700">Petugas</th>
              </tr>
            </thead>
            <tbody>
              {listInv?.map((inv: any, i: number) => (
                <tr key={inv.id || i} className="border-b border-slate-100 hover:bg-red-50/30">
                  <td className="px-5 py-3.5 text-sm font-medium text-red-700">{inv.barang || inv.nama}</td>
                  <td className="px-5 py-3.5"><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700">{inv.kondisi}</span></td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{inv.divisi}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{inv.tanggal ? format(new Date(inv.tanggal), 'dd MMM yyyy') : '-'}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{inv.staffLama || '-'} → {inv.staffBaru || '-'}</td>
                </tr>
              ))}
              {(!listInv || listInv.length === 0) && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-600 text-sm">Tidak ada inventaris bermasalah</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedBast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">Dokumen Serah Terima</h3>
              <button onClick={() => setSelectedBast(null)} className="text-slate-600 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-600 mb-1">Menyerahkan</p>
                  <p className="font-semibold text-slate-900">{selectedBast.staff_lama?.nama || selectedBast.staffLama}</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-indigo-400 mb-1">Menerima</p>
                  <p className="font-semibold text-indigo-700">{selectedBast.staff_baru?.nama || selectedBast.staffBaru}</p>
                </div>
              </div>

              {selectedBast.barang_list && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Kondisi Inventaris</h4>
                  <div className="space-y-2">
                    {(selectedBast.barang_list || selectedBast.items || []).map((item: any, idx: number) => (
                      <div key={idx} className={`flex items-center justify-between px-4 py-3 rounded-xl ${item.kondisi !== 'BAIK' ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <span className={`text-sm font-medium ${item.kondisi !== 'BAIK' ? 'text-red-700' : 'text-slate-700'}`}>{item.nama}</span>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${item.kondisi === 'BAIK' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{item.kondisi}</span>
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
