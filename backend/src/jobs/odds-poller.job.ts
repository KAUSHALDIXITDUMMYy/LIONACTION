import cron from 'node-cron'
import { ScheduledTask } from 'node-cron'
import { oddsService } from '../services/odds.service'
import { logger } from '../utils/logger'

const POPULAR_SPORTS = [
  'americanfootball_nfl',
  'basketball_nba',
  'baseball_mlb',
]

let cronTask: ScheduledTask | null = null

/**
 * Background job that polls popular sports every 5 minutes
 * to pre-populate the cache
 */
export function startOddsPoller(): void {
  if (cronTask) {
    logger.warn('Odds poller already started')
    return
  }

  // Run every 5 minutes
  cronTask = cron.schedule('*/5 * * * *', async () => {
    logger.info('Starting odds polling job', { sports: POPULAR_SPORTS })

    // Process sports in parallel with error handling
    const promises = POPULAR_SPORTS.map(async (sport) => {
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
    })

    // Wait for all sports to complete
    await Promise.allSettled(promises)

    logger.info('Odds polling job completed')
  })

  logger.info('Odds poller job started', { interval: '5 minutes' })
}

/**
 * Stops the odds poller job
 */
export function stopOddsPoller(): void {
  if (cronTask) {
    cronTask.stop()
    cronTask = null
    logger.info('Odds poller job stopped')
  } else {
    logger.warn('Odds poller not running')
  }
}

