import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ArrowLeft, Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';

export const Route = createFileRoute('/_authenticated/jadwal_/$staffId')({
  component: DetailJadwalStaffPage,
});

const thStyle = {
  padding: '12px 20px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-dim)',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  textAlign: 'left' as const,
  borderBottom: '1px solid var(--border)',
};
const tdStyle = {
  padding: '12px 20px',
  fontSize: 13,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--bg-hover)',
};

function DetailJadwalStaffPage() {
  const { staffId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const { data: jadwalList, isLoading: jadwalLoading } = useQuery({
    queryKey: ['jadwal-staff', staffId],
    queryFn: async () => {
      const res = await api.get(`/admin/jadwal?staff_id=${staffId}`);
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/jadwal/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal-staff'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-all'] });
      setConfirmDeleteId(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Terjadi kesalahan saat menghapus jadwal');
    },
  });

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
          onClick={() => navigate({ to: '/jadwal' })}
          className="text-sm font-bold uppercase underline"
          style={{ color: 'var(--accent)' }}
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate({ to: '/jadwal' })}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-input)', color: 'var(--text-base)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
          aria-label="Kembali ke Jadwal Kerja"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-base)' }}>
            Jadwal: {staffDetail.nama}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            NIK: {staffDetail.nik} • Divisi: {staffDetail.divisi.replace('_', ' ')}
          </p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => navigate({ to: '/jadwal/$staffId/tambah', params: { staffId } })}
            className="flex items-center gap-2 font-bold uppercase rounded-full px-5 py-2.5 transition-all"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-text)',
              fontSize: 13,
              letterSpacing: '1px',
              boxShadow: 'var(--shadow-base) 0px 8px 8px',
            }}
          >
            <Plus className="w-4 h-4" /> Tambah Hari
          </button>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {jadwalLoading ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
            Memuat jadwal...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['Hari', 'Jam Masuk', 'Jam Keluar', 'Durasi', 'Status', 'Aksi'].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jadwalList?.map((j: any) => {
                const [mH, mM] = j.jam_masuk.split(':').map(Number);
                const [kH, kM] = j.jam_keluar.split(':').map(Number);
                let durasi = kH + kM / 60 - (mH + mM / 60);
                if (durasi < 0) durasi += 24;

                return (
                  <tr
                    key={j.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, color: 'var(--accent)', fontWeight: 'bold' }}>{j.hari}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 14, color: 'var(--text-base)' }}>
                      {j.jam_masuk}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 14, color: 'var(--text-base)' }}>
                      {j.jam_keluar}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{durasi.toFixed(1)} Jam</td>
                    <td style={tdStyle}>
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{
                          background: j.aktif ? 'rgba(30,215,96,0.12)' : 'rgba(243,114,127,0.12)',
                          color: j.aktif ? 'var(--accent)' : 'var(--error)',
                        }}
                      >
                        {j.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'left' }}>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            navigate({
                              to: '/jadwal/$staffId/$jadwalId/edit',
                              params: { staffId, jadwalId: j.id },
                            })
                          }
                          style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                          aria-label={`Edit shift ${j.hari}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(j.id)}
                          style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                          aria-label={`Hapus shift ${j.hari}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Hapus Jadwal"
        message="Yakin ingin menghapus shift jadwal ini?"
        confirmText="Hapus"
        onConfirm={() => {
          if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
