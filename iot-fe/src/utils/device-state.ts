export type DeviceActivityStatus = 'AWAKE' | 'SLEEPING' | 'OVERDUE' | 'OFFLINE'

export interface DeviceStateResult {
  status: DeviceActivityStatus
  label: string
  detail: string
  tone: 'emerald' | 'sky' | 'amber' | 'slate'
  isAwake: boolean
  remainingSleepSeconds?: number
}

// Alat batteryless ESP32-C3: Sebagian besar waktu tidur, bangun hanya ~1-3 detik.
export function deriveDeviceState(
  lastSeenAt: string | null,
  lastSleepS: number | null,
  now?: number,
): DeviceStateResult {
  if (!lastSeenAt) {
    return {
      status: 'OFFLINE',
      label: 'Belum Terhubung',
      detail: 'Belum pernah mengirim data ke server',
      tone: 'slate',
      isAwake: false,
    }
  }

  const current = now ?? Date.now()
  const ageMs = current - new Date(lastSeenAt).getTime()
  const ageSec = Math.floor(ageMs / 1000)
  const plannedSleepS = lastSleepS ?? 1800 // default 30 menit jika null

  // 1. Sedang Bangun: jika data baru masuk dalam < 45 detik
  if (ageSec < 45) {
    return {
      status: 'AWAKE',
      label: 'Sedang Bangun',
      detail: `Aktif mengirim data (${ageSec} dtk lalu)`,
      tone: 'emerald',
      isAwake: true,
    }
  }

  // 2. Sedang Tidur (Deep Sleep): belum melewati jadwal tidur + toleransi 2 menit
  const gracePeriodSec = 120
  if (ageSec <= plannedSleepS + gracePeriodSec) {
    const remainingSec = Math.max(0, plannedSleepS - ageSec)
    const remainingMin = Math.ceil(remainingSec / 60)
    return {
      status: 'SLEEPING',
      label: 'Sedang Tidur (Deep Sleep)',
      detail:
        remainingMin > 0
          ? `Perkiraan bangun ~${remainingMin} mnt lagi (Jadwal: ${Math.round(plannedSleepS / 60)} mnt)`
          : 'Sedang bersiap bangun...',
      tone: 'sky',
      isAwake: false,
      remainingSleepSeconds: remainingSec,
    }
  }

  // 3. Melewati jadwal tidur (kemungkinan skip Wi-Fi karena Vcap < 3.8V saat mendung)
  if (ageSec <= plannedSleepS * 2 + 3600) {
    const overdueMin = Math.round((ageSec - plannedSleepS) / 60)
    return {
      status: 'OVERDUE',
      label: 'Tidur Hemat Daya',
      detail: `Terlambat ${overdueMin} mnt dari jadwal (kemungkinan tegangan rendah / skip Wi-Fi)`,
      tone: 'amber',
      isAwake: false,
    }
  }

  // 4. Offline / Hibernasi malam hari (daya habis)
  return {
    status: 'OFFLINE',
    label: 'Hibernasi / Mati Daya',
    detail: 'Alat offline (hibernasi malam hari atau daya supercap habis)',
    tone: 'slate',
    isAwake: false,
  }
}
