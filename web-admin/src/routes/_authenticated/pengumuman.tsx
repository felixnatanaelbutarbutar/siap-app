import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { ConfirmModal } from '../../components/ConfirmModal';

interface Pengumuman {
  id: string;
  judul: string;
  konten: string;
  tipe: 'INFO' | 'PENTING' | 'UPDATE';
  created_at: string;
  admin: { nama: string };
}

export const Route = createFileRoute('/_authenticated/pengumuman')({
  component: PengumumanPage,
});

function PengumumanPage() {
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form State
  const [judul, setJudul] = useState('');
  const [konten, setKonten] = useState('');
  const [tipe, setTipe] = useState<'INFO' | 'PENTING' | 'UPDATE'>('INFO');
  const [submitting, setSubmitting] = useState(false);

  const fetchPengumuman = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pengumuman');
      setPengumuman(res.data.data);
    } catch (error) {
      console.error('Error fetching pengumuman:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPengumuman();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul || !konten) return;
    
    try {
      setSubmitting(true);
      await api.post('/pengumuman', { judul, konten, tipe });
      setShowModal(false);
      setJudul('');
      setKonten('');
      setTipe('INFO');
      fetchPengumuman();
    } catch (error) {
      console.error('Error creating pengumuman:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/pengumuman/${confirmDeleteId}`);
      fetchPengumuman();
    } catch (error) {
      console.error('Error deleting pengumuman:', error);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-base)' }}>
            Pengumuman Global
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Kirim informasi dan pembaruan penting ke seluruh aplikasi mobile staff.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white"
          style={{ background: 'var(--accent)' }}
        >
          <Plus className="w-4 h-4" />
          Buat Pengumuman
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-dim)' }}>
            Memuat pengumuman...
          </div>
        ) : pengumuman.length === 0 ? (
          <div className="text-center py-10" style={{ background: 'var(--bg-surface)', borderRadius: '0.5rem', border: '1px dashed var(--border)' }}>
            <Megaphone className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Belum ada pengumuman</p>
          </div>
        ) : (
          pengumuman.map(item => (
            <div key={item.id} className="p-5 rounded-xl border flex flex-col gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {item.tipe === 'PENTING' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-red-500">PENTING</span>
                    )}
                    {item.tipe === 'UPDATE' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-blue-500">UPDATE</span>
                    )}
                    {item.tipe === 'INFO' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-gray-500">INFO</span>
                    )}
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--text-base)' }}>{item.judul}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleString('id-ID')}
                    </span>
                    <span>Oleh: {item.admin.nama}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setConfirmDeleteId(item.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {item.konten}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-base)' }}>Buat Pengumuman Baru</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  value={judul}
                  onChange={e => setJudul(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-base)' }}
                  placeholder="Contoh: Jadwal Libur Nasional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tipe</label>
                <select
                  value={tipe}
                  onChange={e => setTipe(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-base)' }}
                >
                  <option value="INFO">INFO (Biasa)</option>
                  <option value="PENTING">PENTING (Darurat/Prioritas)</option>
                  <option value="UPDATE">UPDATE (Pembaruan Sistem)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Isi Pesan</label>
                <textarea
                  required
                  rows={4}
                  value={konten}
                  onChange={e => setKonten(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all resize-none"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-base)' }}
                  placeholder="Ketik isi pengumuman di sini..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                  style={{ background: 'var(--bg-base)', color: 'var(--text-base)', border: '1px solid var(--border)' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-sm text-white transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  {submitting ? 'Memproses...' : 'Publikasikan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Hapus Pengumuman"
        message="Yakin ingin menghapus pengumuman ini? Pengumuman yang dihapus tidak akan tampil lagi di aplikasi staf."
        confirmText="Hapus"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
