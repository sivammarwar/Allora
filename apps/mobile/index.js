/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Handle background / quit-state FCM messages
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Background messages are shown automatically by FCM on Android.
  // Add any custom data handling here if needed.
  console.log('Background FCM:', remoteMessage.messageId);
});

AppRegistry.registerComponent(appName, () => App);
