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
    })

    logger.info('Cache service initialized', { ttl: env.CACHE_TTL_SECONDS })
  }

  get(sport: string): OddsEvent[] | undefined {
    const key = this.getKey(sport)
    const data = this.cache.get<OddsEvent[]>(key)
    
    if (data) {
      logger.debug('Cache hit', { sport, key })
    } else {
      logger.debug('Cache miss', { sport, key })
    }
    
    return data
  }

  set(sport: string, data: OddsEvent[]): void {
    const key = this.getKey(sport)
    this.cache.set(key, data)
    logger.debug('Cache set', { sport, key, count: data.length })
  }

  has(sport: string): boolean {
    const key = this.getKey(sport)
    return this.cache.has(key)
  }

  delete(sport: string): void {
    const key = this.getKey(sport)
    this.cache.del(key)
    logger.debug('Cache deleted', { sport, key })
  }

  clear(): void {
    this.cache.flushAll()
    logger.info('Cache cleared')
  }

  private getKey(sport: string): string {
    return `odds:${sport}`
  }
}

export const cacheService = new CacheService()

