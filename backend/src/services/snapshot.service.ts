import { query, getClient } from './database.service'
import { OddsEvent } from '../types/odds.types'
import { logger } from '../utils/logger'

export type SnapshotType = 'opening' | 'hourly' | 'live_60s' | 'closing'

interface GameMetadata {
  id: number
  game_id: string
  sport_key: string
  sport_title: string | null
  home_team: string
  away_team: string
  commence_time: Date
  status: 'scheduled' | 'live' | 'finished'
  opening_line_captured: boolean
  closing_line_captured: boolean
  last_snapshot_time: Date | null
}

/**
 * Service for saving odds snapshots to the database
 */
class SnapshotService {
  /**
   * Determines the snapshot type based on game state
   */
  private determineSnapshotType(
    gameMetadata: GameMetadata | null,
    commenceTime: Date,
    isFirstSnapshot: boolean
  ): SnapshotType {
    const now = new Date()
    const timeUntilGame = commenceTime.getTime() - now.getTime()
    const isLive = timeUntilGame <= 0
    const isFinished = gameMetadata?.status === 'finished'

    // Opening line - first snapshot for a game
    if (isFirstSnapshot) {
      return 'opening'
    }

    // Closing line - game is about to start (within 5 minutes) or finished
    if (isFinished || (timeUntilGame > 0 && timeUntilGame <= 5 * 60 * 1000)) {
      return 'closing'
    }

    // Live game - 60 second intervals
    if (isLive) {
      return 'live_60s'
    }

    // Pre-game - hourly snapshots
    return 'hourly'
  }

