import { z } from 'zod'

export const QueryStatsSchema = z.object({
  deviceId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export type QueryStatsDTO = z.infer<typeof QueryStatsSchema>
