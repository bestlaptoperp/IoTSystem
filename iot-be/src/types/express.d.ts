declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: 'ADMIN' | 'VIEWER' }
      device?: { id: string; code: string }
    }
  }
}

export {}
