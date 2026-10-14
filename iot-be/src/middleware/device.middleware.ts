import crypto from 'node:crypto'
import { NextFunction, Request, Response } from 'express'
import { prisma } from '@/config/database'
import { Send } from '@/utils/response.util'

export class DeviceMiddleware {
  static async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const key = req.header('x-device-key')
      const code = typeof req.body?.device_id === 'string' ? req.body.device_id : undefined
      if (!key || !code) return Send.error(res, 'Unauthorized', 401)

      const device = await prisma.device.findUnique({ where: { code } })

      // Bandingkan hash dengan waktu konstan. Kunci perangkat acak 32 byte,
      // jadi SHA-256 sudah cukup dan jauh lebih cepat daripada bcrypt.
      const incoming = crypto.createHash('sha256').update(key).digest()
      const stored = device ? Buffer.from(device.keyHash, 'hex') : Buffer.alloc(32)
      const valid = incoming.length === stored.length && crypto.timingSafeEqual(incoming, stored)

      if (!device || !valid) return Send.error(res, 'Unauthorized', 401)

      req.device = { id: device.id, code: device.code }
      next()
    } catch (error) {
      next(error)
    }
  }
}
