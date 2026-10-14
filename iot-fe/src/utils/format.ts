const TZ = 'Asia/Jakarta'

const fmtDateTime = new Intl.DateTimeFormat('id-ID', {
  timeZone: TZ,
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const fmtDate = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })

export const formatDateTime = (v: string | number | Date) => fmtDateTime.format(new Date(v))
export const formatDateOnly = (v: string | number | Date) => fmtDate.format(new Date(v))
export const formatTimeOnly = (v: string | number | Date) => fmtTime.format(new Date(v))

export const formatVolt = (v: number | null | undefined) => (v == null ? '-' : `${v.toFixed(2)} V`)

export const formatMs = (ms: number | null | undefined) => {
  if (ms == null) return '-'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} dtk` : `${Math.round(ms)} ms`
}
