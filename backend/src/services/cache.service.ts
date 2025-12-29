import NodeCache from 'node-cache'
import { env } from '../config/env'
import { OddsEvent } from '../types/odds.types'
import { logger } from '../utils/logger'

interface CacheEntry {
  data: OddsEvent[]
  timestamp: number
  stale: boolean // Mark as stale but still serve while refreshing
}

class CacheService {
  private cache: NodeCache
  private readonly STALE_THRESHOLD = 60 // Mark as stale after 60 seconds (1 minute)
  private readonly MAX_TTL = 300 // Hard expiration after 5 minutes (fallback)

  constructor() {
    this.cache = new NodeCache({
      stdTTL: this.MAX_TTL, // Hard expiration
      checkperiod: 30, // Check for expired keys every 30 seconds
      useClones: false, // Better performance
      maxKeys: 200, // Increased for more sports
    })

    // Handle cache events
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
      staleThreshold: this.STALE_THRESHOLD,
      maxTtl: this.MAX_TTL,
      maxKeys: 200,
    })
  }

  /**
   * Get cached data with stale-while-revalidate support
   * Returns data even if stale, but marks it for refresh
   */
  get(sport: string): OddsEvent[] | undefined {
    try {
      if (!sport || typeof sport !== 'string') {
        logger.warn('Invalid sport parameter for cache get', { sport })
        return undefined
      }

      const key = this.getKey(sport)
      const entry = this.cache.get<CacheEntry>(key)

      if (!entry) {
        logger.debug('Cache miss', { sport, key })
        return undefined
      }

      // Check if data is stale (but still valid)
      const age = Date.now() - entry.timestamp
      const isStale = age > this.STALE_THRESHOLD * 1000

      if (isStale && !entry.stale) {
        // Mark as stale for background refresh
        entry.stale = true
        this.cache.set(key, entry, this.MAX_TTL)
        logger.debug('Cache entry marked as stale', { sport, age: `${Math.round(age / 1000)}s` })
      }

      logger.debug('Cache hit', {
        sport,
        key,
        count: entry.data.length,
        age: `${Math.round(age / 1000)}s`,
        stale: isStale,
      })

      return entry.data
    } catch (error) {
      logger.error('Cache get error', {
        sport,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return undefined
    }
  }

  /**
   * Check if data exists and is fresh (not stale)
   */
  isFresh(sport: string): boolean {
    try {
      if (!sport || typeof sport !== 'string') {
        return false
      }

      const key = this.getKey(sport)
      const entry = this.cache.get<CacheEntry>(key)

      if (!entry) {
        return false
      }

      const age = Date.now() - entry.timestamp
      return age <= this.STALE_THRESHOLD * 1000
    } catch (error) {
      logger.error('Cache isFresh error', {
        sport,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return false
    }
  }

  /**
   * Check if data exists but is stale (needs refresh)
   */
  isStale(sport: string): boolean {
    try {
      if (!sport || typeof sport !== 'string') {
        return false
      }

      const key = this.getKey(sport)
      const entry = this.cache.get<CacheEntry>(key)

      if (!entry) {
        return false
      }

      const age = Date.now() - entry.timestamp
      return age > this.STALE_THRESHOLD * 1000
    } catch (error) {
      logger.error('Cache isStale error', {
        sport,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return false
    }
  }

  /**
   * Set cache data with timestamp
   */
  set(sport: string, data: OddsEvent[]): void {
    try {
      if (!sport || typeof sport !== 'string') {
        logger.warn('Invalid sport parameter for cache set', { sport })
        return
      }

      if (!Array.isArray(data)) {
        logger.warn('Invalid data for cache set', { sport, dataType: typeof data })
        return
      }

      const key = this.getKey(sport)
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        stale: false,
      }

      const success = this.cache.set(key, entry, this.MAX_TTL)

      if (success) {
        logger.debug('Cache set', {
          sport,
          key,
          count: data.length,
          timestamp: new Date(entry.timestamp).toISOString(),
        })
      } else {
        logger.warn('Cache set failed', { sport, key })
      }
    } catch (error) {
      logger.error('Cache set error', {
        sport,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Get cache age in seconds
   */
  getAge(sport: string): number | null {
    try {
      if (!sport || typeof sport !== 'string') {
        return null
      }

      const key = this.getKey(sport)
      const entry = this.cache.get<CacheEntry>(key)

      if (!entry) {
        return null
      }

      return Math.round((Date.now() - entry.timestamp) / 1000)
    } catch (error) {
      logger.error('Cache getAge error', {
        sport,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return null
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
    const sanitized = sport.replace(/[^a-z0-9_]/gi, '_')
    return `odds:${sanitized}`
  }
}

export const cacheService = new CacheService()
