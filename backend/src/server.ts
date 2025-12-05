import { createApp } from './app'
import { env } from './config/env'
import { logger } from './utils/logger'
import { startOddsPoller, stopOddsPoller } from './jobs/odds-poller.job'

const app = createApp()

// Start background polling job
let pollerStarted = false
try {
  startOddsPoller()
  pollerStarted = true
} catch (error) {
  logger.error('Failed to start odds poller', {
    error: error instanceof Error ? error.message : 'Unknown error',
  })
  // Continue even if poller fails to start
}

// Start server
const server = app.listen(env.PORT, () => {
  logger.info('Server started', {
    port: env.PORT,
    frontendUrl: env.FRONTEND_URL,
    cacheTtl: env.CACHE_TTL_SECONDS,
    nodeEnv: env.NODE_ENV,
    pollerStarted,
  })
})

// Graceful shutdown handler
function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received, shutting down gracefully`)

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed')

    // Stop background jobs
    if (pollerStarted) {
      try {
        stopOddsPoller()
        logger.info('Odds poller stopped')
      } catch (error) {
        logger.error('Error stopping odds poller', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Give a small delay for cleanup, then exit
    setTimeout(() => {
      logger.info('Shutdown complete')
      process.exit(0)
    }, 1000)
  })

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  })
  gracefulShutdown('uncaughtException')
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  })
  // Don't exit on unhandled rejection, but log it
})

