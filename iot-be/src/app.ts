import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from '@/config/env'
import { errorHandler } from '@/middleware/error.middleware'
import authModule from '@/modules/auth/auth.module'
import devicesModule from '@/modules/devices/devices.module'
import ingestModule from '@/modules/ingest/ingest.module'
import readingsModule from '@/modules/readings/readings.module'
import statsModule from '@/modules/stats/stats.module'
import commandsModule from '@/modules/commands/commands.module'

const app = express()

app.set('trust proxy', 1) // Di belakang Caddy: rate limit membaca IP asli
app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authModule)
app.use('/api/devices', devicesModule)
app.use('/api/ingest', ingestModule)
app.use('/api/readings', readingsModule)
app.use('/api/stats', statsModule)
app.use('/api/commands', commandsModule)

app.use(errorHandler) // Selalu paling akhir

export default app
