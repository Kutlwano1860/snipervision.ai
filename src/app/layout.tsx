import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SniperVision AI ',
  description: 'Institutional-Grade Analysis From a ScreenshotUpload any chart screenshot. Get AI-powered technical analysis, entry signals, lot sizing, and a complete trade plan in seconds.',
  keywords: 'trading, AI analysis, forex, crypto, chart analysis, trade signals',
  icons: {
    icon: '/SniperVision.Ai icon.png',
    apple: '/SniperVision.Ai icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Restore theme from localStorage before first paint — prevents flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var s = localStorage.getItem('tradevision-store');
            if (s) {
              var t = JSON.parse(s);
              var theme = t?.state?.appearance?.theme;
              if (theme) document.documentElement.setAttribute('data-theme', theme);
            }
          } catch(e) {}
        `}} />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              color: '#f0f0f0',
              border: '1px solid rgba(255,255,255,0.13)',
              borderRadius: '10px',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}