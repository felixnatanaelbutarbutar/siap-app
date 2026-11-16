const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>{if(!(name in mocks))throw Error(name);return mocks[name]},console});
  return exports;
}
(async()=>{
  const image=load('src/utils/localImage.ts',{'react-native-blob-util':{fs:{exists:async p=>p==='/data/photo.jpg'}}});
  assert.equal(await image.checkedImageUri('/data/photo.jpg'),'file:///data/photo.jpg');
  assert.equal(await image.checkedImageUri('file:///data/photo.jpg'),'file:///data/photo.jpg');
  assert.equal(await image.checkedImageUri('content://camera/1'),'content://camera/1');
  await assert.rejects(image.checkedImageUri('/data/missing.jpg'),/ambil foto ulang/);
  assert.throws(()=>image.localImageUri('invalid'),/tidak valid/);
  let apps=[], registrations=0, cleanups=0;
  const fcm=load('src/services/fcm.ts',{
    '@react-native-firebase/app':{getApps:()=>apps},
    '@react-native-firebase/messaging':{getMessaging:()=>{registrations++;return {}},onNotificationOpenedApp:()=>()=>cleanups++,onMessage:()=>()=>cleanups++,onTokenRefresh:()=>()=>cleanups++,getInitialNotification:async()=>null},
    'react-native':{},'react-native-encrypted-storage':{},'./api':{}
  });
  await fcm.requestUserPermission(); fcm.NotificationListener()(); assert.equal(registrations,0);
  apps=[{name:'[DEFAULT]'}];fcm.NotificationListener()();assert.equal(cleanups,3);
  console.log('PASS: image URI normalization, missing file handling, unconfigured Firebase guard, listener cleanup');
})().catch(e=>{console.error(e);process.exit(1)});
