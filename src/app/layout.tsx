import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TradeVision AI — Institutional-Grade Analysis From a Screenshot',
  description: 'Upload any chart screenshot. Get AI-powered technical analysis, entry signals, lot sizing, and a complete trade plan in seconds.',
  keywords: 'trading, AI analysis, forex, crypto, chart analysis, trade signals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-[#080808] text-white antialiased`}>
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
