export type CommandType = 'RESTART' | 'SET_SLEEP' | 'UPDATE_WIFI'
export type CommandStatus = 'PENDING' | 'DELIVERED' | 'EXPIRED' | 'CANCELLED'

export interface Command {
  id: string
  deviceId: string
  type: CommandType
  payload?: Record<string, unknown> | null
  status: CommandStatus
  expiresAt: string
  createdAt: string
  deliveredAt: string | null
}

export interface CreateCommandPayload {
  deviceId: string
  type: CommandType
  sleepS?: number
  ssid?: string
  pass?: string
  ttlMinutes?: number
}
