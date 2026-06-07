import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Eye, X, CheckCircle2, XCircle, FileText } from 'lucide-react';

export const IzinCutiAdmin = () => {
  const queryClient = useQueryClient();
  const [selectedIzin, setSelectedIzin] = useState<any>(null);
  const [komentar, setKomentar] = useState('');

  const { data: izinList, isLoading } = useQuery({
    queryKey: ['admin-izin'],
    queryFn: async () => {
      const res = await api.get('/admin/izin');
      return res.data.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await api.put(`/admin/izin/${id}`, { status, komentar_admin: komentar });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-izin'] });
      setSelectedIzin(null);
      setKomentar('');
    }
  });

  if (isLoading) return <div className="p-8 text-slate-600">Memuat data izin...</div>;

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-200',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${colors[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{status}</span>;
  };

  const JenisBadge = ({ jenis }: { jenis: string }) => {
    const colors: Record<string, string> = {
      SAKIT: 'bg-red-50 text-red-700',
      CUTI: 'bg-blue-50 text-blue-700',
      IZIN: 'bg-yellow-50 text-yellow-700',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[jenis] || 'bg-slate-100 text-slate-600'}`}>{jenis}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Izin & Cuti</h1>
        <p className="text-slate-600 text-sm mt-1">Kelola permohonan izin dan cuti staff</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Staff</th>
              <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Jenis</th>
              <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Tanggal</th>
              <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {izinList?.map((item: any) => (
              <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-900">{item.staff.nama}</div>
                  <div className="text-xs text-slate-600 font-medium">{item.staff.nik} • {item.staff.divisi.replace('_', ' ')}</div>
                </td>
                <td className="px-5 py-3.5"><JenisBadge jenis={item.jenis} /></td>
                <td className="px-5 py-3.5 text-sm text-slate-700 font-medium">
                  {format(new Date(item.tanggal_mulai), 'dd MMM yyyy', { locale: id })} <span className="text-slate-500">s/d</span> {format(new Date(item.tanggal_selesai), 'dd MMM yyyy', { locale: id })}
                </td>
                <td className="px-5 py-3.5"><StatusBadge status={item.status} /></td>
                <td className="px-5 py-3.5 text-right">
                  <button 
                    onClick={() => setSelectedIzin(item)}
                    className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold text-sm transition-colors"
                  >
                    <Eye className="w-4 h-4" /> Detail
                  </button>
                </td>
              </tr>
            ))}
            {(!izinList || izinList.length === 0) && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-600 text-sm font-medium">Belum ada pengajuan izin/cuti.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedIzin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Detail Pengajuan Izin</h2>
              <button onClick={() => setSelectedIzin(null)} className="text-slate-500 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Staff</label>
                  <div className="text-slate-900 font-semibold">{selectedIzin.staff.nama}</div>
                  <div className="text-xs text-slate-600">{selectedIzin.staff.nik}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Jenis Izin</label>
                  <div className="text-slate-900 font-semibold">{selectedIzin.jenis}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Status Saat Ini</label>
                  <StatusBadge status={selectedIzin.status} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Tanggal</label>
                  <div className="text-sm font-medium text-slate-700">
                    {format(new Date(selectedIzin.tanggal_mulai), 'dd MMM yyyy')} - {format(new Date(selectedIzin.tanggal_selesai), 'dd MMM yyyy')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Keterangan / Alasan</label>
                <div className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedIzin.keterangan || 'Tidak ada keterangan tambahan.'}
                </div>
              </div>

              {selectedIzin.foto_url && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Lampiran Bukti</label>
                  <a 
                    href={`http://localhost:9000/siap-storage/${selectedIzin.foto_url}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 font-semibold transition-colors border border-indigo-100"
                  >
                    <FileText className="w-5 h-5" />
                    Lihat Dokumen / Bukti Foto
                  </a>
                </div>
              )}

              {selectedIzin.status === 'PENDING' && (
                <div className="pt-6 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Catatan Persetujuan (Opsional)</label>
                  <textarea
                    value={komentar}
                    onChange={(e) => setKomentar(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 p-3 text-sm transition-all"
                    rows={3}
                    placeholder="Tulis alasan jika ditolak atau catatan tambahan..."
                  />
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => mutation.mutate({ id: selectedIzin.id, status: 'REJECTED' })}
                      className="flex-1 flex items-center justify-center gap-2 bg-white text-red-600 border-2 border-red-200 px-4 py-3 rounded-xl font-bold hover:bg-red-50 hover:border-red-300 transition-all"
                      disabled={mutation.isPending}
                    >
                      <XCircle className="w-5 h-5" /> Tolak
                    </button>
                    <button
                      onClick={() => mutation.mutate({ id: selectedIzin.id, status: 'APPROVED' })}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
                      disabled={mutation.isPending}
                    >
                      <CheckCircle2 className="w-5 h-5" /> Setujui
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
};
