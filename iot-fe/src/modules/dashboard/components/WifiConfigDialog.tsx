'use client'

import { useState } from 'react'
import { Wifi, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useCreateCommandMutation } from '@/services/command'

const TTL_MINUTES = 1440 // 24 jam agar tetap aktif jika alat sleep 60 menit

export default function WifiConfigDialog({
  deviceId,
  deviceName,
  currentSsid,
}: {
  deviceId: string
  deviceName: string
  currentSsid?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [ssid, setSsid] = useState(currentSsid ?? '')
  const [pass, setPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [createCommand, { isLoading }] = useCreateCommandMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ssid.trim()) {
      toast.error('Nama Wi-Fi (SSID) tidak boleh kosong')
      return
    }

    try {
      await createCommand({
        deviceId,
        type: 'UPDATE_WIFI',
        ssid: ssid.trim(),
        pass: pass,
        ttlMinutes: TTL_MINUTES,
      }).unwrap()

      toast.success('Konfigurasi Wi-Fi berhasil diantrekan! ESP32 akan menyimpannya saat bangun berikutnya.')
      setOpen(false)
      setPass('')
    } catch {
      toast.error('Gagal mengantrekan konfigurasi Wi-Fi.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-4 h-10 rounded-xl gap-2 cursor-pointer shadow-sm">
            <Wifi className="w-4 h-4" />
            Atur Wi-Fi
          </Button>
        }
      />
      <DialogContent className="w-[95vw] sm:max-w-md font-sans bg-white rounded-2xl border-none shadow-2xl p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                <Wifi className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Atur Wi-Fi
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Perubahan Wi-Fi disimpan ke antrean server dan akan dititipkan saat ESP32 bangun dan mengirim data
              pada siklus berikutnya.
            </DialogDescription>
          </DialogHeader>

          {currentSsid && (
            <div className="mb-4 p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 flex items-center justify-between">
              <span className="font-medium text-slate-500">Wi-Fi Aktif Saat Ini:</span>
              <span className="font-semibold text-sky-700 font-mono">{currentSsid}</span>
            </div>
          )}

          <div className="space-y-3.5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Wi-Fi Baru (SSID) *
              </label>
              <input
                type="text"
                required
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                placeholder="Contoh: MyHome_WiFi"
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi Baru (Password)
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Kosongkan jika Wi-Fi tanpa kata sandi"
                  className="w-full text-xs font-medium px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-[11px] text-amber-800 leading-relaxed">
              <strong>Proteksi Fallback:</strong> ESP32 akan menyimpan Wi-Fi baru ke memori Flash NVS. Jika Wi-Fi
              baru tidak dapat dihubungi, ESP32 otomatis beralih ke Wi-Fi cadangan (fallback) agar tidak hilang kontak.
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs px-5 h-9 rounded-xl cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-5 h-9 rounded-xl cursor-pointer"
            >
              {isLoading ? 'Mengantrekan...' : 'Simpan & Terapkan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
