import type { Reading } from './reading'

export interface Device {
  id: string
  code: string
  name: string
  transport: 'WIFI' | 'LORA'
  wifiSsid: string | null
  lastSeenAt: string | null
  latestReading: Reading | null
}
