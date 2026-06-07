import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Plus, Pencil, X, UserPlus } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/staff')({
  component: StaffPage,
});

function StaffPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'SEMUA' | 'KEAMANAN' | 'CUSTOMER_SERVICE' | 'UTILITY'>('SEMUA');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<any | null>(null);
  const [formNik, setFormNik] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDivisi, setFormDivisi] = useState('KEAMANAN');
  const [formArea, setFormArea] = useState('');
  const [formStatus, setFormStatus] = useState(true);

  const { data: staffList } = useQuery({
    queryKey: ['staff-list', activeTab],
    queryFn: async () => {
      const res = await api.get('/admin/staff');
      const data = res.data.data.map((s: any) => ({
        id: s.id, nik: s.nik, nama: s.nama, divisi: s.divisi, role: s.role,
        area: s.area_tugas?.nama || '-', area_tugas_id: s.area_tugas_id, aktif: s.aktif, foto_profil: s.foto_profil,
      }));
      if (activeTab === 'SEMUA') return data;
      return data.filter((item: any) => item.divisi === activeTab);
    }
  });

  const { data: areaList } = useQuery({
    queryKey: ['area-tugas-list'],
    queryFn: async () => { const res = await api.get('/admin/area-tugas'); return res.data.data; }
  });

  const getRoleFromDivisi = (divisi: string) => {
    switch (divisi) {
      case 'KEAMANAN': return 'SATPAM';
      case 'CUSTOMER_SERVICE': return 'CS';
      case 'UTILITY': return 'UTILITY';
      case 'MANAJEMEN': return 'ADMIN';
      default: return 'STAFF';
    }
  };

  const handleOpenModal = (staff: any = null) => {
    if (staff) {
      setEditData(staff); setFormNik(staff.nik); setFormNama(staff.nama); setFormPassword('');
      setFormDivisi(staff.divisi); setFormArea(staff.area_tugas_id || ''); setFormStatus(staff.aktif);
    } else {
      setEditData(null); setFormNik(''); setFormNama(''); setFormPassword('');
      setFormDivisi('KEAMANAN'); setFormArea(''); setFormStatus(true);
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editData) {
        const body: any = { nama: formNama, divisi: formDivisi, area_tugas_id: formArea || undefined, aktif: formStatus };
        if (formPassword) body.password = formPassword;
        await api.put(`/admin/staff/${editData.id}`, body);
      } else {
        await api.post('/admin/staff', {
          nik: formNik, nama: formNama, password: formPassword,
          role: getRoleFromDivisi(formDivisi), divisi: formDivisi, area_tugas_id: formArea || undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  const DivisiBadge = ({ divisi }: { divisi: string }) => {
    const colors: Record<string, string> = {
      KEAMANAN: 'bg-indigo-50 text-indigo-700',
      CUSTOMER_SERVICE: 'bg-emerald-50 text-emerald-700',
      UTILITY: 'bg-orange-50 text-orange-700',
      MANAJEMEN: 'bg-purple-50 text-purple-700',
    };
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[divisi] || 'bg-slate-100 text-slate-600'}`}>{divisi.replace('_', ' ')}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
          <p className="text-slate-600 text-sm mt-1">Kelola data karyawan</p>
        </div>
        <button onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          <UserPlus className="w-4 h-4" /> Tambah Staff
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['SEMUA', 'KEAMANAN', 'CUSTOMER_SERVICE', 'UTILITY'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`}>
            {tab === 'SEMUA' ? 'Semua' : tab === 'CUSTOMER_SERVICE' ? 'CS' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Staff</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">NIK</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Divisi</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Area Tugas</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Status</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {staffList?.map((staff: any) => (
              <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {staff.foto_profil ? (
                      <img src={staff.foto_profil} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-indigo-600">{staff.nama?.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{staff.nama}</p>
                      <p className="text-xs text-slate-600">{staff.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-slate-600 font-mono">{staff.nik}</td>
                <td className="px-5 py-3.5"><DivisiBadge divisi={staff.divisi} /></td>
                <td className="px-5 py-3.5 text-sm text-slate-600">{staff.area}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${staff.aktif ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {staff.aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => handleOpenModal(staff)} className="text-indigo-600 hover:text-indigo-800 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">{editData ? 'Ubah Data Staff' : 'Tambah Staff Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-600 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">NIK</label>
                  <input type="text" value={formNik} onChange={e => setFormNik(e.target.value)} required disabled={!!editData}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
                  <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Password {editData && '(Kosongkan jika tidak diubah)'}</label>
                <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} required={!editData}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Divisi</label>
                  <select value={formDivisi} onChange={e => setFormDivisi(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="KEAMANAN">Keamanan</option>
                    <option value="CUSTOMER_SERVICE">Customer Service</option>
                    <option value="UTILITY">Utility</option>
                    <option value="MANAJEMEN">Manajemen (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Role</label>
                  <input type="text" value={getRoleFromDivisi(formDivisi)} disabled
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-600 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Area Tugas</label>
                <select value={formArea} onChange={e => setFormArea(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">— Pilih Area —</option>
                  {areaList?.map((area: any) => <option key={area.id} value={area.id}>{area.nama}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setFormStatus(!formStatus)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${formStatus ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formStatus ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <label className="text-sm font-medium text-slate-700 cursor-pointer" onClick={() => setFormStatus(!formStatus)}>Akun Aktif</label>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Batal</button>
                <button type="submit" className="bg-indigo-600 text-white font-medium px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
