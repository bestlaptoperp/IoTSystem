import { Router } from 'express'
import { ReadingsController } from './controller/readings.controller'
import { AuthMiddleware } from '@/middleware/auth.middleware'

const router = Router()
router.use(AuthMiddleware.authenticate)
router.get('/', ReadingsController.getAll)

export default router
