import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/staff_/$staffId/edit')({
  component: StaffEditPage,
});

const inputStyle = {
  background: 'var(--bg-input)',
  color: 'var(--text-base)',
  border: '1px solid var(--border-bright)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const getRoleFromDivisi = (divisi: string) => {
  const map: Record<string, string> = {
    KEAMANAN: 'SATPAM',
    CLEANING_SERVICE: 'CS',
    UTILITY: 'UTILITY',
    MANAJEMEN: 'ADMIN',
  };
  return map[divisi] || 'STAFF';
};

function StaffEditPage() {
  const { staffId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: staffList, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-list-detail'],
    queryFn: async () => {
      const res = await api.get('/admin/staff');
      return res.data.data;
    },
  });

  const staffDetail = useMemo(() => {
    return staffList?.find((s: any) => s.id === staffId);
  }, [staffList, staffId]);

  const { data: areaList } = useQuery({
    queryKey: ['area-tugas-list'],
    queryFn: async () => {
      const res = await api.get('/admin/area-tugas');
      return res.data.data;
    },
  });

  const [formNik, setFormNik] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDivisi, setFormDivisi] = useState('KEAMANAN');
  const [formArea, setFormArea] = useState('');
  const [formStatus, setFormStatus] = useState(true);
  const [formFoto, setFormFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (staffDetail && !initialized) {
      setFormNik(staffDetail.nik || '');
      setFormNama(staffDetail.nama || '');
      setFormDivisi(staffDetail.divisi || 'KEAMANAN');
      setFormArea(staffDetail.area_tugas_id || '');
      setFormStatus(Boolean(staffDetail.aktif));
      setPreviewUrl(staffDetail.foto_profil || null);
      setInitialized(true);
    }
  }, [staffDetail, initialized]);

  useEffect(() => {
    if (!formFoto) return;
    const objectUrl = URL.createObjectURL(formFoto);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [formFoto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('nama', formNama.trim());
      formData.append('divisi', formDivisi);
      if (formArea) formData.append('area_tugas_id', formArea);
      formData.append('aktif', String(formStatus));
      if (formPassword) formData.append('password', formPassword);
      if (formFoto) formData.append('foto_profil', formFoto);

      await api.put(`/admin/staff/${staffId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      await queryClient.invalidateQueries({ queryKey: ['staff-list-detail'] });
      await queryClient.invalidateQueries({ queryKey: ['staff-list-jadwal'] });
      navigate({ to: '/staff' });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Gagal memperbarui data staff.');
    } finally {
      setSubmitting(false);
    }
  };

  if (staffLoading) {
    return (
      <div className="p-12 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
        Memuat data staff...
      </div>
    );
  }

  if (!staffDetail) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm" style={{ color: 'var(--error)' }}>
          Data staff tidak ditemukan.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: '/staff' })}
          className="text-sm font-bold uppercase underline"
          style={{ color: 'var(--accent)' }}
        >
          Kembali ke Staff
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: '/staff' })}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-input)', color: 'var(--text-base)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
          aria-label="Kembali ke Staff"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>
            Ubah Data Staff
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            NIK: {staffDetail.nik} • {staffDetail.nama}
          </p>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div
              className="px-4 py-3 rounded-lg text-sm font-medium"
              style={{
                background: 'rgba(243,114,127,0.12)',
                color: 'var(--error)',
                border: '1px solid rgba(243,114,127,0.3)',
              }}
            >
              {errorMsg}
            </div>
          )}

          <div className="flex items-center gap-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={formNama}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                style={{ border: '2px solid var(--border-bright)' }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: 'rgba(30,215,96,0.15)', color: 'var(--accent)', border: '1px solid var(--accent)30' }}
              >
                {formNama?.charAt(0) || 'S'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                Foto Profil (Opsional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormFoto(e.target.files?.[0] || null)}
                style={{ ...inputStyle, padding: '7px 14px' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                NIK
              </label>
              <input
                type="text"
                value={formNik}
                disabled
                style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                Nama Lengkap
              </label>
              <input
                type="text"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                Password Baru (Opsional)
              </label>
              <input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Kosongkan jika tidak diubah"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                Area Tugas
              </label>
              <select value={formArea} onChange={(e) => setFormArea(e.target.value)} style={inputStyle}>
                <option value="">— Pilih Area —</option>
                {areaList?.map((area: any) => (
                  <option key={area.id} value={area.id}>
                    {area.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                Divisi
              </label>
              <select value={formDivisi} onChange={(e) => setFormDivisi(e.target.value)} style={inputStyle}>
                <option value="KEAMANAN">Keamanan</option>
                <option value="CLEANING_SERVICE">Cleaning Service</option>
                <option value="UTILITY">Utility</option>
                <option value="MANAJEMEN">Manajemen (Admin)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                Role Otomatis
              </label>
              <input
                type="text"
                value={getRoleFromDivisi(formDivisi)}
                disabled
                style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setFormStatus(!formStatus)}
              className="relative rounded-full transition-colors"
              style={{ width: 44, height: 24, background: formStatus ? 'var(--accent)' : 'var(--border-bright)', flexShrink: 0 }}
            >
              <span
                className="absolute top-0.5 rounded-full transition-transform"
                style={{
                  width: 20,
                  height: 20,
                  background: 'var(--text-base)',
                  left: 2,
                  transform: formStatus ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
            <label
              className="text-sm font-medium cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setFormStatus(!formStatus)}
            >
              Akun Aktif
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => navigate({ to: '/staff' })}
              className="px-5 py-2.5 rounded-full text-sm font-bold uppercase transition-colors"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-bright)',
                color: 'var(--text-secondary)',
                letterSpacing: '1px',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-full text-sm font-bold uppercase transition-all disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                letterSpacing: '1px',
                boxShadow: 'var(--shadow-base) 0px 4px 8px',
              }}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

