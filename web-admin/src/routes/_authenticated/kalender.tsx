import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { CalendarDays, Filter } from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/_authenticated/kalender')({
  component: KalenderJadwalPage,
});

const HARI_URUTAN = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'AHAD'];
const JAM_LIST = Array.from({ length: 24 }, (_, i) => i);

function KalenderJadwalPage() {
  const [filterDivisi, setFilterDivisi] = useState('SEMUA');

  const { data: jadwalList, isLoading } = useQuery({
    queryKey: ['jadwal-all', filterDivisi],
    queryFn: async () => {
      const res = await api.get('/admin/jadwal', {
        params: { divisi: filterDivisi }
      });
      return res.data.data;
    }
  });

  // Fungsi pembantu mengecek apakah staf ada di jam tertentu
  // Sebuah staf bertugas di jam J jika J berada di dalam [jam_masuk, jam_keluar).
  const isShiftActive = (jamMasuk: string, jamKeluar: string, targetJam: number) => {
    const masuk = parseInt(jamMasuk.split(':')[0], 10);
    let keluar = parseInt(jamKeluar.split(':')[0], 10);
    const menitKeluar = parseInt(jamKeluar.split(':')[1], 10);
    
    // Jika jam_keluar misal 16:30, berarti di jam 16 staf masih kerja.
    // Jika jam_keluar tepat 16:00, di jam 16 staf sudah pulang.
    if (menitKeluar > 0) {
      keluar += 1;
    }

    // Jika shift tidak melewati tengah malam
    if (masuk <= keluar) {
      return targetJam >= masuk && targetJam < keluar;
    } 
    // Jika shift melewati tengah malam (misal 22:00 s/d 06:00)
    else {
      return targetJam >= masuk || targetJam < keluar;
    }
  };

  const getStaffForCell = (hari: string, jam: number) => {
    if (!jadwalList) return [];
    
    return jadwalList.filter((j: any) => {
      if (!j.aktif) return false;
      if (j.hari !== hari) return false;
      return isShiftActive(j.jam_masuk, j.jam_keluar, jam);
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SATPAM': return { bg: 'rgba(30,215,96,0.15)', text: 'var(--accent)', border: 'var(--accent)' };
      case 'CS': return { bg: 'rgba(83,157,245,0.15)', text: 'var(--info)', border: 'var(--info)' };
      case 'UTILITY': return { bg: 'rgba(255,164,43,0.15)', text: 'var(--warning)', border: 'var(--warning)' };
      case 'ADMIN': return { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa', border: '#a78bfa' };
      default: return { bg: 'var(--bg-input)', text: 'var(--text-secondary)', border: 'var(--border)' };
    }
  };

  return (
    <div className="space-y-6 animate-fadeInUp h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-base)' }}>
            Kalender Shift Harian
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Pantau penugasan staf pada seluruh jam dalam seminggu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
            <select
              value={filterDivisi}
              onChange={(e) => setFilterDivisi(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg text-sm font-bold appearance-none outline-none transition-all cursor-pointer"
              style={{ background: 'var(--bg-input)', color: 'var(--text-base)', border: '1px solid var(--border-bright)' }}
            >
              <option value="SEMUA">SEMUA DIVISI</option>
              <option value="KEAMANAN">KEAMANAN</option>
              <option value="CUSTOMER_SERVICE">CUSTOMER SERVICE</option>
              <option value="UTILITY">UTILITY</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative rounded-xl border overflow-hidden flex flex-col" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <CalendarDays className="w-10 h-10 mb-4 animate-pulse" style={{ color: 'var(--text-dim)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--text-dim)' }}>Memuat Matriks Jadwal...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse" style={{ minWidth: '1200px' }}>
              <thead className="sticky top-0 z-20" style={{ background: 'var(--bg-base)' }}>
                <tr>
                  <th className="sticky left-0 z-30 p-3 text-xs font-bold uppercase w-16" 
                      style={{ background: 'var(--bg-base)', color: 'var(--text-dim)', borderBottom: '2px solid var(--border)', borderRight: '2px solid var(--border)' }}>
                    Jam
                  </th>
                  {HARI_URUTAN.map(hari => (
                    <th key={hari} className="p-3 text-xs font-bold uppercase text-center" 
                        style={{ color: 'var(--text-base)', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', minWidth: '180px' }}>
                      {hari}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {JAM_LIST.map(jam => (
                  <tr key={jam} className="group transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="sticky left-0 z-10 p-2 text-center text-xs font-bold" 
                        style={{ background: 'var(--bg-base)', color: 'var(--text-dim)', borderRight: '2px solid var(--border)' }}>
                      {String(jam).padStart(2, '0')}:00
                    </td>
                    {HARI_URUTAN.map(hari => {
                      const staffDiJamIni = getStaffForCell(hari, jam);
                      const isToday = false; // Boleh diperluas jika ingin highlight hari saat ini
                      
                      return (
                        <td key={`${hari}-${jam}`} className="p-2 align-top transition-colors" 
                            style={{ borderRight: '1px solid var(--border)', background: isToday ? 'rgba(30,215,96,0.02)' : 'transparent' }}>
                          <div className="flex flex-col gap-1.5 min-h-[40px]">
                            {staffDiJamIni.map((j: any) => {
                              const roleColor = getRoleColor(j.staff.role);
                              return (
                                <div key={j.id} 
                                     className="px-2 py-1.5 rounded-md flex flex-col gap-0.5 border-l-2 shadow-sm transition-transform hover:scale-[1.02]"
                                     style={{ 
                                       background: roleColor.bg, 
                                       borderLeftColor: roleColor.border,
                                     }}>
                                  <span className="text-[11px] font-bold truncate leading-tight" style={{ color: roleColor.text }}>
                                    {j.staff.nama}
                                  </span>
                                  <span className="text-[9px] font-bold opacity-80" style={{ color: roleColor.text }}>
                                    {j.jam_masuk} - {j.jam_keluar}
                                  </span>
                                </div>
                              );
                            })}
                            {staffDiJamIni.length === 0 && (
                              <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px]" style={{ color: 'var(--border-bright)' }}>-</span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--bg-base);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border-bright);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--text-dim);
        }
      `}} />
    </div>
  );
}
