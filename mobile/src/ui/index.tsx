import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
export const colors = { primary: '#087F5B', deep: '#103E32', ink: '#183D32', muted: '#647A70', background: '#F3F7F4', surface: '#FFFFFF', line: '#DCE8DF', mint: '#E0F3E7', amber: '#946200' };
export const ui = StyleSheet.create({
 page: { flex: 1, backgroundColor: colors.background }, body: { padding: 20, paddingBottom: 32, gap: 16 },
 card: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.line },
 title: { fontSize: 28, fontWeight: '700', color: colors.ink, letterSpacing: -0.7 },
 section: { fontSize: 18, fontWeight: '700', color: colors.ink }, text: { fontSize: 15, lineHeight: 23, color: colors.ink },
 muted: { fontSize: 13, lineHeight: 20, color: colors.muted }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
 input: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, minHeight: 52, color: colors.ink, backgroundColor: 'white', fontSize: 16 },
 label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 8 },
});
export const statusInfo: Record<string, { label: string; color: string; bg: string; icon: string }> = {
 DRAFT: { label: 'Draft', color: '#536773', bg: '#EAF0F4', icon: 'pencil-outline' },
 SUBMITTED: { label: 'Menunggu review', color: '#946200', bg: '#FFF2D2', icon: 'clock-outline' },
 PENDING: { label: 'Menunggu persetujuan', color: '#946200', bg: '#FFF2D2', icon: 'clock-outline' },
 APPROVED: { label: 'Disetujui', color: '#087F5B', bg: '#E0F3E7', icon: 'check-circle-outline' },
 REJECTED: { label: 'Perlu perbaikan', color: '#AF3843', bg: '#FBE8EA', icon: 'alert-circle-outline' },
};
export const StatusBadge = ({ status }: { status: string }) => { const s = statusInfo[status] || {label:status,color:colors.muted,bg:colors.background,icon:'information-outline'};return <View style={{flexDirection:'row',alignItems:'center',gap:5,alignSelf:'flex-start',paddingHorizontal:10,paddingVertical:6,borderRadius:30,backgroundColor:s.bg}}><Icon name={s.icon} size={15} color={s.color}/><Text style={{fontSize:12,fontWeight:'600',color:s.color}}>{s.label}</Text></View>; };
export const Action = ({ label, onPress, icon, secondary = false, loading = false, disabled = false }: {label:string;onPress:()=>void;icon?:string;secondary?:boolean;loading?:boolean;disabled?:boolean}) => <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled: disabled || loading, busy:loading}} disabled={disabled || loading} onPress={onPress} activeOpacity={0.8} style={{minHeight:52,borderRadius:16,paddingHorizontal:18,paddingVertical:14,backgroundColor:secondary?colors.mint:colors.primary,opacity:disabled?0.45:1,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8}}>{loading?<ActivityIndicator color={secondary?colors.primary:'white'}/>:icon?<Icon name={icon} size={20} color={secondary?colors.primary:'white'}/>:null}<Text style={{color:secondary?colors.primary:'white',fontSize:15,fontWeight:'700'}}>{label}</Text></TouchableOpacity>;
export const EmptyState = ({title,body,icon='file-document-outline',onRetry}:{title:string;body:string;icon?:string;onRetry?:()=>void}) => <View style={[ui.card,{alignItems:'center',gap:12,paddingVertical:32}]}><Icon name={icon} size={36} color={colors.primary}/><Text style={ui.section}>{title}</Text><Text style={[ui.muted,{textAlign:'center'}]}>{body}</Text>{onRetry&&<Action label="Coba lagi" secondary onPress={onRetry}/>}</View>;
