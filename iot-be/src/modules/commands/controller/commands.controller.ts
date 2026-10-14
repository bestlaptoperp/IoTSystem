import { NextFunction, Request, Response } from 'express'
import { prisma } from '@/config/database'
import { Send } from '@/utils/response.util'
import { CreateCommandSchema } from '../dto/commands.dto'

export class CommandsController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined

      await prisma.command.updateMany({
        where: { status: 'PENDING', expiresAt: { lte: new Date() } },
        data: { status: 'EXPIRED' },
      })

      const rows = await prisma.command.findMany({
        where: deviceId ? { deviceId } : {},
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return Send.success(res, rows)
    } catch (error) {
      next(error)
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateCommandSchema.parse(req.body)

      const device = await prisma.device.findUnique({ where: { id: dto.deviceId }, select: { id: true } })
      if (!device) return Send.error(res, 'Perangkat tidak ditemukan', 404)

      const expiresAt = new Date(Date.now() + dto.ttlMinutes * 60_000)

      const command = await prisma.$transaction(async (tx) => {
        // Hanya satu perintah PENDING per tipe per perangkat
        await tx.command.updateMany({
          where: { deviceId: dto.deviceId, type: dto.type, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        })
        return tx.command.create({
          data: {
            deviceId: dto.deviceId,
            type: dto.type,
            payload: dto.sleepS
              ? { sleepS: dto.sleepS }
              : dto.ssid
              ? { ssid: dto.ssid.trim(), pass: dto.pass ?? '' }
              : undefined,
            expiresAt,
            createdById: req.user!.id,
          },
        })
      })

      return Send.success(res, command, 201, 'Perintah diantrekan, dijalankan saat alat bangun berikutnya')
    } catch (error) {
      next(error)
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id)
      const result = await prisma.command.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
      if (result.count === 0) return Send.error(res, 'Perintah tidak ditemukan atau sudah diproses', 404)
      return Send.success(res, null, 200, 'Perintah dibatalkan')
    } catch (error) {
      next(error)
    }
  }
}
