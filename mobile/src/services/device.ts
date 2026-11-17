import EncryptedStorage from 'react-native-encrypted-storage';
import {useAuthStore} from '../store/auth.store';
import { NativeModules, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Geolocation from 'react-native-geolocation-service';
import MockLocationDetector from 'react-native-mock-location-detector';
import { api } from './api';

function native() {
  if(!NativeModules.SiapDeviceIdentity) throw Error('Pembaruan aplikasi diperlukan. Pasang ulang build Android terbaru untuk registrasi perangkat.');
  return NativeModules.SiapDeviceIdentity;
}
export async function getDeviceStatus() {
  const publicKey=await native().publicKey();
  const {data}=await api.get('/devices/mine');
  const current=data.data.find((d:any)=>d.public_key===publicKey);
  const staffId=useAuthStore.getState().user?.id;
  if(staffId){if(current?.status==='APPROVED') await EncryptedStorage.setItem(`approved-device-${staffId}`,JSON.stringify(current));else await EncryptedStorage.removeItem(`approved-device-${staffId}`);}
  return {publicKey,current,devices:data.data};
}
export async function registerDevice(reason:string) {
  const public_key=await native().publicKey(); const c=Platform.constants as any;
  return api.post('/devices/register',{public_key,label:`${c.Brand||'Android'} ${c.Model||'HP'}`,reason});
}
export async function attendanceProof(action:string,photoUri:string,capturedAt?:number) {
  if(capturedAt && Date.now()-capturedAt>120000) throw Error('Foto sudah kedaluwarsa. Ambil foto ulang.');
  const {current}=await getDeviceStatus();
  if(current?.status!=='APPROVED') throw Error('Perangkat ini belum disetujui admin. Daftarkan perangkat pada halaman Absensi.');
  if(await MockLocationDetector.checkMockLocationProvider()) throw Error('Lokasi palsu terdeteksi. Matikan mock location lalu coba lagi.');
  const position=await new Promise<any>((resolve,reject)=>Geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
  if(position.mocked || position.coords.accuracy>50 || Date.now()-position.timestamp>60000) throw Error('Lokasi belum akurat atau sudah kedaluwarsa. Coba lagi di tempat terbuka.');
  const lat=position.coords.latitude,lng=position.coords.longitude;
  const photo_hash=(action==='MASUK'||action==='KELUAR')?await ReactNativeBlobUtil.fs.hash(photoUri.replace(/^file:\/\//,''),'sha256'):'';
  const {data}=await api.post('/devices/challenge',{device_id:current.id,action});
  const payload=JSON.stringify({nonce:data.data.nonce,action,lat,lng,accuracy:position.coords.accuracy,captured_at:capturedAt??position.timestamp,mock:false,photo_hash});
  const signature=await native().sign(payload);
  return {lat,lng,header:JSON.stringify({challenge_id:data.data.id,payload,signature})};
}
