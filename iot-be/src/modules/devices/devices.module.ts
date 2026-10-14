import { Router } from 'express'
import { DevicesController } from './controller/devices.controller'
import { AuthMiddleware } from '@/middleware/auth.middleware'

const router = Router()
router.use(AuthMiddleware.authenticate)
router.get('/', DevicesController.getAll)

export default router
