import { Router } from 'express'
import { CommandsController } from './controller/commands.controller'
import { AuthMiddleware } from '@/middleware/auth.middleware'

const router = Router()
router.use(AuthMiddleware.authenticate)
router.get('/', CommandsController.getAll)
router.post('/', AuthMiddleware.requireRole('ADMIN'), CommandsController.create)
router.patch('/:id/cancel', AuthMiddleware.requireRole('ADMIN'), CommandsController.cancel)

export default router
