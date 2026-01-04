import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuorg.uniroom',
  appName: 'UniHub',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    allowNavigation: ['https://api.unihub.smuks.dev', 'api.unihub.smuks.dev']
  }
};

export default config;
