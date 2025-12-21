import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuorg.uniroom',
  appName: 'UniHub',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['localhost:8090', '10.0.2.2:8090', 'api.unihub.smuks.dev']
  }
};

export default config;
