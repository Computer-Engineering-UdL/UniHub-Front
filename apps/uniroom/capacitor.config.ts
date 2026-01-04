import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuorg.uniroom',
  appName: 'UniHub',
  webDir: 'www',
  server: {
    allowNavigation: ['api.unihub.smuks.dev']
  }
};

export default config;
