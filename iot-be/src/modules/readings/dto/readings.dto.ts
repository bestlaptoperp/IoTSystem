import { z } from 'zod'

export const QueryReadingsSchema = z.object({
  deviceId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(500),
  bucket: z.enum(['raw', 'hour', 'day']).default('raw'),
})

export type QueryReadingsDTO = z.infer<typeof QueryReadingsSchema>
