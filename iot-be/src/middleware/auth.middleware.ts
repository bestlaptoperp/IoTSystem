import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '@/config/env'
import { Send } from '@/utils/response.util'

type Role = 'ADMIN' | 'VIEWER'

export class AuthMiddleware {
  static authenticate(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.token
    if (!token) return Send.error(res, 'Tidak terautentikasi', 401)

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: Role }
      req.user = { id: payload.sub, role: payload.role }
      next()
    } catch {
      return Send.error(res, 'Sesi tidak valid atau kedaluwarsa', 401)
    }
  }

  static requireRole(...roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return Send.error(res, 'Akses ditolak', 403)
      }
      next()
    }
  }
}
