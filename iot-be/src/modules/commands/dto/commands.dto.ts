import { z } from 'zod'

export const CreateCommandSchema = z
  .object({
    deviceId: z.string().uuid(),
    type: z.enum(['RESTART', 'SET_SLEEP', 'UPDATE_WIFI']),
    sleepS: z.number().int().min(60).max(86400).optional(),
    ssid: z.string().min(1).max(64).optional(),
    pass: z.string().max(64).optional(),
    ttlMinutes: z.number().int().min(5).max(1440).default(120),
  })
  .refine((v) => v.type !== 'SET_SLEEP' || v.sleepS !== undefined, {
    message: 'sleepS wajib diisi untuk SET_SLEEP',
    path: ['sleepS'],
  })
  .refine((v) => v.type !== 'UPDATE_WIFI' || (v.ssid !== undefined && v.ssid.trim().length > 0), {
    message: 'ssid wajib diisi untuk UPDATE_WIFI',
    path: ['ssid'],
  })

export type CreateCommandDTO = z.infer<typeof CreateCommandSchema>
