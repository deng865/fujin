import type { CapacitorConfig } from '@capacitor/cli';

const liveReload = process.env.CAPACITOR_LIVE_RELOAD === 'true';

const config: CapacitorConfig = {
  appId: 'life.fujin.app',
  appName: '华人街坊',
  webDir: 'dist',
  ...(liveReload ? {
    server: {
      url: 'https://68d10a17-5eb0-4e17-b993-f98b89488e8b.lovableproject.com?forceHideBadge=true',
      cleartext: true,
    },
  } : {}),
  plugins: {
    NativePurchases: {
      autoFinishTransactions: false,
    },
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
