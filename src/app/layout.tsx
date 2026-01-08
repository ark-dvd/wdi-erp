import type { Metadata, Viewport } from 'next'
import { SessionProvider } from 'next-auth/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'WDI ERP',
  description: 'מערכת ERP לניהול פרויקטי בנייה ותשתיות',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WDI ERP',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
