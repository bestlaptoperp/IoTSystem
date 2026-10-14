import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { Send } from '@/utils/response.util'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return Send.error(res, 'Validasi gagal', 400, err.issues)
  }

  // Error dari body-parser (JSON rusak, payload terlalu besar, dll.)
  const status = (err as { status?: number })?.status
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return Send.error(res, 'Permintaan tidak valid', status)
  }

  console.error(err)
  return Send.error(res, 'Terjadi kesalahan pada server', 500)
}
