import { NextFunction, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/config/database'
import { env } from '@/config/env'
import { Send } from '@/utils/response.util'
import { LoginSchema } from '../dto/auth.dto'

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = LoginSchema.parse(req.body)
      const user = await prisma.user.findUnique({ where: { email } })
      const ok = user ? await bcrypt.compare(password, user.passwordHash) : false
      if (!user || !ok) return Send.error(res, 'Email atau password salah', 401)

      const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '7d' })
      res.cookie('token', token, {
        httpOnly: true,
        secure: env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE : env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })
      return Send.success(res, { id: user.id, email: user.email, role: user.role })
    } catch (error) {
      next(error)
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, email: true, role: true },
      })
      if (!user) return Send.error(res, 'User tidak ditemukan', 401)
      return Send.success(res, user)
    } catch (error) {
      next(error)
    }
  }

  static logout(_req: Request, res: Response) {
    res.clearCookie('token', { path: '/' })
    return Send.success(res, null, 200, 'Berhasil keluar')
  }
}
