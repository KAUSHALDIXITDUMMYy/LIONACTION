import { Router, Request, Response, NextFunction } from 'express'
import { oddsService } from '../services/odds.service'
import { logger } from '../utils/logger'
import { SPORTS } from '../config/constants'

const router = Router()

// Valid sport keys from constants
const VALID_SPORTS = Object.values(SPORTS).map((s) => s.key)

/**
 * Validates sport parameter
 */
function validateSport(sport: string | undefined): string {
  if (!sport || typeof sport !== 'string') {
    return 'americanfootball_nfl' // Default
  }

  // Sanitize: remove any potential injection attempts
  const sanitized = sport.trim().toLowerCase()

  // Validate against known sports
  if (VALID_SPORTS.includes(sanitized)) {
    return sanitized
  }

  // If not in our list but looks valid (alphanumeric and underscores), allow it
  // This allows flexibility for future sports or API changes
  if (/^[a-z0-9_]+$/.test(sanitized)) {
    return sanitized
  }

  // Invalid format, return default
  logger.warn('Invalid sport parameter', { sport, sanitized })
  return 'americanfootball_nfl'
}

router.get('/api/odds', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sport = validateSport(req.query.sport as string | undefined)
    const requestId = (req as any).requestId || 'unknown'

    logger.info('Odds API request', {
      requestId,
      sport,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })

    // Set timeout for the request (30 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000)
    })

    const data = await Promise.race([
      oddsService.getOdds(sport),
      timeoutPromise,
    ]) as any

    res.json({ data })
  } catch (error) {
    // Pass to error middleware
    next(error)
  }
})

export default router

