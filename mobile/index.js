import {getApps} from '@react-native-firebase/app';
import {getMessaging,setBackgroundMessageHandler} from '@react-native-firebase/messaging';
import { AppRegistry } from 'react-native';
import App from './App';

const firebaseApp=getApps().find(app=>app.name==='[DEFAULT]');
if(firebaseApp) setBackgroundMessageHandler(getMessaging(firebaseApp),async()=>{
  // Notification payloads are displayed by Android; do not create a duplicate.
});

AppRegistry.registerComponent('SiapMobile', () => App);
