import { Router, Request, Response } from 'express'
import { oddsService } from '../services/odds.service'
import { logger } from '../utils/logger'

const router = Router()

router.get('/api/odds', async (req: Request, res: Response) => {
  try {
    const sport = (req.query.sport as string) || 'americanfootball_nfl'

    logger.info('Odds API request', { sport, ip: req.ip })

    const data = await oddsService.getOdds(sport)

    res.json({ data })
  } catch (error) {
    logger.error('Failed to fetch odds', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sport: req.query.sport,
    })

    res.status(500).json({
      error: 'Failed to fetch odds',
    })
  }
})

export default router

