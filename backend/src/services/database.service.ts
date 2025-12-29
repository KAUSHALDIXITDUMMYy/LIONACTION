import { Pool, PoolClient } from 'pg'
import { logger } from '../utils/logger'
import { env } from '../config/env'

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 20, // Max connections in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection cannot be established
})

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', {
    error: err.message,
    stack: err.stack,
  })
})

// Test connection on startup
pool
  .query('SELECT NOW()')
  .then(() => {
    logger.info('Database connection established', {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
    })
  })
  .catch((err) => {
    logger.error('Failed to connect to database', {
      error: err.message,
      hint: 'Check DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env',
    })
  })

export const db = pool

/**
 * Helper function to execute a query with error handling
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  try {
    const result = await pool.query(text, params)
    return result.rows as T[]
  } catch (error) {
    logger.error('Database query error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: text.substring(0, 100), // Log first 100 chars of query
    })
    throw error
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect()
}
