import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Plus, Pencil, Trash2, ArrowLeft, CalendarDays } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/jadwal_/$staffId')({
  component: DetailJadwalStaffPage,
});

const thStyle = { padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '1px', textAlign: 'left' as const, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-hover)' };
const inputStyle = { background: 'var(--bg-input)', color: 'var(--text-base)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const };

function DetailJadwalStaffPage() {
  const { staffId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [formHari, setFormHari] = useState('SENIN');
  const [formMasuk, setFormMasuk] = useState('08:00');
  const [formKeluar, setFormKeluar] = useState('17:00');
  const [formAktif, setFormAktif] = useState(true);

  // Fetch all staff to find the specific staff detail
  const { data: staffList, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-list-detail'],
    queryFn: async () => { const res = await api.get('/admin/staff'); return res.data.data; }
  });

  const staffDetail = useMemo(() => {
    return staffList?.find((s: any) => s.id === staffId);
  }, [staffList, staffId]);

  // Fetch specific schedules for this staff
  const { data: jadwalList, isLoading: jadwalLoading } = useQuery({
    queryKey: ['jadwal-staff', staffId],
    queryFn: async () => { const res = await api.get(`/admin/jadwal?staff_id=${staffId}`); return res.data.data; }
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.action === 'delete') {
        await api.delete(`/admin/jadwal/${payload.id}`);
      } else if (payload.action === 'update') {
        await api.put(`/admin/jadwal/${payload.id}`, payload.data);
      } else {
        await api.post('/admin/jadwal', payload.data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal-staff'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Terjadi kesalahan');
    }
  });

  const handleOpenModal = (jadwal: any = null) => {
    if (jadwal) {
      setEditData(jadwal);
      setFormHari(jadwal.hari);
      setFormMasuk(jadwal.jam_masuk);
      setFormKeluar(jadwal.jam_keluar);
      setFormAktif(jadwal.aktif);
    } else {
      setEditData(null);
      setFormHari('SENIN');
      setFormMasuk('08:00');
      setFormKeluar('17:00');
      setFormAktif(true);
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { staff_id: staffId, hari: formHari, jam_masuk: formMasuk, jam_keluar: formKeluar, aktif: formAktif };
    if (editData) {
      mutation.mutate({ action: 'update', id: editData.id, data });
    } else {
      mutation.mutate({ action: 'create', data });
    }
  };

  const HARI_OPTIONS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'AHAD'];

  if (staffLoading) {
    return <div className="p-12 text-center text-sm" style={{ color: 'var(--text-dim)' }}>Memuat profil staff...</div>;
  }

  if (!staffDetail) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm" style={{ color: 'var(--error)' }}>Staff tidak ditemukan.</p>
        <button onClick={() => navigate({ to: '/jadwal' })} className="text-sm font-bold uppercase underline" style={{ color: 'var(--accent)' }}>Kembali</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate({ to: '/jadwal' })} className="w-10 h-10 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--bg-input)', color: 'var(--text-base)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-input)')}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-base)' }}>
            Jadwal: {staffDetail.nama}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>NIK: {staffDetail.nik} • Divisi: {staffDetail.divisi.replace('_', ' ')}</p>
        </div>
        <div className="ml-auto">
          <button onClick={() => handleOpenModal()}
            className="flex items-center gap-2 font-bold uppercase rounded-full px-5 py-2.5 transition-all"
            style={{ background: 'var(--accent)', color: 'var(--accent-text)', fontSize: 13, letterSpacing: '1px', boxShadow: 'var(--shadow-base) 0px 8px 8px' }}>
            <Plus className="w-4 h-4" /> Tambah Hari
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {jadwalLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--text-dim)' }}>Memuat jadwal...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>{['Hari', 'Jam Masuk', 'Jam Keluar', 'Durasi', 'Status', 'Aksi'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {jadwalList?.map((j: any) => {
                let [mH, mM] = j.jam_masuk.split(':').map(Number);
                let [kH, kM] = j.jam_keluar.split(':').map(Number);
                let durasi = (kH + kM/60) - (mH + mM/60);
                if (durasi < 0) durasi += 24;

                return (
                  <tr key={j.id} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...tdStyle, color: 'var(--accent)', fontWeight: 'bold' }}>{j.hari}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 14, color: 'var(--text-base)' }}>{j.jam_masuk}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 14, color: 'var(--text-base)' }}>{j.jam_keluar}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{durasi.toFixed(1)} Jam</td>
                    <td style={tdStyle}>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: j.aktif ? 'rgba(30,215,96,0.12)' : 'rgba(243,114,127,0.12)', color: j.aktif ? 'var(--accent)' : 'var(--error)' }}>
                        {j.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'left' }}>
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(j)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { if(confirm('Hapus shift ini?')) mutation.mutate({ action: 'delete', id: j.id }) }} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!jadwalList || jadwalList.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
                    <CalendarDays className="w-10 h-10 mx-auto mb-3" style={{ color: '#2a2a2a' }} />
                    Belum ada jadwal shift untuk staff ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-xl overflow-hidden animate-fadeInUp" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-base) 0px 8px 24px' }}>
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold" style={{ color: 'var(--text-base)' }}>{editData ? 'Edit Shift' : 'Tambah Shift'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}><Plus className="w-5 h-5 rotate-45" /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Hari Kerja</label>
                <select value={formHari} onChange={e => setFormHari(e.target.value)} required disabled={!!editData} style={{ ...inputStyle, opacity: editData ? 0.5 : 1 }}>
                  {HARI_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                {!editData && <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>*1 hari kerja hanya bisa memiliki 1 shift utama.</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Jam Masuk</label>
                  <input type="time" value={formMasuk} onChange={e => setFormMasuk(e.target.value)} required style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Jam Keluar</label>
                  <input type="time" value={formKeluar} onChange={e => setFormKeluar(e.target.value)} required style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setFormAktif(!formAktif)} className="relative rounded-full transition-colors" style={{ width: 44, height: 24, background: formAktif ? 'var(--accent)' : 'var(--border-bright)', flexShrink: 0 }}>
                  <span className="absolute top-0.5 rounded-full transition-transform" style={{ width: 20, height: 20, background: 'var(--text-base)', left: 2, transform: formAktif ? 'translateX(20px)' : 'translateX(0)' }} />
                </button>
                <label className="text-sm font-medium cursor-pointer" style={{ color: 'var(--text-secondary)' }} onClick={() => setFormAktif(!formAktif)}>Shift Aktif</label>
              </div>
              <div className="pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button type="submit" disabled={mutation.isPending} className="w-full font-bold uppercase py-3 rounded-full transition-all disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--accent-text)', letterSpacing: '1.4px', fontSize: 13 }}>
                  {mutation.isPending ? 'Menyimpan...' : 'Simpan Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
