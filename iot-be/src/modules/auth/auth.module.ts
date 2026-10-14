import { Router } from 'express'
import { AuthController } from './controller/auth.controller'
import { AuthMiddleware } from '@/middleware/auth.middleware'
import { loginLimiter } from '@/middleware/rate-limit'

const router = Router()
router.post('/login', loginLimiter, AuthController.login)
router.get('/me', AuthMiddleware.authenticate, AuthController.me)
router.post('/logout', AuthController.logout)

export default router
