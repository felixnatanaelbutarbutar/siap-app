import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/pengumuman_/buat')({
  component: PengumumanBuatPage,
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

const TIPE_OPTIONS = [
  { value: 'INFO', label: 'INFO', desc: 'Informasi operasional harian atau pengingat rutin', color: '#6b7280' },
  { value: 'PENTING', label: 'PENTING', desc: 'Instruksi prioritas tinggi atau kondisi darurat', color: '#ef4444' },
  { value: 'UPDATE', label: 'UPDATE', desc: 'Pembaruan sistem, SOP, atau kebijakan baru', color: '#3b82f6' },
] as const;

function PengumumanBuatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [judul, setJudul] = useState('');
  const [konten, setKonten] = useState('');
  const [tipe, setTipe] = useState<'INFO' | 'PENTING' | 'UPDATE'>('INFO');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !konten.trim()) return;

    setErrorMsg(null);
    try {
      setSubmitting(true);
      await api.post('/pengumuman', {
        judul: judul.trim(),
        konten: konten.trim(),
        tipe,
      });
      await queryClient.invalidateQueries({ queryKey: ['pengumuman-list'] });
      navigate({ to: '/pengumuman' });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Gagal mempublikasikan pengumuman.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: '/pengumuman' })}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-input)', color: 'var(--text-base)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
          aria-label="Kembali ke Pengumuman"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>
            Buat Pengumuman Baru
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Publikasikan pengumuman langsung ke seluruh aplikasi mobile staff
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
              Judul Pengumuman
            </label>
            <input
              type="text"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Jadwal Apel Pagi & Briefing Keamanan"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
              Kategori / Prioritas
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIPE_OPTIONS.map((opt) => {
                const selected = tipe === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTipe(opt.value)}
                    className="p-3.5 rounded-xl text-left transition-all"
                    style={{
                      background: selected ? 'var(--bg-hover)' : 'var(--bg-input)',
                      border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-bright)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ background: opt.color }}
                      >
                        {opt.label}
                      </span>
                      {selected && (
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                      )}
                    </div>
                    <p className="text-xs leading-snug mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>
              Isi Pengumuman
            </label>
            <textarea
              required
              rows={7}
              value={konten}
              onChange={(e) => setKonten(e.target.value)}
              placeholder="Tuliskan detail informasi, instruksi, atau pengumuman untuk seluruh staff di sini..."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => navigate({ to: '/pengumuman' })}
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
              {submitting ? 'Memproses...' : 'Publikasikan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

