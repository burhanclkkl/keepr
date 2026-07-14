import { Platform, NativeModules } from 'react-native';

const getBackendUrl = () => {
  if (__DEV__) {
    try {
      // Get the Dev Packager script URL (e.g., http://192.168.1.x:8081/index.bundle)
      const scriptURL = NativeModules.SourceCode?.scriptURL || '';
      const address = scriptURL.split('://')[1];
      const host = address ? address.split(':')[0] : 'localhost';
      
      // Handle fallback for android emulators pointing to localhost
      if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
        return 'http://10.0.2.2:5055';
      }
      
      // Default dev port for Keepr backend is 5055
      return `http://${host || 'localhost'}:5055`;
    } catch (e) {
      // Fallback
      return 'http://localhost:5055';
    }
  }
  
  // Production fallback
  return 'https://api.keepr.example.com';
};

export const API_URL = getBackendUrl();
console.log('[API_URL Configured]', API_URL);
