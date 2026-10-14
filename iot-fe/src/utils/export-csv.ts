import type { Reading } from '@/types/reading'

export function exportReadingsToSimpleCsv(readings: Reading[], deviceCode: string = 'esp32c3-01'): boolean {
  if (readings.length === 0) return false

  // Format kolom simpel persis seperti spreadsheet referensi
  const headers = [
    'Time',
    'Voltage_VCap (V)',
    'Prediction_Status_ARIMA',
    'Reset_Reason',
    'Active_Duration (s)',
    'Wi-Fi_SSID',
  ]

  // Urutkan kronologis dari waktu paling awal ke paling baru
  const sorted = [...readings].sort(
    (a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime(),
  )

  const rows = sorted.map((r) => {
    const d = new Date(r.receivedAt)
    // Format tanggal DD/MM/YYYY HH:mm:ss sesuai spreadsheet
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    const secs = String(d.getSeconds()).padStart(2, '0')
    const timeStr = `${day}/${month}/${year} ${hours}:${mins}:${secs}`

    // Format status ARIMA persis: "is Critical (60 min) | Pred: 3.97V"
    const statusCap = r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase() : 'Safe'
    const sleepMin = r.sleepS != null ? Math.round(r.sleepS / 60) : 15
    const predV = r.predictedV != null ? r.predictedV.toFixed(2) : r.vcap.toFixed(2)
    const arimaText = `is ${statusCap} (${sleepMin} min) | Pred: ${predV}V`

    const vcapStr = r.vcap.toFixed(2)
    const resetReason = r.resetReason ?? '-'
    const activeSec = r.activeMs != null ? (r.activeMs / 1000).toFixed(1) : '-'
    const ssid = r.wifiSsid ?? ''

    return [
      `"${timeStr}"`,
      vcapStr,
      `"${arimaText}"`,
      `"${resetReason}"`,
      activeSec,
      `"${ssid}"`,
    ].join(',')
  })

  // Baris pertama "sep=," memastikan Microsoft Excel otomatis memecah koma menjadi kolom terpisah
  // Didahului UTF-8 BOM agar kompatibel dengan Excel di Windows/Mac dan Google Sheets
  const csvContent = '\uFEFFsep=,\r\n' + [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const nowWib = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
  const filename = `telemetri_${deviceCode}_${nowWib}.csv`

  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return true
}
