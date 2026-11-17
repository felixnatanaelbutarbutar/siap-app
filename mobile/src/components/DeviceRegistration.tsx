import React, {useState} from 'react';
import {View,Alert} from 'react-native';
import {Text,Button,TextInput} from 'react-native-paper';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {api} from '../services/api';
import {getDeviceStatus,registerDevice} from '../services/device';
import {useAuthStore} from '../store/auth.store';

export function DeviceRegistration() {
  const user=useAuthStore(s=>s.user); const client=useQueryClient();
  const [reason,setReason]=useState('Pendaftaran perangkat absensi pribadi'); const [busy,setBusy]=useState(false);
  const q=useQuery({queryKey:['device',user?.id],queryFn:getDeviceStatus,refetchInterval:15000,retry:false});
  const receipts=useQuery({queryKey:['offline-evidence',user?.id],queryFn:async()=>(await api.get('/offline-attendance/mine')).data.data,refetchInterval:30000});
  const status=q.data?.current?.status;
  const labels:Record<string,string>={APPROVED:'Perangkat terverifikasi',PENDING:'Menunggu persetujuan admin',REVOKED:'Perangkat dicabut',REJECTED:'Pendaftaran ditolak'};
  return <View style={{margin:16,padding:16,borderRadius:16,backgroundColor:status==='APPROVED'?'#E6F4ED':'#FFF4DA'}}>
    <Text style={{fontWeight:'700'}}>{labels[status]||'Daftarkan perangkat absensi'}</Text>
    <Text style={{marginTop:6}}>{q.data?.current?.label||'Satu akun menggunakan satu perangkat yang disetujui admin.'}</Text>
    {q.error&&<Text>{(q.error as Error).message}</Text>}
    {!q.isLoading&&!q.error&&(!status||['REVOKED','REJECTED'].includes(status))&&<><TextInput label="Alasan pendaftaran / penggantian" value={reason} onChangeText={setReason} style={{marginTop:10}}/><Button loading={busy} disabled={busy||reason.trim().length<5} onPress={async()=>{setBusy(true);try{await registerDevice(reason);await client.invalidateQueries({queryKey:['device']});Alert.alert('Terkirim','Minta admin menyetujui perangkat Anda.');}catch(e:any){Alert.alert('Gagal',e.response?.data?.message||e.message);}finally{setBusy(false);}}}>Daftarkan HP Ini</Button></>}
    {(status==='REVOKED'||status==='REJECTED')&&<Text>Hubungi admin untuk memeriksa riwayat dan mengaktifkan kembali perangkat.</Text>}
    <Button onPress={()=>{q.refetch();receipts.refetch();}}>Periksa Status</Button>{receipts.data?.slice(0,3).map((r:any)=><Text key={r.id}>Bukti {r.detail.action}: {r.status==='OFFLINE_APPROVED'?'Disetujui admin':r.status==='OFFLINE_REJECTED'?'Ditolak admin':'Menunggu verifikasi admin'}</Text>)}
  </View>;
}
