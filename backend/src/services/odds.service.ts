import { env } from '../config/env'
import { OddsEvent } from '../types/odds.types'
import { cacheService } from './cache.service'
import { requestDeduplicationService } from './request-deduplication.service'
import { generateMockOdds } from './mock-odds.service'
import { fetchWithRetry } from '../utils/retry'
import { logger } from '../utils/logger'

const BOOKMAKERS = [
  'draftkings',
  'fanduel',
  'betmgm',
  'espnbet',
  'pointsbetus',
  'caesars',
  'bet365',
].join(',')

const MARKETS = 'h2h,spreads,totals'
const ODDS_FORMAT = 'american'

class OddsService {
  /**
   * Fetches odds from The Odds API
   */
  private async fetchOddsFromAPI(sport: string): Promise<OddsEvent[]> {
    const url = `${env.ODDS_API_BASE_URL}/sports/${sport}/odds?apiKey=${env.ODDS_API_KEY}&oddsFormat=${ODDS_FORMAT}&bookmakers=${BOOKMAKERS}&markets=${MARKETS}`

    logger.info('Fetching odds from API', { sport, url: url.replace(env.ODDS_API_KEY, '***') })

    const response = await fetchWithRetry(url, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const data = (await response.json()) as OddsEvent[]
    logger.info('Fetched odds from API', { sport, count: data?.length || 0 })

    return data || []
  }

  /**
   * Processes raw odds data (applies mock generation if needed)
   */
  private processOddsData(rawData: OddsEvent[]): OddsEvent[] {
    const processedData = generateMockOdds(rawData)
    
    if (processedData && processedData.length > 0) {
      logger.debug('Processed odds data', {
        count: processedData.length,
        firstEventBookmakers: processedData[0].bookmakers?.length || 0,
      })
    }

    return processedData
  }

  /**
   * Main method to get odds for a sport
   * Implements cache-first strategy with request deduplication
   */
  async getOdds(sport: string): Promise<OddsEvent[]> {
    // Check cache first
    const cached = cacheService.get(sport)
    if (cached) {
      logger.info('Returning cached odds', { sport, count: cached.length })
      return cached
    }

    // Use request deduplication to prevent concurrent requests
    const data = await requestDeduplicationService.getOrCreateRequest(
      sport,
      async () => {
        // Fetch from API
        const rawData = await this.fetchOddsFromAPI(sport)
        // Process data (apply mock generation if needed)
        const processedData = this.processOddsData(rawData)
        // Store in cache
        cacheService.set(sport, processedData)
        return processedData
      }
    )

    return data
  }
}

export const oddsService = new OddsService()

