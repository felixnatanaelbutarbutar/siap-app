import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/staff_/tambah')({
  component: StaffTambahPage,
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
    CUSTOMER_SERVICE: 'CS',
    UTILITY: 'UTILITY',
    MANAJEMEN: 'ADMIN',
  };
  return map[divisi] || 'STAFF';
};

function StaffTambahPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formNik, setFormNik] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDivisi, setFormDivisi] = useState('KEAMANAN');
  const [formArea, setFormArea] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: areaList } = useQuery({
    queryKey: ['area-tugas-list'],
    queryFn: async () => {
      const res = await api.get('/admin/area-tugas');
      return res.data.data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      setSubmitting(true);
      await api.post('/admin/staff', {
        nik: formNik.trim(),
        nama: formNama.trim(),
        password: formPassword,
        role: getRoleFromDivisi(formDivisi),
        divisi: formDivisi,
        area_tugas_id: formArea || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      await queryClient.invalidateQueries({ queryKey: ['staff-list-detail'] });
      await queryClient.invalidateQueries({ queryKey: ['staff-list-jadwal'] });
      navigate({ to: '/staff' });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Gagal menyimpan data staff.');
    } finally {
      setSubmitting(false);
    }
  };

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
            Tambah Staff Baru
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Daftarkan akun karyawan baru ke sistem SIAP
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                NIK
              </label>
              <input
                type="text"
                value={formNik}
                onChange={(e) => setFormNik(e.target.value)}
                required
                placeholder="contoh: 10025"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
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
                placeholder="Nama lengkap karyawan"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                Password Akun
              </label>
              <input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                required
                placeholder="Minimal 6 karakter"
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
                <option value="CUSTOMER_SERVICE">Cleaning Service</option>
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

          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            * Foto profil opsional dapat diunggah melalui halaman Ubah Data Staff setelah akun dibuat.
          </p>

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
              {submitting ? 'Menyimpan...' : 'Simpan Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

