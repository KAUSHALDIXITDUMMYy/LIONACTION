import { Router, Request, Response, NextFunction } from 'express'
import { savedBetsService } from '../services/saved-bets.service'
import { authMiddleware } from '../middleware/auth.middleware'
import { logger } from '../utils/logger'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

/**
 * POST /api/bets
 * Create a new saved bet
 */
router.post('/api/bets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId
    const {
      game_id,
      sport_key,
      bookmaker_key,
      market_key,
      outcome_name,
      locked_price,
      locked_point,
      notes,
    } = req.body

    // Validate required fields
    if (!game_id || !sport_key || !bookmaker_key || !market_key || !outcome_name || locked_price === undefined) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Missing required fields: game_id, sport_key, bookmaker_key, market_key, outcome_name, locked_price',
      })
      return
    }

    const bet = await savedBetsService.createBet({
      user_id: userId,
      game_id,
      sport_key,
      bookmaker_key,
      market_key,
      outcome_name,
      locked_price: parseFloat(locked_price),
      locked_point: locked_point !== undefined ? parseFloat(locked_point) : null,
      notes: notes || null,
    })

    res.status(201).json({ data: bet })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/bets
 * Get all bets for the authenticated user
 */
router.get('/api/bets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId
    const bets = await savedBetsService.getUserBets(userId)

    res.json({ data: bets })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/bets/game/:gameId
 * Get saved bets for a specific game
 */
router.get('/api/bets/game/:gameId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId
    const gameId = req.params.gameId

    if (!gameId) {
      res.status(400).json({
        error: 'Bad request',
        message: 'gameId parameter is required',
      })
      return
    }

    const bets = await savedBetsService.getBetsForGame(userId, gameId)

    res.json({ data: bets })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/bets/stats
 * Get bet statistics for the authenticated user
 */
router.get('/api/bets/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId
    const stats = await savedBetsService.getUserBetStats(userId)

    res.json({ data: stats })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/bets/analytics/debug
 * Debug endpoint to see raw bet data
 */
router.get('/api/bets/analytics/debug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId
    const { query } = await import('../services/database.service')
    
    // Get all bets for this user
    const allBets = await query<{
      id: number
      status: string
      created_at: Date
      sport_key: string
    }>(
      `SELECT id, LOWER(TRIM(status)) as status, created_at, sport_key
       FROM user_saved_bets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    // Get status breakdown
    const statusBreakdown = await query<{
      status: string
      count: string
    }>(
      `SELECT LOWER(TRIM(status)) as status, COUNT(*)::text as count
       FROM user_saved_bets
       WHERE user_id = $1
       GROUP BY LOWER(TRIM(status))`,
      [userId]
    )

    // Get won/lost specifically
    const wonLostBets = await query<{
      id: number
      status: string
    }>(
      `SELECT id, LOWER(TRIM(status)) as status
       FROM user_saved_bets
       WHERE user_id = $1
       AND LOWER(TRIM(status)) IN ('won', 'lost')`,
      [userId]
    )

    res.json({
      user_id: userId,
      total_bets: allBets.length,
      all_bets: allBets,
      status_breakdown: statusBreakdown,
      won_lost_bets: wonLostBets,
      won_lost_count: wonLostBets.length,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/bets/analytics
 * Get analytics data (win rates by week, sport, overall)
 * Query params: startDate (ISO string), endDate (ISO string)
 */
router.get('/api/bets/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

    logger.info('Analytics request', {
      user_id: userId,
      startDate,
      endDate,
    })

    // Validate dates if provided
    if (startDate && isNaN(startDate.getTime())) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Invalid startDate format',
      })
      return
    }
    if (endDate && isNaN(endDate.getTime())) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Invalid endDate format',
      })
      return
    }

    const analytics = await savedBetsService.getUserAnalytics(userId, startDate, endDate)

    logger.info('Analytics response', {
      user_id: userId,
      overall_total: analytics.overall.total,
      overall_wins: analytics.overall.wins,
      overall_losses: analytics.overall.losses,
      weeks_count: analytics.byWeek.length,
      sports_count: analytics.bySport.length,
    })

    res.json({ data: analytics })
  } catch (error) {
    logger.error('Analytics endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    next(error)
  }
})

/**
 * GET /api/bets/:id
 * Get a single bet by ID
 */
router.get('/api/bets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId
    const betId = parseInt(req.params.id, 10)

    if (isNaN(betId)) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Invalid bet ID',
      })
      return
    }

    const bet = await savedBetsService.getBetById(betId, userId)

    if (!bet) {
      res.status(404).json({
        error: 'Not found',
        message: 'Bet not found',
      })
      return
    }

    res.json({ data: bet })
  } catch (error) {
    next(error)
  }
})

/**
 * PATCH /api/bets/:id
 * Update a bet (edit odds, notes, or status)
 */
router.patch('/api/bets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId
    const betId = parseInt(req.params.id, 10)

    if (isNaN(betId)) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Invalid bet ID',
      })
      return
    }

    const { edited_price, edited_point, notes, status } = req.body

    const updates: any = {}
    if (edited_price !== undefined) updates.edited_price = edited_price !== null ? parseFloat(edited_price) : null
    if (edited_point !== undefined) updates.edited_point = edited_point !== null ? parseFloat(edited_point) : null
    if (notes !== undefined) updates.notes = notes
    if (status !== undefined) {
      if (!['pending', 'won', 'lost', 'void'].includes(status)) {
        res.status(400).json({
          error: 'Bad request',
          message: 'Invalid status. Must be: pending, won, lost, or void',
        })
        return
      }
      updates.status = status
    }

    const bet = await savedBetsService.updateBet(betId, userId, updates)

    res.json({ data: bet })
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/bets/:id
 * Delete a bet
 */
router.delete('/api/bets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId
    const betId = parseInt(req.params.id, 10)

    if (isNaN(betId)) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Invalid bet ID',
      })
      return
    }

    await savedBetsService.deleteBet(betId, userId)

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router
