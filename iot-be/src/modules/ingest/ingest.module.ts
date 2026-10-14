import { Router } from 'express'
import { IngestController } from './controller/ingest.controller'
import { DeviceMiddleware } from '@/middleware/device.middleware'
import { ingestLimiter } from '@/middleware/rate-limit'

const router = Router()
router.post('/', ingestLimiter, DeviceMiddleware.authenticate, IngestController.receive)

export default router
