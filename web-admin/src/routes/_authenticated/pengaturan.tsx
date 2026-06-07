import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../services/api';
import { X, MapPin, Plus, Pencil } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/pengaturan')({
  component: PengaturanPage,
});

const pinIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background-color: #6366f1; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (p: [number, number]) => void }) {
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

  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => setIsMapReady(true), 100);
      return () => clearTimeout(timer);
    } else setIsMapReady(false);
  }, [isModalOpen]);

  const handleOpenModal = (area: any = null) => {
    if (area) {
      setEditData(area); setFormNama(area.nama); setFormLat(area.lat); setFormLng(area.lng); setFormRadius(area.radius);
    } else {
      setEditData(null); setFormNama(''); setFormLat(-6.200000); setFormLng(106.816666); setFormRadius(100);
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { nama: formNama, lat: formLat, lng: formLng, radius: formRadius };
      if (editData) {
        await api.put(`/admin/area-tugas/${editData.id}`, body);
      } else {
        await api.post('/admin/area-tugas', body);
      }
      queryClient.invalidateQueries({ queryKey: ['area-tugas'] });
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal menyimpan area.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
          <p className="text-slate-600 text-sm mt-1">Kelola area tugas dan geo-fence</p>
        </div>
        <button onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Tambah Area
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {areaList?.map((area: any) => (
          <div key={area.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{area.nama}</h3>
                  <p className="text-xs text-slate-600">Radius: {area.radius}m</p>
                </div>
              </div>
              <button onClick={() => handleOpenModal(area)} className="text-slate-600 hover:text-indigo-600 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-4 text-xs text-slate-600">
              <div className="bg-slate-50 rounded-lg px-3 py-1.5 font-mono">Lat: {area.lat?.toFixed(6)}</div>
              <div className="bg-slate-50 rounded-lg px-3 py-1.5 font-mono">Lng: {area.lng?.toFixed(6)}</div>
            </div>
          </div>
        ))}
        {(!areaList || areaList.length === 0) && (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-600 text-sm">Belum ada area tugas. Klik tombol di atas untuk menambahkan.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">{editData ? 'Ubah Area Tugas' : 'Tambah Area Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-600 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              <div className="w-full lg:w-1/3 p-6 border-b lg:border-b-0 lg:border-r border-slate-100 overflow-y-auto">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Nama Area</label>
                    <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} required
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Latitude</label>
                      <input type="number" step="any" value={formLat} onChange={e => setFormLat(parseFloat(e.target.value))} required
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Longitude</label>
                      <input type="number" step="any" value={formLng} onChange={e => setFormLng(parseFloat(e.target.value))} required
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Radius (meter)</label>
                    <input type="number" min="10" value={formRadius} onChange={e => setFormRadius(parseInt(e.target.value))} required
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <button type="submit" className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm">
                      Simpan Area
                    </button>
                  </div>
                </form>
              </div>
              <div className="w-full lg:w-2/3 min-h-[350px] relative">
                {!isMapReady ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">Memuat peta...</div>
                ) : (
                  <MapContainer center={[formLat, formLng]} zoom={15} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationMarker position={[formLat, formLng]} setPosition={(p) => { setFormLat(p[0]); setFormLng(p[1]); }} />
                    <Circle center={[formLat, formLng]} radius={formRadius} pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.15, weight: 2 }} />
                  </MapContainer>
                )}
                {isMapReady && (
                  <div className="absolute top-4 right-4 z-[400] bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm">
                    Klik peta untuk pin koordinat
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
