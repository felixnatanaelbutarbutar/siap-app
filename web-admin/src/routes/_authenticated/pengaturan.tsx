import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../services/api';
import { X, MapPin, Plus, Pencil, Settings as SettingsIcon } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/pengaturan')({
  component: PengaturanPage,
});

const pinIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background-color:var(--accent);width:14px;height:14px;border-radius:50%;border:2px solid var(--text-base);box-shadow:0 2px 8px rgba(0,0,0,0.6);"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});

const inputStyle = { background: 'var(--bg-input)', color: 'var(--text-base)', border: '1px solid var(--border-bright)', borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const };

function LocationMarker({ position, setPosition }: { position: [number, number]; setPosition: (p: [number, number]) => void }) {
  useMapEvents({ click(e) { setPosition([e.latlng.lat, e.latlng.lng]); } });
  return position === null ? null : <Marker position={position} icon={pinIcon} />;
}

function PengaturanPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<any | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formLat, setFormLat] = useState<number>(-6.200000);
  const [formLng, setFormLng] = useState<number>(106.816666);
  const [formRadius, setFormRadius] = useState<number>(100);
  const [isMapReady, setIsMapReady] = useState(false);

  const { data: areaList } = useQuery({
    queryKey: ['area-tugas'],
    queryFn: async () => { const res = await api.get('/admin/area-tugas'); return res.data.data; }
  });

  const { data: pengaturan } = useQuery({
    queryKey: ['pengaturan-sistem'],
    queryFn: async () => { const res = await api.get('/admin/pengaturan-sistem'); return res.data.data; }
  });

  const [toleransi, setToleransi] = useState(15);
  useEffect(() => {
    if (pengaturan) setToleransi(pengaturan.toleransi_keterlambatan_menit);
  }, [pengaturan]);

  const pengaturanMutation = useMutation({
    mutationFn: async (val: number) => { await api.put('/admin/pengaturan-sistem', { toleransi_keterlambatan_menit: val }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan-sistem'] });
      alert('Pengaturan sistem berhasil disimpan.');
    }
  });

  useEffect(() => {
    if (isModalOpen) { const t = setTimeout(() => setIsMapReady(true), 100); return () => clearTimeout(t); }
    else setIsMapReady(false);
  }, [isModalOpen]);

  const handleOpenModal = (area: any = null) => {
    if (area) { setEditData(area); setFormNama(area.nama); setFormLat(area.lat); setFormLng(area.lng); setFormRadius(area.radius); }
    else { setEditData(null); setFormNama(''); setFormLat(-6.200000); setFormLng(106.816666); setFormRadius(100); }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { nama: formNama, lat: formLat, lng: formLng, radius: formRadius };
      if (editData) await api.put(`/admin/area-tugas/${editData.id}`, body);
      else await api.post('/admin/area-tugas', body);
      queryClient.invalidateQueries({ queryKey: ['area-tugas'] });
      setIsModalOpen(false);
    } catch (err: any) { alert(err?.response?.data?.message || 'Gagal menyimpan area.'); }
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>Pengaturan</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Kelola pengaturan sistem global dan area tugas</p>
        </div>
      </div>

      {/* Global System Settings */}
      <div className="p-6 rounded-xl space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,164,43,0.1)', border: '1px solid rgba(255,164,43,0.2)' }}>
            <SettingsIcon className="w-5 h-5" style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-base)' }}>Pengaturan Sistem</h3>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Konfigurasi parameter otomatisasi SIAP</p>
          </div>
        </div>
        <div className="flex items-end gap-4 max-w-sm">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Toleransi Keterlambatan (Menit)</label>
            <input type="number" min="0" value={toleransi} onChange={e => setToleransi(parseInt(e.target.value))} style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </div>
          <button onClick={() => pengaturanMutation.mutate(toleransi)} disabled={pengaturanMutation.isPending}
            className="font-bold uppercase px-6 py-2.5 rounded-full transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--accent-text)', fontSize: 13, letterSpacing: '1px' }}>
            Simpan
          </button>
        </div>
      </div>

      {/* Header Area Tugas */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-base)' }}>Area Tugas</h2>
        </div>
        <button onClick={() => handleOpenModal()}
          className="flex items-center gap-2 font-bold uppercase rounded-full px-5 py-2.5 transition-all"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)', fontSize: 13, letterSpacing: '1px', boxShadow: 'var(--shadow-base) 0px 8px 8px' }}>
          <Plus className="w-4 h-4" /> Tambah Area
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {areaList?.map((area: any) => (
          <div key={area.id}
            className="p-5 rounded-xl transition-all cursor-default"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(30,215,96,0.1)', border: '1px solid rgba(30,215,96,0.2)' }}>
                  <MapPin className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: 'var(--text-base)' }}>{area.nama}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Radius: {area.radius}m</p>
                </div>
              </div>
              <button onClick={() => handleOpenModal(area)}
                style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}>
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3">
              {[{ label: 'Lat', val: area.lat?.toFixed(6) }, { label: 'Lng', val: area.lng?.toFixed(6) }].map(({ label, val }) => (
                <div key={label} className="flex-1 px-3 py-2 rounded-lg text-xs font-mono" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-dim)' }}>{label}: </span>{val}
                </div>
              ))}
            </div>
          </div>
        ))}
        {(!areaList || areaList.length === 0) && (
          <div className="col-span-full p-12 rounded-xl text-center" style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border)' }}>
            <MapPin className="w-12 h-12 mx-auto mb-3" style={{ color: '#2a2a2a' }} />
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Belum ada area tugas. Klik tombol di atas untuk menambahkan.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-4xl rounded-xl overflow-hidden flex flex-col animate-fadeInUp" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-base) 0px 8px 24px', maxHeight: '90vh' }}>
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-bold" style={{ color: 'var(--text-base)' }}>{editData ? 'Ubah Area Tugas' : 'Tambah Area Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              <div className="w-full lg:w-[320px] p-6 overflow-y-auto flex-shrink-0" style={{ borderRight: '1px solid var(--border)' }}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Nama Area</label>
                    <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} required style={inputStyle} placeholder="contoh: Lobby Utama" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ label: 'Latitude', val: formLat, set: setFormLat }, { label: 'Longitude', val: formLng, set: setFormLng }].map(({ label, val, set }) => (
                      <div key={label}>
                        <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>{label}</label>
                        <input type="number" step="any" value={val} onChange={e => set(parseFloat(e.target.value))} required
                          style={{ ...inputStyle, fontFamily: 'monospace' }} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Radius (meter)</label>
                    <input type="number" min="10" value={formRadius} onChange={e => setFormRadius(parseInt(e.target.value))} required
                      style={{ ...inputStyle, fontFamily: 'monospace' }} />
                  </div>
                  <div className="pt-2">
                    <button type="submit"
                      className="w-full font-bold uppercase py-3 rounded-full transition-all"
                      style={{ background: 'var(--accent)', color: 'var(--accent-text)', letterSpacing: '1.4px', fontSize: 13 }}>
                      Simpan Area
                    </button>
                  </div>
                </form>
              </div>
              <div className="flex-1 min-h-[350px] relative">
                {!isMapReady ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--text-dim)', background: 'var(--bg-base)' }}>Memuat peta...</div>
                ) : (
                  <MapContainer center={[formLat, formLng]} zoom={15} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    <LocationMarker position={[formLat, formLng]} setPosition={(p) => { setFormLat(p[0]); setFormLng(p[1]); }} />
                    <Circle center={[formLat, formLng]} radius={formRadius} pathOptions={{ color: 'var(--accent)', fillColor: 'var(--accent)', fillOpacity: 0.12, weight: 2 }} />
                  </MapContainer>
                )}
                {isMapReady && (
                  <div className="absolute top-3 right-3 z-[400] px-3 py-1.5 rounded-full text-xs font-bold uppercase" style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--accent)', letterSpacing: '0.8px', backdropFilter: 'blur(4px)' }}>
                    Klik peta untuk pin
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
