import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Pencil, UserPlus } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/staff')({
  component: StaffPage,
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

function StaffPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'SEMUA' | 'KEAMANAN' | 'CLEANING_SERVICE' | 'UTILITY'>('SEMUA');

  const { data: staffList } = useQuery({
    queryKey: ['staff-list', activeTab],
    queryFn: async () => {
      const res = await api.get('/admin/staff');
      const data = res.data.data.map((s: any) => ({
        id: s.id,
        nik: s.nik,
        nama: s.nama,
        divisi: s.divisi,
        role: s.role,
        area: s.area_tugas?.nama || '-',
        area_tugas_id: s.area_tugas_id,
        aktif: s.aktif,
        foto_profil: s.foto_profil,
      }));
      if (activeTab === 'SEMUA') return data;
      return data.filter((item: any) => item.divisi === activeTab);
    },
  });

  const DivisiBadge = ({ divisi }: { divisi: string }) => {
    const m: Record<string, { bg: string; text: string }> = {
      KEAMANAN: { bg: 'rgba(30,215,96,0.12)', text: 'var(--accent)' },
      CLEANING_SERVICE: { bg: 'rgba(83,157,245,0.12)', text: 'var(--info)' },
      UTILITY: { bg: 'rgba(255,164,43,0.12)', text: 'var(--warning)' },
      MANAJEMEN: { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa' },
    };
    const c = m[divisi] || { bg: 'var(--bg-input)', text: 'var(--text-secondary)' };
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>
        {divisi.replace('_', ' ')}
      </span>
    );
  };

  const TABS = ['SEMUA', 'KEAMANAN', 'CLEANING_SERVICE', 'UTILITY'] as const;
  const tabLabel = (t: string) =>
    t === 'SEMUA' ? 'Semua' : t === 'CLEANING_SERVICE' ? 'Cleaning Service' : t.charAt(0) + t.slice(1).toLowerCase();

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>
            Staff
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Kelola data karyawan
          </p>
        </div>
        <button
          onClick={() => navigate({ to: '/staff/tambah' })}
          className="flex items-center gap-2 font-bold uppercase rounded-full px-5 py-2.5 transition-all"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            fontSize: 13,
            letterSpacing: '1px',
            boxShadow: 'var(--shadow-base) 0px 8px 8px',
          }}
        >
          <UserPlus className="w-4 h-4" /> Tambah Staff
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-full w-fit" style={{ background: 'var(--bg-input)' }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-full text-sm font-bold uppercase transition-all"
            style={{
              background: activeTab === tab ? 'var(--accent)' : 'transparent',
              color: activeTab === tab ? 'var(--accent-text)' : 'var(--text-secondary)',
              letterSpacing: '0.8px',
            }}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                {['Staff', 'NIK', 'Divisi', 'Area Tugas', 'Status', ''].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList?.map((staff: any) => (
                <tr
                  key={staff.id}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}>
                    <div className="flex items-center gap-3">
                      {staff.foto_profil ? (
                        <img
                          src={staff.foto_profil}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                          style={{ border: '1px solid var(--border)' }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: 'rgba(30,215,96,0.15)',
                            color: 'var(--accent)',
                            border: '1px solid var(--accent)30',
                          }}
                        >
                          {staff.nama?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-base)' }}>
                          {staff.nama}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                          {staff.role}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{staff.nik}</td>
                  <td style={tdStyle}>
                    <DivisiBadge divisi={staff.divisi} />
                  </td>
                  <td style={tdStyle}>{staff.area}</td>
                  <td style={tdStyle}>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: staff.aktif ? 'rgba(30,215,96,0.12)' : 'rgba(243,114,127,0.12)',
                        color: staff.aktif ? 'var(--accent)' : 'var(--error)',
                      }}
                    >
                      {staff.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button
                      onClick={() => navigate({ to: '/staff/$staffId/edit', params: { staffId: staff.id } })}
                      style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                      aria-label={`Ubah ${staff.nama}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {(!staffList || staffList.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
                    Belum ada data staff
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
