import express, { Express } from 'express'
import { corsMiddleware } from './middleware/cors.middleware'
import { errorMiddleware } from './middleware/error.middleware'
import oddsRoutes from './routes/odds.routes'

export function createApp(): Express {
  const app = express()

  // Middleware
  app.use(express.json())
  app.use(corsMiddleware)

  // Routes
  app.use(oddsRoutes)

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Error handling middleware (must be last)
  app.use(errorMiddleware)

  return app
}

