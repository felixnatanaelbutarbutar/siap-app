export interface WorkArea { nama: string; lat?: number; lng?: number; radius_meter?: number; }
export function hitungJarakMeter(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a = Math.sin((lat2-lat1)*rad/2)**2 + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin((lon2-lon1)*rad/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1,a)), Math.sqrt(Math.max(0,1-a)));
}
export class GeofenceError extends Error {
  constructor(public title: string, message: string) { super(message); this.name = 'GeofenceError'; }
}
export function validateWorkArea(lat:number, lng:number, area?:WorkArea|null): number {
  if (!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180) throw new GeofenceError('Lokasi belum valid','Aktifkan GPS dan ambil foto kembali.');
  if (!area || !Number.isFinite(area.lat)||!Number.isFinite(area.lng)||!Number.isFinite(area.radius_meter)||Math.abs(area.lat!)>90||Math.abs(area.lng!)>180||area.radius_meter!<=0) {
    throw new GeofenceError('Area tugas belum lengkap','Koordinat atau radius area tugas belum tersedia. Muat ulang profil atau hubungi admin sebelum melakukan absensi.');
  }
  const distance=hitungJarakMeter(lat,lng,area.lat!,area.lng!);
  if(distance>area.radius_meter!) throw new GeofenceError('Di Luar Radius Penugasan',`Anda berada di luar area tugas ${area.nama}. Jarak Anda saat ini: ${Math.round(distance)} meter (Batas radius maksimal: ${area.radius_meter} meter). Anda tidak dapat melakukan absensi di lokasi ini.`);
  return distance;
}
