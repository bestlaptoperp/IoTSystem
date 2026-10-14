import rateLimit from 'express-rate-limit'

export const ingestLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30, // Alat mengirim tiap 15-60 menit, jadi ini sangat longgar
  standardHeaders: true,
  legacyHeaders: false,
})

export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
})
