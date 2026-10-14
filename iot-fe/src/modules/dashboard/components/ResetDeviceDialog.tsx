'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
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

const TTL_MINUTES = 120

export default function ResetDeviceDialog({ deviceId, deviceName }: { deviceId: string; deviceName: string }) {
  const [open, setOpen] = useState(false)
  const [createCommand, { isLoading }] = useCreateCommandMutation()

  const handleConfirm = async () => {
    try {
      await createCommand({ deviceId, type: 'RESTART', ttlMinutes: TTL_MINUTES }).unwrap()
      toast.success('Perintah reset diantrekan. Dijalankan saat alat bangun berikutnya.')
      setOpen(false)
    } catch {
      toast.error('Gagal mengantrekan perintah reset.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 h-10 rounded-xl gap-2 cursor-pointer">
            <RotateCcw className="w-4 h-4" />
            Reset Perangkat
          </Button>
        }
      />
      <DialogContent className="w-[95vw] sm:max-w-md font-sans bg-white rounded-2xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">Reset {deviceName}?</DialogTitle>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed">
            Perintah disimpan di server dan dijalankan saat alat bangun berikutnya (15-60 menit). Jika alat tidak
            terhubung dalam {TTL_MINUTES} menit, perintah kedaluwarsa dan tidak dijalankan. Reset tidak bisa
            menghidupkan alat yang sedang mati.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs px-5 h-9 rounded-xl cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-5 h-9 rounded-xl cursor-pointer"
          >
            {isLoading ? 'Mengantrekan...' : 'Ya, Antrekan Reset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
