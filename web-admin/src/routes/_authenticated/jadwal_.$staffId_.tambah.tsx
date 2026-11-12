import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/jadwal_/$staffId_/tambah')({
  component: JadwalTambahPage,
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

const HARI_OPTIONS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'AHAD'];

function JadwalTambahPage() {
  const { staffId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formHari, setFormHari] = useState('SENIN');
  const [formMasuk, setFormMasuk] = useState('08:00');
  const [formKeluar, setFormKeluar] = useState('17:00');
  const [formAktif, setFormAktif] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/admin/jadwal', {
        staff_id: staffId,
        hari: formHari,
        jam_masuk: formMasuk,
        jam_keluar: formKeluar,
        aktif: formAktif,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['jadwal-staff'] });
      await queryClient.invalidateQueries({ queryKey: ['jadwal-all'] });
      navigate({ to: '/jadwal/$staffId', params: { staffId } });
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || 'Gagal menambah shift jadwal.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    mutation.mutate();
  };

  if (staffLoading) {
    return (
      <div className="p-12 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
        Memuat profil staff...
      </div>
    );
  }

  if (!staffDetail) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm" style={{ color: 'var(--error)' }}>
          Staff tidak ditemukan.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: '/jadwal' })}
          className="text-sm font-bold uppercase underline"
          style={{ color: 'var(--accent)' }}
        >
          Kembali ke Jadwal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: '/jadwal/$staffId', params: { staffId } })}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-input)', color: 'var(--text-base)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
          aria-label="Kembali ke Detail Jadwal Staff"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>
            Tambah Shift Kerja
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {staffDetail.nama} • NIK: {staffDetail.nik} ({staffDetail.divisi.replace('_', ' ')})
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

          <div>
            <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
              Hari Kerja
            </label>
            <select value={formHari} onChange={(e) => setFormHari(e.target.value)} required style={inputStyle}>
              {HARI_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>
              * 1 hari kerja hanya bisa memiliki 1 shift utama per staff.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                Jam Masuk
              </label>
              <input
                type="time"
                value={formMasuk}
                onChange={(e) => setFormMasuk(e.target.value)}
                required
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                Jam Keluar
              </label>
              <input
                type="time"
                value={formKeluar}
                onChange={(e) => setFormKeluar(e.target.value)}
                required
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setFormAktif(!formAktif)}
              className="relative rounded-full transition-colors"
              style={{ width: 44, height: 24, background: formAktif ? 'var(--accent)' : 'var(--border-bright)', flexShrink: 0 }}
            >
              <span
                className="absolute top-0.5 rounded-full transition-transform"
                style={{
                  width: 20,
                  height: 20,
                  background: 'var(--text-base)',
                  left: 2,
                  transform: formAktif ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
            <label
              className="text-sm font-medium cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setFormAktif(!formAktif)}
            >
              Shift Aktif
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => navigate({ to: '/jadwal/$staffId', params: { staffId } })}
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
              disabled={mutation.isPending}
              className="px-6 py-2.5 rounded-full text-sm font-bold uppercase transition-all disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                letterSpacing: '1px',
                boxShadow: 'var(--shadow-base) 0px 4px 8px',
              }}
            >
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

