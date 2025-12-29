import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * Middleware to extract and verify Firebase user ID from request
 * Expects user ID in Authorization header or request body
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Try to get user ID from Authorization header (Bearer token or user ID)
    const authHeader = req.headers.authorization
    let userId: string | null = null

    if (authHeader) {
      // Format: "Bearer <firebase_token>" or "Bearer <user_id>"
      const parts = authHeader.split(' ')
      if (parts.length === 2 && parts[0] === 'Bearer') {
        // For now, we'll accept the user ID directly
        // In production, you'd verify the Firebase token here
        userId = parts[1]
      }
    }

    // Fallback: try to get from request body
    if (!userId && (req.body as any)?.user_id) {
      userId = (req.body as any).user_id
    }

    // Fallback: try to get from query params (for GET requests)
    if (!userId && req.query.user_id) {
      userId = req.query.user_id as string
    }

    if (!userId || userId.trim() === '') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID is required. Please provide Authorization header or user_id.',
      })
      return
    }

    // Attach user ID to request object
    ;(req as any).userId = userId.trim()

    next()
  } catch (error) {
    logger.error('Auth middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    })
  }
}
