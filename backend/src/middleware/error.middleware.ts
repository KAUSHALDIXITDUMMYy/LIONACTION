import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

interface CustomError extends Error {
  statusCode?: number
  status?: number
}

export function errorMiddleware(
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with request context
  logger.error('Error occurred', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    query: req.query,
    statusCode: err.statusCode || err.status || 500,
  })

  // Determine status code
  const statusCode = err.statusCode || err.status || 500

  // Don't expose internal errors in production
  const message =
    statusCode === 500 && process.env.NODE_ENV !== 'development'
      ? 'Internal server error'
      : err.message || 'Internal server error'

  res.status(statusCode).json({
    error: message,
    message: message, // Add message field for consistency
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

