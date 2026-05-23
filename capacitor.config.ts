import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexa.promptagent',
  appName: 'NEXA Prompt Agent',
  webDir: 'dist',
  // Point to your live Vercel URL so the app loads remotely
  // Replace with your actual Vercel domain after deploying
  server: {
    url: 'https://YOUR_VERCEL_DOMAIN.vercel.app',
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: 'nexa-release.keystore',
      keystoreAlias: 'nexa',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f1117',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0f1117',
    },
  },
};

export default config;
