import { StoreProvider } from '@/components/providers/StoreProvider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IoT Supercap Monitoring',
  description: 'Monitoring IoT Batteryless Supercapacitor ESP32-C3',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="font-sans bg-slate-50 text-slate-800 antialiased min-h-screen">
        <StoreProvider>
          {children}
          <Toaster richColors position="top-right" />
        </StoreProvider>
      </body>
    </html>
  )
}