  /**
   * Gets or creates game metadata
   */
  private async getOrCreateGameMetadata(event: OddsEvent): Promise<GameMetadata> {
    // Check if game exists
    const existing = await query<GameMetadata>(
      `SELECT * FROM game_metadata WHERE game_id = $1`,
      [event.id]
    )

    if (existing && existing.length > 0) {
      return existing[0]
    }

    // Create new game metadata
    const commenceTime = new Date(event.commence_time)
    const now = new Date()
    const isLive = commenceTime.getTime() <= now.getTime()
    const status = isLive ? 'live' : 'scheduled'

    const inserted = await query<GameMetadata>(
      `INSERT INTO game_metadata 
       (game_id, sport_key, sport_title, home_team, away_team, commence_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        event.id,
        event.sport_key,
        event.sport_title || null,
        event.home_team,
        event.away_team,
        commenceTime,
        status,
      ]
    )

    logger.info('Created new game metadata', {
      game_id: event.id,
      sport_key: event.sport_key,
      status,
    })

    return inserted[0]
  }

  /**
   * Updates game metadata after saving snapshot
   */
  private async updateGameMetadata(
    gameId: string,
    snapshotType: SnapshotType,
    snapshotTime: Date
  ): Promise<void> {
    const client = await getClient()

    try {
      await client.query('BEGIN')

      // Update last snapshot time
      await client.query(
        `UPDATE game_metadata 
         SET last_snapshot_time = $1, updated_at = NOW()
         WHERE game_id = $2`,
        [snapshotTime, gameId]
      )

      // Mark opening line captured
      if (snapshotType === 'opening') {
        await client.query(
          `UPDATE game_metadata 
           SET opening_line_captured = TRUE, updated_at = NOW()
           WHERE game_id = $1`,
          [gameId]
        )
      }

      // Mark closing line captured
      if (snapshotType === 'closing') {
        await client.query(
          `UPDATE game_metadata 
           SET closing_line_captured = TRUE, updated_at = NOW()
           WHERE game_id = $1`,
          [gameId]
        )
      }

      // Update status if game has started
      const commenceTime = await client.query(
        `SELECT commence_time FROM game_metadata WHERE game_id = $1`,
        [gameId]
      )

      if (commenceTime.rows.length > 0) {
        const gameCommenceTime = new Date(commenceTime.rows[0].commence_time)
        const now = new Date()

        if (gameCommenceTime.getTime() <= now.getTime()) {
          await client.query(
            `UPDATE game_metadata 
             SET status = 'live', updated_at = NOW()
             WHERE game_id = $1 AND status = 'scheduled'`,
            [gameId]
          )
        }
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Saves a snapshot for a single event
   */
  async saveSnapshot(event: OddsEvent, snapshotType?: SnapshotType): Promise<void> {
    try {
      // Get or create game metadata
      const gameMetadata = await this.getOrCreateGameMetadata(event)

      // Determine snapshot type if not provided
      const isFirstSnapshot = !gameMetadata.opening_line_captured
      const commenceTime = new Date(event.commence_time)
      const finalSnapshotType =
        snapshotType ||
        this.determineSnapshotType(gameMetadata, commenceTime, isFirstSnapshot)

      const snapshotTime = new Date()

      // Save snapshot
      await query(
        `INSERT INTO odds_snapshots 
         (game_id, sport_key, commence_time, snapshot_type, snapshot_timestamp, odds_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          event.id,
          event.sport_key,
          commenceTime,
          finalSnapshotType,
          snapshotTime,
          JSON.stringify(event), // Store full event as JSONB
        ]
      )

      // Update game metadata
      await this.updateGameMetadata(event.id, finalSnapshotType, snapshotTime)

      logger.debug('Snapshot saved', {
        game_id: event.id,
        sport_key: event.sport_key,
        snapshot_type: finalSnapshotType,
      })
    } catch (error) {
      logger.error('Failed to save snapshot', {
        game_id: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Saves snapshots for multiple events (batch operation)
   */
  async saveSnapshots(events: OddsEvent[], snapshotType?: SnapshotType): Promise<void> {
    const promises = events.map((event) =>
      this.saveSnapshot(event, snapshotType).catch((error) => {
        logger.error('Failed to save snapshot in batch', {
          game_id: event.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        // Continue with other events even if one fails
      })
    )

    await Promise.allSettled(promises)

    logger.info('Batch snapshots saved', {
      total: events.length,
      snapshot_type: snapshotType || 'auto',
    })
  }

  /**
   * Determines the polling interval for a sport based on game states
   * Returns interval in seconds: 60 (live), 120 (pre-game), 3600 (hourly)
   */
  async getSportPollingInterval(sport: string): Promise<number> {
    try {
      const now = new Date()
      const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000)

      // Check game states for this sport
      const games = await query<{
        status: string
        commence_time: Date
      }>(
        `SELECT status, commence_time 
         FROM game_metadata 
         WHERE sport_key = $1 
         AND (status = 'live' OR (status = 'scheduled' AND commence_time <= $2))`,
        [sport, threeHoursFromNow]
      )

      if (!games || games.length === 0) {
        // No active games, poll hourly
        return 3600
      }

      // Check if any game is live
      const hasLiveGames = games.some((game) => game.status === 'live')
      if (hasLiveGames) {
        return 60 // 60 seconds for live games
      }

      // Check if any game is pre-game (scheduled within 3 hours)
      const hasPreGame = games.some(
        (game) => game.status === 'scheduled' && new Date(game.commence_time) > now
      )
      if (hasPreGame) {
        return 120 // 2 minutes for pre-game
      }

      // Default to hourly
      return 3600
    } catch (error) {
      logger.error('Failed to determine sport polling interval', {
        sport,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      // Default to hourly on error
      return 3600
    }
  }

  /**
   * Gets latest odds from database for a sport
   * Returns the most recent snapshot for each game
   */
  async getLatestOddsFromDB(sport: string): Promise<OddsEvent[]> {
    try {
      // Get the latest snapshot for each game in the sport
      const latestSnapshots = await query<{
        game_id: string
        odds_data: any
        snapshot_timestamp: Date
      }>(
        `SELECT DISTINCT ON (game_id)
          game_id,
          odds_data,
          snapshot_timestamp
        FROM odds_snapshots
        WHERE sport_key = $1
        ORDER BY game_id, snapshot_timestamp DESC`,
        [sport]
      )

      if (!latestSnapshots || latestSnapshots.length === 0) {
        logger.debug('No snapshots found in database', { sport })
        return []
      }

      // Parse JSONB data and return as OddsEvent[]
      const events: OddsEvent[] = latestSnapshots
        .map((snapshot) => {
          try {
            const oddsData =
              typeof snapshot.odds_data === 'string'
                ? JSON.parse(snapshot.odds_data)
                : snapshot.odds_data
            return oddsData as OddsEvent
          } catch (error) {
            logger.error('Failed to parse snapshot data', {
              game_id: snapshot.game_id,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            return null
          }
        })
        .filter((event): event is OddsEvent => event !== null)

      logger.info('Retrieved latest odds from database', {
        sport,
        count: events.length,
      })

      return events
    } catch (error) {
      logger.error('Failed to get latest odds from database', {
        sport,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Gets historical odds snapshots for a specific game
   * Returns all snapshots ordered by timestamp for charting
   */
  async getHistoricalOdds(gameId: string, marketKey?: string): Promise<Array<{
    snapshot_timestamp: Date
    snapshot_type: string
    odds_data: OddsEvent
  }>> {
    try {
      logger.debug('Fetching historical odds', { game_id: gameId, market: marketKey })
      
      const snapshots = await query<{
        snapshot_timestamp: Date
        snapshot_type: string
        odds_data: any
      }>(
        `SELECT 
          snapshot_timestamp,
          snapshot_type,
          odds_data
        FROM odds_snapshots
        WHERE game_id = $1
        ORDER BY snapshot_timestamp ASC`,
        [gameId]
      )

      if (!snapshots || snapshots.length === 0) {
        logger.debug('No historical snapshots found', { game_id: gameId })
        return []
      }

      logger.debug('Raw snapshots from database', {
        game_id: gameId,
        count: snapshots.length,
        snapshot_types: snapshots.map(s => s.snapshot_type),
        timestamps: snapshots.map(s => s.snapshot_timestamp),
      })

      // Parse JSONB data
      const historicalData = snapshots
        .map((snapshot) => {
          try {
            const oddsData =
              typeof snapshot.odds_data === 'string'
                ? JSON.parse(snapshot.odds_data)
                : snapshot.odds_data
            return {
              snapshot_timestamp: snapshot.snapshot_timestamp,
              snapshot_type: snapshot.snapshot_type,
              odds_data: oddsData as OddsEvent,
            }
          } catch (error) {
            logger.error('Failed to parse historical snapshot data', {
              game_id: gameId,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            return null
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      logger.info('Retrieved historical odds', {
        game_id: gameId,
        market: marketKey,
        total_snapshots: snapshots.length,
        parsed_snapshots: historicalData.length,
        snapshot_types: [...new Set(historicalData.map(d => d.snapshot_type))],
      })

      return historicalData
    } catch (error) {
      logger.error('Failed to get historical odds', {
        game_id: gameId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }
}

export const snapshotService = new SnapshotService()


