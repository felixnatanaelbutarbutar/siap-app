import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { CalendarDays, Search, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/jadwal')({
  component: JadwalPage,
});

const thStyle = { padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '1px', textAlign: 'left' as const, borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--bg-hover)' };
const inputStyle = { background: 'var(--bg-input)', color: 'var(--text-base)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const };

function JadwalPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'MANAJEMEN' | 'REKAP'>('MANAJEMEN');
  const [filterDivisi, setFilterDivisi] = useState('SEMUA');
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1);
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');

  // Fetch all staff to show in the Manajemen list
  const { data: staffList, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-list-jadwal'],
    queryFn: async () => { 
      const res = await api.get('/admin/staff'); 
      return res.data.data; 
    }
  });

  const { data: rekapList, isLoading: rekapLoading } = useQuery({
    queryKey: ['rekap-jadwal', filterBulan, filterTahun, filterDivisi],
    queryFn: async () => { const res = await api.get(`/admin/rekap-jadwal?bulan=${filterBulan}&tahun=${filterTahun}&divisi=${filterDivisi}`); return res.data.data; },
    enabled: activeTab === 'REKAP'
  });

  const filteredStaff = useMemo(() => {
    if (!staffList) return [];
    let result = staffList;
    if (filterDivisi !== 'SEMUA') {
      result = result.filter((s: any) => s.divisi === filterDivisi);
    }
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((s: any) => s.nama.toLowerCase().includes(lower) || s.nik.includes(lower));
    }
    return result;
  }, [staffList, search, filterDivisi]);

  const filteredRekap = useMemo(() => {
    if (!rekapList) return [];
    if (!search) return rekapList;
    const lower = search.toLowerCase();
    return rekapList.filter((r: any) => r.nama.toLowerCase().includes(lower));
  }, [rekapList, search]);

  const TABS = [
    { id: 'MANAJEMEN', label: 'Manajemen Jadwal Staff', icon: CalendarDays },
    { id: 'REKAP', label: 'Rekap & Keterlambatan', icon: Clock }
  ] as const;

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-base)' }}>Jadwal Kerja</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Kelola jadwal shift per-staff dan pantau keterlambatan</p>
      </div>

      <div className="flex gap-1 p-1 rounded-full w-fit" style={{ background: 'var(--bg-input)' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold uppercase transition-all"
            style={{ background: activeTab === tab.id ? 'var(--accent)' : 'transparent', color: activeTab === tab.id ? 'var(--accent-text)' : 'var(--text-secondary)', letterSpacing: '1px' }}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-end p-5 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Cari Nama / NIK</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5" style={{ color: 'var(--text-dim)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Divisi</label>
          <select value={filterDivisi} onChange={e => setFilterDivisi(e.target.value)} style={inputStyle}>
            <option value="SEMUA">Semua Divisi</option>
            <option value="KEAMANAN">Keamanan</option>
            <option value="CUSTOMER_SERVICE">Cleaning Service</option>
            <option value="UTILITY">Utility</option>
          </select>
        </div>
        {activeTab === 'REKAP' && (
          <>
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Bulan</label>
              <select value={filterBulan} onChange={e => setFilterBulan(Number(e.target.value))} style={inputStyle}>
                {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('id', { month: 'long' })}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '1px' }}>Tahun</label>
              <select value={filterTahun} onChange={e => setFilterTahun(Number(e.target.value))} style={inputStyle}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      {activeTab === 'MANAJEMEN' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {staffLoading ? (
            <div className="p-12 text-center text-sm" style={{ color: 'var(--text-dim)' }}>Memuat daftar staff...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>{['Pilih Staff', 'Divisi', 'Status Akun', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredStaff?.map((s: any) => (
                  <tr key={s.id} 
                    className="cursor-pointer transition-colors"
                    onClick={() => navigate({ to: '/jadwal/$staffId', params: { staffId: s.id } })}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} 
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}>
                      <div className="flex items-center gap-3">
                        {s.foto_profil ? (
                          <img src={s.foto_profil} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: '1px solid var(--border)' }} />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                            style={{ background: 'rgba(30,215,96,0.15)', color: 'var(--accent)', border: '1px solid var(--accent)30' }}>
                            {s.nama?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--text-base)' }}>{s.nama}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)', fontFamily: 'monospace' }}>NIK: {s.nik}</p>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                        {s.divisi.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: s.aktif ? 'rgba(30,215,96,0.12)' : 'rgba(243,114,127,0.12)', color: s.aktif ? 'var(--accent)' : 'var(--error)' }}>
                        {s.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase transition-colors" style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>
                        Atur Jadwal <ArrowRight className="w-4 h-4" />
                      </span>
                    </td>
                  </tr>
                ))}
                {(!filteredStaff || filteredStaff.length === 0) && (
                  <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>Tidak ada staff ditemukan</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'REKAP' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {rekapLoading ? (
            <div className="p-12 text-center text-sm" style={{ color: 'var(--text-dim)' }}>Memuat rekap...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>{['Staff', 'Jadwal (Hari)', 'Total Kehadiran', 'Jam Aktual', 'Terjadwal', 'Terlambat', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredRekap?.map((r: any) => (
                  <tr key={r.staff_id} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={tdStyle}>
                      <p className="font-bold" style={{ color: 'var(--text-base)' }}>{r.nama}</p>
                      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{r.divisi.replace('_', ' ')}</p>
                    </td>
                    <td style={tdStyle}>{r.total_jadwal_hari} Hari</td>
                    <td style={tdStyle}>{r.total_kehadiran} Hari</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--accent)', fontSize: 14 }}>{r.total_jam_aktual} Jam</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{r.total_jam_kerja_terjadwal} Jam</td>
                    <td style={tdStyle}>
                      {r.total_terlambat > 0 ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit" style={{ background: 'rgba(243,114,127,0.12)', color: 'var(--error)' }}>
                          <AlertTriangle className="w-3 h-3" /> {r.total_terlambat} Kali
                        </span>
                      ) : (
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>0</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {r.total_terlambat > 0 && (
                        <button onClick={() => alert(JSON.stringify(r.detail_terlambat, null, 2))} className="text-xs font-bold uppercase hover:underline" style={{ color: 'var(--info)', background: 'none', border: 'none', cursor: 'pointer' }}>Detail</button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!filteredRekap || filteredRekap.length === 0) && (
                  <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>Tidak ada rekap</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
