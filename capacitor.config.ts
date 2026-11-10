import type { CapacitorConfig } from '@capacitor/cli'

/**
 * iOS / Android app shell for FinanceMe.
 *
 * The app loads the deployed website, so phone and web run the same code and
 * read/write the same account data on the server. Every web deploy updates
 * the app without a store release (store releases are only needed for native
 * changes: plugins, icons, permissions).
 *
 * CAP_SERVER_URL overrides the site for testing, e.g. a local dev server:
 *   Android emulator: CAP_SERVER_URL=http://10.0.2.2:3000 npx cap sync android
 */
const serverUrl = process.env.CAP_SERVER_URL?.trim() || 'https://finance-app-red-one.vercel.app'
const isHttp = serverUrl.startsWith('http://')

const config: CapacitorConfig = {
  // Reverse-domain id; cannot change after the first store release.
  appId: 'com.financeme.app',
  appName: 'FinanceMe',
  // Local fallback pages bundled into the app (shown when offline).
  webDir: 'mobile/www',
  backgroundColor: '#0a0614',
  appendUserAgent: 'FinanceMeApp',
  server: {
    // The site's root redirects to /dashboard.
    url: serverUrl.replace(/\/$/, ''),
    cleartext: isHttp,
    errorPath: 'offline.html',
  },
  ios: {
    contentInset: 'never',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#0a0614',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
    },
  },
}

export default config
