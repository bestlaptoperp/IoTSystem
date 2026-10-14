import { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '@/config/database'
import { Send } from '@/utils/response.util'
import { QueryStatsSchema } from '../dto/stats.dto'

function buildWhere(q: { deviceId?: string; from?: Date; to?: Date }): Prisma.ReadingWhereInput {
  return {
    ...(q.deviceId ? { deviceId: q.deviceId } : {}),
    ...((q.from || q.to) && {
      receivedAt: { ...(q.from && { gte: q.from }), ...(q.to && { lte: q.to }) },
    }),
  }
}

export class StatsController {
  // Data diagram lingkaran: proporsi Safe / Medium / Critical
  static async status(req: Request, res: Response, next: NextFunction) {
    try {
      const where = buildWhere(QueryStatsSchema.parse(req.query))
      const rows = await prisma.reading.groupBy({ by: ['status'], where, _count: { _all: true } })
      return Send.success(res, rows.map((r) => ({ status: r.status, count: r._count._all })))
    } catch (error) {
      next(error)
    }
  }

  // Ringkasan untuk kartu statistik dan metrik penelitian
  static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const where = buildWhere(QueryStatsSchema.parse(req.query))
      const agg = await prisma.reading.aggregate({
        where,
        _count: { _all: true },
        _avg: { vcap: true, wifiMs: true, activeMs: true },
        _min: { vcap: true },
        _max: { vcap: true },
      })
      return Send.success(res, {
        count: agg._count._all,
        avgVcap: agg._avg.vcap,
        minVcap: agg._min.vcap,
        maxVcap: agg._max.vcap,
        avgWifiMs: agg._avg.wifiMs,
        avgActiveMs: agg._avg.activeMs,
      })
    } catch (error) {
      next(error)
    }
  }
}
