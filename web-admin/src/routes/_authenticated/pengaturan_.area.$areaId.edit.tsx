import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ArrowLeft } from 'lucide-react';
import { ModernMap } from '../../components/ModernMap';

export const Route = createFileRoute('/_authenticated/pengaturan_/area/$areaId/edit')({
  component: AreaEditPage,
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

function AreaEditPage() {
  const { areaId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: areaList, isLoading } = useQuery({
    queryKey: ['area-tugas'],
    queryFn: async () => {
      const res = await api.get('/admin/area-tugas');
      return res.data.data;
    },
  });

  const areaDetail = useMemo(() => {
    return areaList?.find((a: any) => a.id === areaId);
  }, [areaList, areaId]);

  const [formNama, setFormNama] = useState('');
  const [formLat, setFormLat] = useState<number>(-6.2088);
  const [formLng, setFormLng] = useState<number>(106.8456);
  const [formRadius, setFormRadius] = useState<number>(100);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (areaDetail && !initialized) {
      setFormNama(areaDetail.nama || '');
      setFormLat(Number.isFinite(Number(areaDetail.lat)) ? Number(areaDetail.lat) : -6.2088);
      setFormLng(Number.isFinite(Number(areaDetail.lng)) ? Number(areaDetail.lng) : 106.8456);
      setFormRadius(
        Number.isFinite(Number(areaDetail.radius_meter ?? areaDetail.radius))
          ? Number(areaDetail.radius_meter ?? areaDetail.radius)
          : 100
      );
      setInitialized(true);
    }
  }, [areaDetail, initialized]);

  const areaCircles = useMemo(
    () => [
      {
        id: 'preview-area',
        lat: formLat,
        lng: formLng,
        radiusMeters: Math.max(10, formRadius || 100),
        label: formNama || 'Lokasi Area',
        color: '#1ed760',
      },
    ],
    [formLat, formLng, formRadius, formNama]
  );

  const areaCenter = useMemo<[number, number]>(() => [formLat, formLng], [formLat, formLng]);

  const interactivePin = useMemo(
    () => ({
      lat: formLat,
      lng: formLng,
      label: formNama || 'Lokasi Area',
      onChange: (lat: number, lng: number) => {
        setFormLat(lat);
        setFormLng(lng);
      },
    }),
    [formLat, formLng, formNama]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      setSubmitting(true);
      await api.put(`/admin/area-tugas/${areaId}`, {
        nama: formNama.trim(),
        lat: formLat,
        lng: formLng,
        radius_meter: formRadius,
      });
      await queryClient.invalidateQueries({ queryKey: ['area-tugas'] });
      await queryClient.invalidateQueries({ queryKey: ['area-tugas-list'] });
      navigate({ to: '/pengaturan' });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Gagal memperbarui area tugas.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
        Memuat data area tugas...
      </div>
    );
  }

  if (!areaDetail) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm" style={{ color: 'var(--error)' }}>
          Area tugas tidak ditemukan.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: '/pengaturan' })}
          className="text-sm font-bold uppercase underline"
          style={{ color: 'var(--accent)' }}
        >
          Kembali ke Pengaturan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: '/pengaturan' })}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-input)', color: 'var(--text-base)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
          aria-label="Kembali ke Pengaturan"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>
            Ubah Area Tugas: {areaDetail.nama}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Perbarui nama area, koordinat pin, atau radius geofencing
          </p>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-4 p-6 space-y-5 flex flex-col justify-between"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          <div className="space-y-4">
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
                Nama Area
              </label>
              <input
                type="text"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formLat}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setFormLat(v);
                  }}
                  required
                  style={{ ...inputStyle, fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formLng}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v)) setFormLng(v);
                  }}
                  required
                  style={{ ...inputStyle, fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
                Radius Geofence (meter)
              </label>
              <input
                type="number"
                min="10"
                value={formRadius}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v) && v >= 0) setFormRadius(v);
                }}
                required
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => navigate({ to: '/pengaturan' })}
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
              className="flex-1 font-bold uppercase py-2.5 rounded-full transition-all disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                letterSpacing: '1.2px',
                fontSize: 13,
              }}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>

        <div className="lg:col-span-8 h-[420px] lg:h-[520px] relative overflow-hidden">
          <div className="absolute inset-0">
            <ModernMap
              center={areaCenter}
              zoom={16}
              pitch={25}
              defaultStyle="standar"
              circles={areaCircles}
              interactivePin={interactivePin}
              followCenter
            />
          </div>
          <div
            className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full text-xs font-bold uppercase pointer-events-none"
            style={{
              background: 'rgba(24,24,24,0.85)',
              color: '#1ed760',
              letterSpacing: '0.8px',
              border: '1px solid rgba(255,255,255,0.14)',
              backdropFilter: 'blur(6px)',
            }}
          >
            Klik peta atau geser pin
          </div>
        </div>
      </div>
    </div>
  );
}

