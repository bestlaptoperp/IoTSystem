export type PowerStatus = 'SAFE' | 'MEDIUM' | 'CRITICAL'

export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
}

export interface Reading {
  id: number
  deviceId: string
  receivedAt: string
  vcap: number
  status: PowerStatus
  predictedV: number | null
  sleepS: number | null
  resetReason: string | null
  bootCount: number | null
  wifiMs: number | null
  activeMs: number | null
  wifiSsid?: string | null
}

export interface ReadingBucket {
  t: string
  avgVcap: number
  minVcap: number
  maxVcap: number
  n: number
}

export interface ReadingQuery {
  deviceId?: string
  from?: string
  to?: string
  limit?: number
  bucket?: 'raw' | 'hour' | 'day'
}

export interface StatusStat {
  status: PowerStatus
  count: number
}

export interface SummaryStat {
  count: number
  avgVcap: number | null
  minVcap: number | null
  maxVcap: number | null
  avgWifiMs: number | null
  avgActiveMs: number | null
}
