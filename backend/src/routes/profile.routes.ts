import { Router, Request, Response, NextFunction } from 'express'
import { userProfileService } from '../services/user-profile.service'
import { authMiddleware } from '../middleware/auth.middleware'
import { logger } from '../utils/logger'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

/**
 * GET /api/profile
 * Get user profile
 */
router.get('/api/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId
    const profile = await userProfileService.getOrCreateProfile(userId)

    res.json({ data: profile })
  } catch (error) {
    next(error)
  }
})

/**
 * PATCH /api/profile
 * Update user profile
 */
router.patch('/api/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId
    const { telegram_id, display_name } = req.body

    const updates: any = {}
    if (telegram_id !== undefined) updates.telegram_id = telegram_id || null
    if (display_name !== undefined) updates.display_name = display_name || null

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        error: 'Bad request',
        message: 'No fields to update',
      })
      return
    }

    const profile = await userProfileService.updateProfile(userId, updates)

    res.json({ data: profile })
  } catch (error) {
    next(error)
  }
})

export default router
