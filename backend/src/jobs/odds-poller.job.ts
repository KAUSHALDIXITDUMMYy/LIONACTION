import cron from 'node-cron'
import { oddsService } from '../services/odds.service'
import { logger } from '../utils/logger'

const POPULAR_SPORTS = [
  'americanfootball_nfl',
  'basketball_nba',
  'baseball_mlb',
]

/**
 * Background job that polls popular sports every 5 minutes
 * to pre-populate the cache
 */
export function startOddsPoller(): void {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Starting odds polling job', { sports: POPULAR_SPORTS })

    for (const sport of POPULAR_SPORTS) {
      try {
        await oddsService.getOdds(sport)
        logger.info('Polled sport successfully', { sport })
      } catch (error) {
        logger.error('Failed to poll sport', {
          sport,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        // Continue with other sports even if one fails
      }
    }

    logger.info('Odds polling job completed')
  })

  logger.info('Odds poller job started', { interval: '5 minutes' })
}

