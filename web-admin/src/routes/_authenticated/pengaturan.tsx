import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { MapPin, Plus, Pencil, Settings as SettingsIcon } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/pengaturan')({
  component: PengaturanPage,
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

function PengaturanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: areaList } = useQuery({
    queryKey: ['area-tugas'],
    queryFn: async () => {
      const res = await api.get('/admin/area-tugas');
      return res.data.data;
    },
  });

  const { data: pengaturan } = useQuery({
    queryKey: ['pengaturan-sistem'],
    queryFn: async () => {
      const res = await api.get('/admin/pengaturan-sistem');
      return res.data.data;
    },
  });

  const [toleransi, setToleransi] = useState(15);
  useEffect(() => {
    if (pengaturan) setToleransi(pengaturan.toleransi_keterlambatan_menit);
  }, [pengaturan]);

  const pengaturanMutation = useMutation({
    mutationFn: async (val: number) => {
      await api.put('/admin/pengaturan-sistem', { toleransi_keterlambatan_menit: val });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan-sistem'] });
      alert('Pengaturan sistem berhasil disimpan.');
    },
  });

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>
            Pengaturan
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Kelola pengaturan sistem global dan area tugas
          </p>
        </div>
      </div>

      {/* Global System Settings */}
      <div
        className="p-6 rounded-xl space-y-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,164,43,0.1)', border: '1px solid rgba(255,164,43,0.2)' }}
          >
            <SettingsIcon className="w-5 h-5" style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-base)' }}>
              Pengaturan Sistem
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              Konfigurasi parameter otomatisasi SIAP
            </p>
          </div>
        </div>
        <div className="flex items-end gap-4 max-w-sm">
          <div className="flex-1">
            <label
              className="block text-xs font-bold uppercase mb-2"
              style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}
            >
              Toleransi Keterlambatan (Menit)
            </label>
            <input
              type="number"
              min="0"
              value={toleransi}
              onChange={(e) => setToleransi(parseInt(e.target.value || '0', 10))}
              style={{ ...inputStyle, fontFamily: 'monospace' }}
            />
          </div>
          <button
            onClick={() => pengaturanMutation.mutate(toleransi)}
            disabled={pengaturanMutation.isPending}
            className="font-bold uppercase px-6 py-2.5 rounded-full transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--accent-text)', fontSize: 13, letterSpacing: '1px' }}
          >
            Simpan
          </button>
        </div>
      </div>

      {/* Header Area Tugas */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-base)' }}>
            Area Tugas
          </h2>
        </div>
        <button
          onClick={() => navigate({ to: '/pengaturan/area/tambah' })}
          className="flex items-center gap-2 font-bold uppercase rounded-full px-5 py-2.5 transition-all"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            fontSize: 13,
            letterSpacing: '1px',
            boxShadow: 'var(--shadow-base) 0px 8px 8px',
          }}
        >
          <Plus className="w-4 h-4" /> Tambah Area
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {areaList?.map((area: any) => (
          <div
            key={area.id}
            className="p-5 rounded-xl transition-all cursor-default"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(30,215,96,0.1)', border: '1px solid rgba(30,215,96,0.2)' }}
                >
                  <MapPin className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: 'var(--text-base)' }}>
                    {area.nama}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    Radius: {area.radius_meter ?? area.radius}m
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate({ to: '/pengaturan/area/$areaId/edit', params: { areaId: area.id } })}
                style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                aria-label={`Ubah ${area.nama}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3">
              {[
                { label: 'Lat', val: area.lat?.toFixed(6) },
                { label: 'Lng', val: area.lng?.toFixed(6) },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-mono"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                >
                  <span style={{ color: 'var(--text-dim)' }}>{label}: </span>
                  {val}
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!areaList || areaList.length === 0) && (
          <div
            className="col-span-full p-12 rounded-xl text-center"
            style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)' }}
          >
            <MapPin className="w-12 h-12 mx-auto mb-3" style={{ color: '#2a2a2a' }} />
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Belum ada area tugas. Klik tombol di atas untuk menambahkan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
