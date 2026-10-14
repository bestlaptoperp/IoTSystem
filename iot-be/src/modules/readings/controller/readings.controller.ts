import { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '@/config/database'
import { Send } from '@/utils/response.util'
import { QueryReadingsSchema } from '../dto/readings.dto'

export class ReadingsController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { deviceId, from, to, limit, bucket } = QueryReadingsSchema.parse(req.query)

      if (bucket === 'raw') {
        const where: Prisma.ReadingWhereInput = {
          ...(deviceId ? { deviceId } : {}),
          ...((from || to) && {
            receivedAt: { ...(from && { gte: from }), ...(to && { lte: to }) },
          }),
        }
        // Ambil N data TERBARU, lalu urutkan naik untuk grafik
        const rows = await prisma.reading.findMany({
          where,
          orderBy: { receivedAt: 'desc' },
          take: limit,
        })
        return Send.success(res, rows.reverse())
      }

      // Agregasi per jam / per hari, dikelompokkan dalam WIB (UTC+7)
      const end = to ?? new Date()
      const start = from ?? new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
      const unit = bucket === 'day' ? Prisma.sql`'day'` : Prisma.sql`'hour'`
      const deviceFilter = deviceId ? Prisma.sql`AND "deviceId" = ${deviceId}` : Prisma.empty

      const rows = await prisma.$queryRaw<
        Array<{ t: Date; avgVcap: number; minVcap: number; maxVcap: number; n: number }>
      >(Prisma.sql`
        SELECT date_trunc(${unit}, "receivedAt" + interval '7 hours') - interval '7 hours' AS t,
               AVG(vcap)::float8 AS "avgVcap",
               MIN(vcap)::float8 AS "minVcap",
               MAX(vcap)::float8 AS "maxVcap",
               COUNT(*)::int AS n
        FROM "Reading"
        WHERE "receivedAt" BETWEEN ${start} AND ${end} ${deviceFilter}
        GROUP BY 1
        ORDER BY 1
      `)
      return Send.success(res, rows)
    } catch (error) {
      next(error)
    }
  }
}
