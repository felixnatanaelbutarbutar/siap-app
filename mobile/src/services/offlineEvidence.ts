import EncryptedStorage from 'react-native-encrypted-storage';
import {NativeModules} from 'react-native';
import BlobUtil from 'react-native-blob-util';
import Geolocation from 'react-native-geolocation-service';
import MockLocationDetector from 'react-native-mock-location-detector';
import {api} from './api';

const queueKey=(staffId:string)=>`attendance-evidence-${staffId}`;
export async function pendingEvidence(staffId:string):Promise<any[]> {return JSON.parse(await EncryptedStorage.getItem(queueKey(staffId))||'[]');}
export async function saveOfflineEvidence(staffId:string,p:any) {
  const device=JSON.parse(await EncryptedStorage.getItem(`approved-device-${staffId}`)||'null');
  if(!device) throw Error('Perangkat belum pernah diverifikasi online. Hubungi admin.');
  if(await MockLocationDetector.checkMockLocationProvider()) throw Error('Lokasi palsu terdeteksi.');
  const position=await new Promise<any>((resolve,reject)=>Geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
  if(position.mocked||position.coords.accuracy>50||Date.now()-position.timestamp>60000) throw Error('Lokasi offline belum akurat.');
  const id=`offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let uri='';
  if(['MASUK','KELUAR'].includes(p.jenis)) {
    uri=`${BlobUtil.fs.dirs.DocumentDir}/${id}.jpg`;
    await BlobUtil.fs.cp(p.foto_uri.replace(/^file:\/\//,''),uri);
  }
  const payload=JSON.stringify({id,staff_id:staffId,action:p.jenis,lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,captured_at:p.capturedAt||Date.now(),mock:false,photo_hash:uri?await BlobUtil.fs.hash(uri,'sha256'):''});
  const signature=await NativeModules.SiapDeviceIdentity.sign(payload);
  const queue=await pendingEvidence(staffId);
  queue.push({id,uri,proof:JSON.stringify({device_id:device.id,payload,signature})});
  await EncryptedStorage.setItem(queueKey(staffId),JSON.stringify(queue));
}
export async function syncEvidence(staffId:string) {
  const pending=await pendingEvidence(staffId);
  for(const item of pending) {
    const form=new FormData();
    if(item.uri) form.append('foto',{uri:'file://'+item.uri,name:item.id+'.jpg',type:'image/jpeg'} as any);
    await api.post('/offline-attendance',form,{headers:{'Content-Type':'multipart/form-data','X-Device-Proof':item.proof}});
    // Reload queue to retain evidence captured while this upload was in flight.
    const latest=await pendingEvidence(staffId);
    await EncryptedStorage.setItem(queueKey(staffId),JSON.stringify(latest.filter(e=>e.id!==item.id)));
    if(item.uri) await BlobUtil.fs.unlink(item.uri).catch(()=>{});
  }
}
