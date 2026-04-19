import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'life.fujin.app',
  appName: 'fujin',
  webDir: 'dist',
  server: {
    url: 'https://68d10a17-5eb0-4e17-b993-f98b89488e8b.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
