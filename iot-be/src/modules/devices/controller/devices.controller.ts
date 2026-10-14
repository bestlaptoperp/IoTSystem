import { NextFunction, Request, Response } from 'express'
import { prisma } from '@/config/database'
import { Send } from '@/utils/response.util'

export class DevicesController {
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const devices = await prisma.device.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          transport: true,
          wifiSsid: true,
          lastSeenAt: true,
          readings: { orderBy: { receivedAt: 'desc' }, take: 1 },
        },
        orderBy: { code: 'asc' },
      })

      const data = devices.map(({ readings, ...d }) => ({ ...d, latestReading: readings[0] ?? null }))
      return Send.success(res, data)
    } catch (error) {
      next(error)
    }
  }
}
