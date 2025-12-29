import cron from 'node-cron'
import { ScheduledTask } from 'node-cron'
import { oddsService } from '../services/odds.service'
import { snapshotService } from '../services/snapshot.service'
import { logger } from '../utils/logger'

const POPULAR_SPORTS = [
  'americanfootball_nfl',
  'basketball_nba',
  'baseball_mlb',
]

// Store active cron tasks for each sport
const sportCronTasks = new Map<string, ScheduledTask>()

// Evaluator task that runs every 5 minutes to check game states
let evaluatorTask: ScheduledTask | null = null

/**
 * Polls a single sport and saves snapshots
 */
async function pollSport(sport: string): Promise<void> {
  try {
    const odds = await oddsService.getOdds(sport)

    // Save snapshots to database
    if (odds && odds.length > 0) {
      await snapshotService.saveSnapshots(odds)
    }

    logger.info('Sport polled and saved', {
      sport,
      eventsCount: odds?.length || 0,
    })
  } catch (error) {
    logger.error('Failed to poll sport', {
      sport,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Gets cron expression for interval in seconds
 */
function getCronExpression(intervalSeconds: number): string {
  if (intervalSeconds === 60) {
    return '*/1 * * * *' // Every 1 minute
  } else if (intervalSeconds === 120) {
    return '*/2 * * * *' // Every 2 minutes
  } else if (intervalSeconds === 3600) {
    return '0 * * * *' // Every hour (at minute 0)
  }
  // Fallback: convert seconds to minutes
  const minutes = Math.floor(intervalSeconds / 60)
  return `*/${minutes} * * * *`
}

/**
 * Creates or updates cron job for a sport based on its polling interval
 */
async function updateSportPoller(sport: string): Promise<void> {
  try {
    // Get recommended interval based on game states
    const intervalSeconds = await snapshotService.getSportPollingInterval(sport)
    const cronExpression = getCronExpression(intervalSeconds)

    // Stop existing task if any
    const existingTask = sportCronTasks.get(sport)
    if (existingTask) {
      existingTask.stop()
      sportCronTasks.delete(sport)
    }

    // Create new cron task
    const newTask = cron.schedule(cronExpression, () => {
      pollSport(sport)
    })

    sportCronTasks.set(sport, newTask)

    const intervalLabel =
      intervalSeconds === 60
        ? '60 seconds (live)'
        : intervalSeconds === 120
          ? '2 minutes (pre-game)'
          : '1 hour (default)'

    logger.info('Sport poller updated', {
      sport,
      interval: intervalLabel,
      cronExpression,
    })
  } catch (error) {
    logger.error('Failed to update sport poller', {
      sport,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Evaluates all sports and updates their polling intervals
 * Runs every 5 minutes
 */
async function evaluateAndUpdatePollers(): Promise<void> {
  logger.info('Evaluating sport polling intervals', { sports: POPULAR_SPORTS })

  const promises = POPULAR_SPORTS.map((sport) => updateSportPoller(sport))
  await Promise.allSettled(promises)

  logger.debug('Polling interval evaluation completed')
}

/**
 * Start dynamic odds poller
 * Evaluates game states every 5 minutes and adjusts polling intervals
 */
export function startOddsPoller(): void {
  if (evaluatorTask) {
    logger.warn('Odds poller already started')
    return
  }

  // Initial evaluation and setup
  evaluateAndUpdatePollers()

  // Run evaluator every 5 minutes to check game states and update intervals
  evaluatorTask = cron.schedule('*/5 * * * *', () => {
    evaluateAndUpdatePollers()
  })

  logger.info('Dynamic odds poller started', {
    evaluationInterval: '5 minutes',
    sports: POPULAR_SPORTS,
  })
}

/**
 * Stop all polling jobs
 */
export function stopOddsPoller(): void {
  // Stop evaluator
  if (evaluatorTask) {
    evaluatorTask.stop()
    evaluatorTask = null
  }

  // Stop all sport-specific pollers
  for (const [sport, task] of sportCronTasks.entries()) {
    task.stop()
    logger.debug('Sport poller stopped', { sport })
  }

  sportCronTasks.clear()
  logger.info('All odds pollers stopped')
}
