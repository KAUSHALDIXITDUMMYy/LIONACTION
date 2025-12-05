import NodeCache from 'node-cache'
import { env } from '../config/env'
import { OddsEvent } from '../types/odds.types'
import { logger } from '../utils/logger'

class CacheService {
  private cache: NodeCache

  constructor() {
    this.cache = new NodeCache({
      stdTTL: env.CACHE_TTL_SECONDS,
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false, // Better performance
      maxKeys: 100, // Limit cache size to prevent memory issues
    })

    // Handle cache errors
    this.cache.on('set', (key, value) => {
      logger.debug('Cache key set', { key })
    })

    this.cache.on('del', (key, value) => {
      logger.debug('Cache key deleted', { key })
    })

    this.cache.on('expired', (key, value) => {
      logger.debug('Cache key expired', { key })
    })

    logger.info('Cache service initialized', {
      ttl: env.CACHE_TTL_SECONDS,
      maxKeys: 100,
    })
  }

  get(sport: string): OddsEvent[] | undefined {
    try {
      // Validate sport parameter
      if (!sport || typeof sport !== 'string') {
        logger.warn('Invalid sport parameter for cache get', { sport })
        return undefined
      }

      const key = this.getKey(sport)
      const data = this.cache.get<OddsEvent[]>(key)

      if (data) {
        logger.debug('Cache hit', { sport, key, count: data.length })
      } else {
        logger.debug('Cache miss', { sport, key })
      }

      return data
    } catch (error) {
      logger.error('Cache get error', {
        sport,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      // Return undefined on error to allow fallback to API
      return undefined
    }
  }

  set(sport: string, data: OddsEvent[]): void {
    try {
      // Validate inputs
      if (!sport || typeof sport !== 'string') {
        logger.warn('Invalid sport parameter for cache set', { sport })
        return
      }

      if (!Array.isArray(data)) {
        logger.warn('Invalid data for cache set', { sport, dataType: typeof data })
        return
      }

      const key = this.getKey(sport)
      const success = this.cache.set(key, data)

      if (success) {
        logger.debug('Cache set', { sport, key, count: data.length })
      } else {
        logger.warn('Cache set failed', { sport, key })
      }
    } catch (error) {
      logger.error('Cache set error', {
        sport,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      // Don't throw - cache failures shouldn't break the app
    }
  }

  has(sport: string): boolean {
    try {
      if (!sport || typeof sport !== 'string') {
        return false
      }

      const key = this.getKey(sport)
      return this.cache.has(key)
    } catch (error) {
      logger.error('Cache has error', {
        sport,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return false
    }
  }

  delete(sport: string): void {
    try {
      if (!sport || typeof sport !== 'string') {
        return
      }

      const key = this.getKey(sport)
      this.cache.del(key)
      logger.debug('Cache deleted', { sport, key })
    } catch (error) {
      logger.error('Cache delete error', {
        sport,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  clear(): void {
    try {
      this.cache.flushAll()
      logger.info('Cache cleared')
    } catch (error) {
      logger.error('Cache clear error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  getStats() {
    return this.cache.getStats()
  }

  private getKey(sport: string): string {
    // Sanitize sport key to prevent injection
    const sanitized = sport.replace(/[^a-z0-9_]/gi, '_')
    return `odds:${sanitized}`
  }
}

export const cacheService = new CacheService()

