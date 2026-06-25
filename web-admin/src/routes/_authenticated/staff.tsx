import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Plus, Pencil, X, UserPlus } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/staff')({
  component: StaffPage,
});

const inputStyle = { background: 'var(--bg-input)', color: 'var(--text-base)', border: '1px solid var(--border-bright)', borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const };
const thStyle = { padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '1px', textAlign: 'left' as const, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-hover)' };

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
  const [formFoto, setFormFoto] = useState<File | null>(null);

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
    const map: Record<string, string> = { KEAMANAN: 'SATPAM', CUSTOMER_SERVICE: 'CS', UTILITY: 'UTILITY', MANAJEMEN: 'ADMIN' };
    return map[divisi] || 'STAFF';
  };

  const handleOpenModal = (staff: any = null) => {
    if (staff) {
      setEditData(staff); setFormNik(staff.nik); setFormNama(staff.nama);
      setFormPassword(''); setFormDivisi(staff.divisi); setFormArea(staff.area_tugas_id || ''); setFormStatus(staff.aktif);
    } else {
      setEditData(null); setFormNik(''); setFormNama(''); setFormPassword('');
      setFormDivisi('KEAMANAN'); setFormArea(''); setFormStatus(true); setFormFoto(null);
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editData) {
        const formData = new FormData();
        formData.append('nama', formNama);
        formData.append('divisi', formDivisi);
        if (formArea) formData.append('area_tugas_id', formArea);
        formData.append('aktif', String(formStatus));
        if (formPassword) formData.append('password', formPassword);
        if (formFoto) formData.append('foto_profil', formFoto);
        
        await api.put(`/admin/staff/${editData.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/admin/staff', { nik: formNik, nama: formNama, password: formPassword, role: getRoleFromDivisi(formDivisi), divisi: formDivisi, area_tugas_id: formArea || undefined });
      }
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  const DivisiBadge = ({ divisi }: { divisi: string }) => {
    const m: Record<string, { bg: string; text: string }> = {
      KEAMANAN: { bg: 'rgba(30,215,96,0.12)', text: 'var(--accent)' },
      CUSTOMER_SERVICE: { bg: 'rgba(83,157,245,0.12)', text: 'var(--info)' },
      UTILITY: { bg: 'rgba(255,164,43,0.12)', text: 'var(--warning)' },
      MANAJEMEN: { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa' },
    };
    const c = m[divisi] || { bg: 'var(--bg-input)', text: 'var(--text-secondary)' };
    return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>{divisi.replace('_', ' ')}</span>;
  };

  const TABS = ['SEMUA', 'KEAMANAN', 'CUSTOMER_SERVICE', 'UTILITY'] as const;
  const tabLabel = (t: string) => t === 'SEMUA' ? 'Semua' : t === 'CUSTOMER_SERVICE' ? 'CS' : t.charAt(0) + t.slice(1).toLowerCase();

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>Staff</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Kelola data karyawan</p>
        </div>
        <button onClick={() => handleOpenModal()}
          className="flex items-center gap-2 font-bold uppercase rounded-full px-5 py-2.5 transition-all"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)', fontSize: 13, letterSpacing: '1px', boxShadow: 'var(--shadow-base) 0px 8px 8px' }}>
          <UserPlus className="w-4 h-4" /> Tambah Staff
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-full w-fit" style={{ background: 'var(--bg-input)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-full text-sm font-bold uppercase transition-all"
            style={{ background: activeTab === tab ? 'var(--accent)' : 'transparent', color: activeTab === tab ? 'var(--accent-text)' : 'var(--text-secondary)', letterSpacing: '0.8px' }}>
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <table className="w-full">
          <thead>
            <tr>{['Staff', 'NIK', 'Divisi', 'Area Tugas', 'Status', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {staffList?.map((staff: any) => (
              <tr key={staff.id}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={tdStyle}>
                  <div className="flex items-center gap-3">
                    {staff.foto_profil ? (
                      <img src={staff.foto_profil} alt="" className="w-8 h-8 rounded-full object-cover" style={{ border: '1px solid var(--border)' }} />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: 'rgba(30,215,96,0.15)', color: 'var(--accent)', border: '1px solid var(--accent)30' }}>
                        {staff.nama?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>{staff.nama}</p>
                      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{staff.role}</p>
                    </div>
                  </div>
                </td>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{staff.nik}</td>
                <td style={tdStyle}><DivisiBadge divisi={staff.divisi} /></td>
                <td style={tdStyle}>{staff.area}</td>
                <td style={tdStyle}>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: staff.aktif ? 'rgba(30,215,96,0.12)' : 'rgba(243,114,127,0.12)', color: staff.aktif ? 'var(--accent)' : 'var(--error)' }}>
                    {staff.aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <button onClick={() => handleOpenModal(staff)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {(!staffList || staffList.length === 0) && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>Belum ada data staff</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden animate-fadeInUp" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-base) 0px 8px 24px' }}>
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold" style={{ color: 'var(--text-base)' }}>{editData ? 'Ubah Data Staff' : 'Tambah Staff Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>NIK</label>
                  <input type="text" value={formNik} onChange={e => setFormNik(e.target.value)} required disabled={!!editData}
                    style={{ ...inputStyle, opacity: editData ? 0.5 : 1 }} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Nama Lengkap</label>
                  <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} required style={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Password {editData && '(Kosongkan jika tidak diubah)'}</label>
                  <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} required={!editData} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Foto Profil {editData && '(Opsional)'}</label>
                  <input type="file" accept="image/*" onChange={e => setFormFoto(e.target.files?.[0] || null)} disabled={!editData} style={{ ...inputStyle, padding: '7px 14px' }} title={!editData ? "Foto hanya bisa diupload saat mengedit staff" : ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Divisi</label>
                  <select value={formDivisi} onChange={e => setFormDivisi(e.target.value)} style={inputStyle}>
                    <option value="KEAMANAN">Keamanan</option>
                    <option value="CUSTOMER_SERVICE">Cleaning Service</option>
                    <option value="UTILITY">Utility</option>
                    <option value="MANAJEMEN">Manajemen (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Role</label>
                  <input type="text" value={getRoleFromDivisi(formDivisi)} disabled
                    style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Area Tugas</label>
                <select value={formArea} onChange={e => setFormArea(e.target.value)} style={inputStyle}>
                  <option value="">— Pilih Area —</option>
                  {areaList?.map((area: any) => <option key={area.id} value={area.id}>{area.nama}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => setFormStatus(!formStatus)}
                  className="relative rounded-full transition-colors"
                  style={{ width: 44, height: 24, background: formStatus ? 'var(--accent)' : 'var(--border-bright)', flexShrink: 0 }}>
                  <span className="absolute top-0.5 rounded-full transition-transform"
                    style={{ width: 20, height: 20, background: 'var(--text-base)', left: 2, transform: formStatus ? 'translateX(20px)' : 'translateX(0)' }} />
                </button>
                <label className="text-sm font-medium cursor-pointer" style={{ color: 'var(--text-secondary)' }} onClick={() => setFormStatus(!formStatus)}>Akun Aktif</label>
              </div>
              <div className="pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-sm font-bold uppercase transition-colors"
                  style={{ background: 'transparent', border: '1px solid var(--border-bright)', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
                  Batal
                </button>
                <button type="submit"
                  className="px-6 py-2.5 rounded-full text-sm font-bold uppercase transition-all"
                  style={{ background: 'var(--accent)', color: 'var(--accent-text)', letterSpacing: '1px', boxShadow: 'var(--shadow-base) 0px 4px 8px' }}>
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
