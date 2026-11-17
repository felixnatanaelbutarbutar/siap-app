import React,{useEffect,useRef,useState} from 'react';
import {View,Alert} from 'react-native';
import {Text,Button} from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import {pendingEvidence,syncEvidence} from '../services/offlineEvidence';
import {useAuthStore} from '../store/auth.store';
import {useQueryClient} from '@tanstack/react-query';

export function NetworkManager(){
  const user=useAuthStore(s=>s.user); const client=useQueryClient();const busy=useRef(false);
  const [offline,setOffline]=useState(false);const [count,setCount]=useState(0);const [syncing,setSyncing]=useState(false);
  async function sync(manual=false){
    if(!user?.id||busy.current)return;
    busy.current=true;setSyncing(true);
    try {await syncEvidence(user.id);await client.invalidateQueries({queryKey:['offline-evidence']});}
    catch(e:any){if(manual)Alert.alert('Bukti Belum Terkirim',e.response?.data?.message||e.message);}
    finally {setCount((await pendingEvidence(user.id)).length);busy.current=false;setSyncing(false);}
  }
  useEffect(()=>{
    if(!user?.id)return;
    const refresh=()=>pendingEvidence(user.id).then(q=>setCount(q.length));refresh();
    const timer=setInterval(refresh,5000);
    const unsubscribe=NetInfo.addEventListener(s=>{setOffline(s.isConnected===false);if(s.isConnected)sync();});
    return ()=>{clearInterval(timer);unsubscribe();};
  },[user?.id]);
  if(!user||(!offline&&!count&&!syncing))return null;
  return <View style={{backgroundColor:'#FFF4DA',padding:12}}><Text>{syncing?'Mengirim bukti untuk verifikasi admin…':count?`${count} bukti tersimpan di HP, belum diverifikasi admin`:'Offline · absensi memerlukan verifikasi admin'}</Text>{count>0&&<Button disabled={syncing} onPress={()=>sync(true)}>Kirim Bukti</Button>}</View>;
}
