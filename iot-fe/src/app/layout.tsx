import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { StoreProvider } from '@/components/providers/StoreProvider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'IoT Supercap Monitoring',
  description: 'Monitoring IoT Batteryless Supercapacitor ESP32-C3',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans bg-slate-50 text-slate-800 antialiased min-h-screen">
        <StoreProvider>
          {children}
          <Toaster richColors position="top-right" />
        </StoreProvider>
      </body>
    </html>
  )
}
