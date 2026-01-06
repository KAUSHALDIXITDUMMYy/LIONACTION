import { Router, Request, Response, NextFunction } from 'express'
import { oddsService } from '../services/odds.service'
import { snapshotService } from '../services/snapshot.service'
import { logger } from '../utils/logger'
import { SPORTS } from '../config/constants'
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware'

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

// Endpoint to fetch from database (no rate limit) - used when changing sports
router.get('/api/odds/db', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sport = validateSport(req.query.sport as string | undefined)

    logger.info('Odds DB request', {
      sport,
      ip: req.ip,
    })

    const data = await snapshotService.getLatestOddsFromDB(sport)

    res.json({ data })
  } catch (error) {
    next(error)
  }
})

// Endpoint to fetch from API (with rate limit) - used for refresh button
router.get('/api/odds', rateLimitMiddleware, async (req: Request, res: Response, next: NextFunction) => {
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

// Endpoint to fetch historical odds for a specific game
router.get('/api/odds/historical', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gameId = req.query.game_id as string | undefined
    const marketKey = req.query.market as string | undefined

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'game_id parameter is required',
      })
    }

    logger.info('Historical odds request', {
      game_id: gameId,
      market: marketKey,
      ip: req.ip,
    })

    const historicalData = await snapshotService.getHistoricalOdds(gameId, marketKey)

    res.json({ data: historicalData })
  } catch (error) {
    next(error)
  }
})

// Debug endpoint to check snapshot count for a game
router.get('/api/odds/debug/snapshots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gameId = req.query.game_id as string | undefined

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'game_id parameter is required',
      })
    }

    const { query } = await import('../services/database.service')
    
    const result = await query<{
      count: string
      snapshot_type: string
      min_timestamp: Date
      max_timestamp: Date
    }>(
      `SELECT 
        COUNT(*)::text as count,
        snapshot_type,
        MIN(snapshot_timestamp) as min_timestamp,
        MAX(snapshot_timestamp) as max_timestamp
      FROM odds_snapshots
      WHERE game_id = $1
      GROUP BY snapshot_type
      ORDER BY snapshot_type`,
      [gameId]
    )

    const total = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM odds_snapshots
       WHERE game_id = $1`,
      [gameId]
    )

    res.json({
      game_id: gameId,
      total_snapshots: parseInt(total[0]?.count || '0'),
      by_type: result.map(r => ({
        type: r.snapshot_type,
        count: parseInt(r.count),
        first: r.min_timestamp,
        last: r.max_timestamp,
      })),
    })
  } catch (error) {
    next(error)
  }
})

export default router

