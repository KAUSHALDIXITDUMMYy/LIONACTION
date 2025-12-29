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
