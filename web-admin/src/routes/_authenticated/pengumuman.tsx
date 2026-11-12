import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: pengumuman = [], isLoading: loading } = useQuery<Pengumuman[]>({
    queryKey: ['pengumuman-list'],
    queryFn: async () => {
      const res = await api.get('/pengumuman');
      return res.data.data;
    },
  });

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/pengumuman/${confirmDeleteId}`);
      await queryClient.invalidateQueries({ queryKey: ['pengumuman-list'] });
    } catch (error) {
      console.error('Error deleting pengumuman:', error);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
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
          onClick={() => navigate({ to: '/pengumuman/buat' })}
          className="flex items-center gap-2 font-bold uppercase rounded-full px-5 py-2.5 transition-all"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            fontSize: 13,
            letterSpacing: '1px',
            boxShadow: 'var(--shadow-base) 0px 8px 8px',
          }}
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
          <div
            className="text-center py-10"
            style={{ background: 'var(--bg-surface)', borderRadius: '0.5rem', border: '1px dashed var(--border)' }}
          >
            <Megaphone className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Belum ada pengumuman
            </p>
          </div>
        ) : (
          pengumuman.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl border flex flex-col gap-3"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
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
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--text-base)' }}>
                      {item.judul}
                    </h3>
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
                  aria-label={`Hapus ${item.judul}`}
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
