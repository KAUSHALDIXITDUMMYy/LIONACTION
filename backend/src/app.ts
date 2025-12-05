import express, { Express, Request, Response, NextFunction } from 'express'
import { corsMiddleware } from './middleware/cors.middleware'
import { errorMiddleware } from './middleware/error.middleware'
import oddsRoutes from './routes/odds.routes'
import { logger } from './utils/logger'

// Request logging middleware
function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)

  // Add request ID to request object for tracking
  ;(req as any).requestId = requestId

  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  })

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    })
  })

  next()
}

export function createApp(): Express {
  const app = express()

  // Security: Request size limits
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Request logging
  app.use(requestLogger)

  // CORS
  app.use(corsMiddleware)

  // Security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    next()
  })

  // Routes
  app.use(oddsRoutes)

  // Health check endpoint with more details
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    })
  })

  // 404 handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
    })
  })

  // Error handling middleware (must be last)
  app.use(errorMiddleware)

  return app
}

