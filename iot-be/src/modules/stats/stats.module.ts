import { Router } from 'express'
import { StatsController } from './controller/stats.controller'
import { AuthMiddleware } from '@/middleware/auth.middleware'

const router = Router()
router.use(AuthMiddleware.authenticate)
router.get('/status', StatsController.status)
router.get('/summary', StatsController.summary)

export default router
