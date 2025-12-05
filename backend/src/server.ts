import { createApp } from './app'
import { env } from './config/env'
import { logger } from './utils/logger'
import { startOddsPoller } from './jobs/odds-poller.job'

const app = createApp()

// Start background polling job
startOddsPoller()

// Start server
const server = app.listen(env.PORT, () => {
  logger.info('Server started', {
    port: env.PORT,
    frontendUrl: env.FRONTEND_URL,
    cacheTtl: env.CACHE_TTL_SECONDS,
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

