import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

// In-memory store for rate limiting
// Key: IP address, Value: timestamp of last request
const rateLimitStore = new Map<string, number>()

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000 // 5 minutes
  
  for (const [ip, timestamp] of rateLimitStore.entries()) {
    if (now - timestamp > maxAge) {
      rateLimitStore.delete(ip)
    }
  }
}, 5 * 60 * 1000)

/**
 * Rate limiting middleware for odds API
 * Prevents requests within 60 seconds from the same IP
 */
export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const lastRequestTime = rateLimitStore.get(ip)
  const RATE_LIMIT_WINDOW = 60 * 1000 // 60 seconds in milliseconds

  if (lastRequestTime) {
    const timeSinceLastRequest = now - lastRequestTime
    const timeRemaining = Math.ceil((RATE_LIMIT_WINDOW - timeSinceLastRequest) / 1000)

    if (timeSinceLastRequest < RATE_LIMIT_WINDOW) {
      logger.warn('Rate limit exceeded', {
        ip,
        timeRemaining,
        lastRequestTime: new Date(lastRequestTime).toISOString(),
      })

      res.status(429).json({
        error: 'Too many requests',
        message: `Please wait ${timeRemaining} seconds before refreshing again.`,
        retryAfter: timeRemaining,
      })
      return
    }
  }

  // Update last request time
  rateLimitStore.set(ip, now)

  // Add retry-after header for client reference
  res.setHeader('Retry-After', '60')

  next()
}


