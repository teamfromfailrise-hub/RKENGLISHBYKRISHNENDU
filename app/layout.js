import './globals.css';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';
import InstallPrompt from '../components/InstallPrompt';

export const metadata = {
  title: 'RK English',
  description: 'Every writing, always at hand — by Krishnendu',
  manifest: '/manifest.json',
  applicationName: 'RK English',
  appleWebApp: {
    capable: true,
    title: 'RK English',
    statusBarStyle: 'default'
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: '/icons/apple-touch-icon.png',
    shortcut: '/favicon.ico'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1F3A5F'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,500&family=Karla:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
