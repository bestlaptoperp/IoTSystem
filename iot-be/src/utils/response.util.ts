import { Response } from 'express'

export class Send {
  static success<T>(res: Response, data: T, status = 200, message?: string) {
    return res.status(status).json({ success: true, message, data })
  }

  static error(res: Response, message: string, status = 400, errors?: unknown) {
    return res.status(status).json({ success: false, message, errors })
  }
}
