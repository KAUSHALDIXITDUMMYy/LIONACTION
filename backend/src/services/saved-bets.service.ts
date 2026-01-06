import { query, getClient } from './database.service'
import { logger } from '../utils/logger'

export interface SavedBet {
  id: number
  user_id: string
  game_id: string
  sport_key: string
  bookmaker_key: string
  market_key: string
  outcome_name: string
  locked_price: number
  locked_point: number | null
  edited_price: number | null
  edited_point: number | null
  notes: string | null
  status: 'pending' | 'won' | 'lost' | 'void'
  created_at: Date
  updated_at: Date
}

export interface CreateBetInput {
  user_id: string
  game_id: string
  sport_key: string
  bookmaker_key: string
  market_key: string
  outcome_name: string
  locked_price: number
  locked_point?: number | null
  notes?: string
}

export interface UpdateBetInput {
  edited_price?: number | null
  edited_point?: number | null
  notes?: string | null
  status?: 'pending' | 'won' | 'lost' | 'void'
}

/**
 * Service for managing user saved bets
 */
class SavedBetsService {
  /**
   * Creates a new saved bet
   * Note: We don't enforce foreign key constraint on game_id to allow saving bets
   * even if the game isn't in game_metadata yet
   */
  async createBet(input: CreateBetInput): Promise<SavedBet> {
    const client = await getClient()

    try {
      await client.query('BEGIN')

      // Check if game exists in game_metadata, if not, create a basic entry
      const existingGame = await client.query(
        `SELECT game_id FROM game_metadata WHERE game_id = $1`,
        [input.game_id]
      )

      if (existingGame.rows.length === 0) {
        // Create a minimal game_metadata entry if it doesn't exist
        // This allows the foreign key constraint to be satisfied
        await client.query(
          `INSERT INTO game_metadata (game_id, sport_key, home_team, away_team, commence_time, status)
           VALUES ($1, $2, $3, $4, NOW(), 'scheduled')
           ON CONFLICT (game_id) DO NOTHING`,
          [
            input.game_id,
            input.sport_key,
            'Unknown Team', // Placeholder, will be updated when game is polled
            'Unknown Team',
          ]
        )
        logger.info('Created placeholder game_metadata entry', { game_id: input.game_id })
      }

      // Now insert the bet
      const inserted = await client.query<SavedBet>(
        `INSERT INTO user_saved_bets 
         (user_id, game_id, sport_key, bookmaker_key, market_key, outcome_name, locked_price, locked_point, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          input.user_id,
          input.game_id,
          input.sport_key,
          input.bookmaker_key,
          input.market_key,
          input.outcome_name,
          input.locked_price,
          input.locked_point || null,
          input.notes || null,
        ]
      )

      await client.query('COMMIT')

      if (!inserted.rows || inserted.rows.length === 0) {
        throw new Error('Failed to create bet')
      }

      logger.info('Bet saved', {
        user_id: input.user_id,
        game_id: input.game_id,
        bet_id: inserted.rows[0].id,
      })

      return inserted.rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to create bet', {
        user_id: input.user_id,
        game_id: input.game_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Gets all bets for a user with game metadata
   */
  async getUserBets(userId: string): Promise<(SavedBet & { game_info?: any })[]> {
    try {
      const bets = await query<SavedBet & { game_info?: any }>(
        `SELECT 
          b.*,
          json_build_object(
            'home_team', g.home_team,
            'away_team', g.away_team,
            'sport_title', g.sport_title,
            'commence_time', g.commence_time,
            'status', g.status
          ) as game_info
         FROM user_saved_bets b
         LEFT JOIN game_metadata g ON b.game_id = g.game_id
         WHERE b.user_id = $1 
         ORDER BY b.created_at DESC`,
        [userId]
      )

      return bets || []
    } catch (error) {
      logger.error('Failed to get user bets', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Gets saved bets for a specific game
   */
  async getBetsForGame(userId: string, gameId: string): Promise<SavedBet[]> {
    try {
      const bets = await query<SavedBet>(
        `SELECT * FROM user_saved_bets
         WHERE user_id = $1 AND game_id = $2
         ORDER BY created_at DESC`,
        [userId, gameId]
      )

      return bets || []
    } catch (error) {
      logger.error('Failed to get bets for game', {
        user_id: userId,
        game_id: gameId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Gets a single bet by ID (with user verification)
   */
  async getBetById(betId: number, userId: string): Promise<SavedBet | null> {
    try {
      const bets = await query<SavedBet>(
        `SELECT * FROM user_saved_bets 
         WHERE id = $1 AND user_id = $2`,
        [betId, userId]
      )

      return bets && bets.length > 0 ? bets[0] : null
    } catch (error) {
      logger.error('Failed to get bet', {
        bet_id: betId,
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Updates a bet (user can edit odds, notes, status)
   */
  async updateBet(betId: number, userId: string, updates: UpdateBetInput): Promise<SavedBet> {
    const client = await getClient()

    try {
      await client.query('BEGIN')

      // Verify bet belongs to user
      const existing = await client.query(
        `SELECT * FROM user_saved_bets WHERE id = $1 AND user_id = $2`,
        [betId, userId]
      )

      if (existing.rows.length === 0) {
        throw new Error('Bet not found or access denied')
      }

      // Build update query dynamically
      const updateFields: string[] = []
      const updateValues: any[] = []
      let paramIndex = 1

      if (updates.edited_price !== undefined) {
        updateFields.push(`edited_price = $${paramIndex}`)
        updateValues.push(updates.edited_price)
        paramIndex++
      }

      if (updates.edited_point !== undefined) {
        updateFields.push(`edited_point = $${paramIndex}`)
        updateValues.push(updates.edited_point)
        paramIndex++
      }

      if (updates.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`)
        updateValues.push(updates.notes)
        paramIndex++
      }

      if (updates.status !== undefined) {
        // Normalize status to lowercase for consistency
        const normalizedStatus = updates.status.toLowerCase().trim()
        updateFields.push(`status = $${paramIndex}`)
        updateValues.push(normalizedStatus)
        paramIndex++
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update')
      }

      updateFields.push(`updated_at = NOW()`)
      updateValues.push(betId, userId)

      const updated = await client.query<SavedBet>(
        `UPDATE user_saved_bets 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
         RETURNING *`,
        updateValues
      )

      await client.query('COMMIT')

      if (!updated.rows || updated.rows.length === 0) {
        throw new Error('Failed to update bet')
      }

      logger.info('Bet updated', {
        bet_id: betId,
        user_id: userId,
        updates: Object.keys(updates),
      })

      return updated.rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Deletes a bet
   */
  async deleteBet(betId: number, userId: string): Promise<void> {
    try {
      const result = await query(
        `DELETE FROM user_saved_bets 
         WHERE id = $1 AND user_id = $2`,
        [betId, userId]
      )

      logger.info('Bet deleted', {
        bet_id: betId,
        user_id: userId,
      })
    } catch (error) {
      logger.error('Failed to delete bet', {
        bet_id: betId,
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Gets analytics data for a user (win rates by week, sport, overall)
   */
  async getUserAnalytics(userId: string, startDate?: Date, endDate?: Date): Promise<{
    overall: {
      wins: number
      losses: number
      winRate: number
      total: number
    }
    byWeek: Array<{
      week: string // ISO week string (e.g., "2024-W01")
      weekStart: string // Start date of week
      weekEnd: string // End date of week
      wins: number
      losses: number
      winRate: number
      total: number
    }>
    bySport: Array<{
      sport_key: string
      sport_title: string | null
      wins: number
      losses: number
      winRate: number
      total: number
    }>
  }> {
    try {
      logger.debug('Getting user analytics', {
        user_id: userId,
        startDate,
        endDate,
      })
      // Build date filter
      let dateFilter = ''
      const dateParams: any[] = [userId]
      let paramIndex = 2
      
      if (startDate || endDate) {
        const conditions: string[] = []
        if (startDate) {
          conditions.push(`created_at >= $${paramIndex}`)
          dateParams.push(startDate)
          paramIndex++
        }
        if (endDate) {
          conditions.push(`created_at <= $${paramIndex}`)
          dateParams.push(endDate)
          paramIndex++
        }
        dateFilter = `AND ${conditions.join(' AND ')}`
      }

      // First, check all bets for this user to debug
      const allBetsCheck = await query<{
        status: string
        count: string
      }>(
        `SELECT LOWER(TRIM(status)) as status, COUNT(*)::text as count
         FROM user_saved_bets
         WHERE user_id = $1
         GROUP BY LOWER(TRIM(status))`,
        [userId]
      )

      // Also get sample bets to see actual status values
      const sampleBets = await query<{
        id: number
        status: string
        created_at: Date
      }>(
        `SELECT id, LOWER(TRIM(status)) as status, created_at
         FROM user_saved_bets
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId]
      )

      logger.info('All bets status breakdown', {
        user_id: userId,
        allBets: allBetsCheck,
        sampleBets: sampleBets,
        totalBets: allBetsCheck.reduce((sum, b) => sum + parseInt(b.count), 0),
      })

      // Check for case sensitivity issues - get all statuses first
      const allStatuses = await query<{
        status: string
      }>(
        `SELECT DISTINCT LOWER(TRIM(status)) as status
         FROM user_saved_bets
         WHERE user_id = $1`,
        [userId]
      )

      logger.info('All unique status values found', {
        user_id: userId,
        statuses: allStatuses.map(s => s.status),
      })

      // Get overall stats (only resolved bets: won/lost, exclude pending/void)
      // Use LOWER(TRIM()) to handle any case sensitivity or whitespace issues
      const overallStats = await query<{
        status: string
        count: string
      }>(
        `SELECT LOWER(TRIM(status)) as status, COUNT(*)::text as count
         FROM user_saved_bets
         WHERE user_id = $1 ${dateFilter}
         AND LOWER(TRIM(status)) IN ('won', 'lost')
         GROUP BY LOWER(TRIM(status))`,
        dateParams
      )

      logger.info('Overall stats query result', {
        user_id: userId,
        results: overallStats,
        dateFilter,
        dateParams: dateParams.length,
        queryParams: dateParams,
      })

      const wins = parseInt(overallStats.find(s => s.status === 'won')?.count || '0')
      const losses = parseInt(overallStats.find(s => s.status === 'lost')?.count || '0')
      const total = wins + losses
      const winRate = total > 0 ? (wins / total) * 100 : 0

      logger.info('Calculated overall analytics', {
        user_id: userId,
        wins,
        losses,
        total,
        winRate,
        overallStatsRaw: overallStats,
      })

      // Get weekly stats
      const weeklyStats = await query<{
        week: string
        week_start: Date
        week_end: Date
        status: string
        count: string
      }>(
        `SELECT 
          TO_CHAR(created_at, 'IYYY-"W"IW') as week,
          DATE_TRUNC('week', created_at) as week_start,
          DATE_TRUNC('week', created_at) + INTERVAL '6 days' as week_end,
          LOWER(TRIM(status)) as status,
          COUNT(*)::text as count
         FROM user_saved_bets
         WHERE user_id = $1 ${dateFilter}
         AND LOWER(TRIM(status)) IN ('won', 'lost')
         GROUP BY week, week_start, week_end, LOWER(TRIM(status))
         ORDER BY week_start DESC`,
        dateParams
      )

      // Group weekly stats
      const weeklyMap = new Map<string, { wins: number; losses: number; weekStart: Date; weekEnd: Date }>()
      weeklyStats.forEach(stat => {
        const week = stat.week
        if (!weeklyMap.has(week)) {
          weeklyMap.set(week, {
            wins: 0,
            losses: 0,
            weekStart: stat.week_start,
            weekEnd: stat.week_end,
          })
        }
        const weekData = weeklyMap.get(week)!
        if (stat.status === 'won') {
          weekData.wins = parseInt(stat.count)
        } else if (stat.status === 'lost') {
          weekData.losses = parseInt(stat.count)
        }
      })

      const byWeek = Array.from(weeklyMap.entries()).map(([week, data]) => ({
        week,
        weekStart: data.weekStart.toISOString().split('T')[0],
        weekEnd: data.weekEnd.toISOString().split('T')[0],
        wins: data.wins,
        losses: data.losses,
        total: data.wins + data.losses,
        winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0,
      })).sort((a, b) => a.week.localeCompare(b.week))

      // Get stats by sport
      const sportStats = await query<{
        sport_key: string
        status: string
        count: string
      }>(
        `SELECT sport_key, LOWER(TRIM(status)) as status, COUNT(*)::text as count
         FROM user_saved_bets
         WHERE user_id = $1 ${dateFilter}
         AND LOWER(TRIM(status)) IN ('won', 'lost')
         GROUP BY sport_key, LOWER(TRIM(status))
         ORDER BY sport_key`,
        dateParams
      )

      // Group sport stats
      const sportMap = new Map<string, { wins: number; losses: number }>()
      sportStats.forEach(stat => {
        if (!sportMap.has(stat.sport_key)) {
          sportMap.set(stat.sport_key, { wins: 0, losses: 0 })
        }
        const sportData = sportMap.get(stat.sport_key)!
        if (stat.status === 'won') {
          sportData.wins = parseInt(stat.count)
        } else if (stat.status === 'lost') {
          sportData.losses = parseInt(stat.count)
        }
      })

      // Get sport titles from game_metadata
      const sportTitles = await query<{
        sport_key: string
        sport_title: string | null
      }>(
        `SELECT DISTINCT sport_key, sport_title
         FROM game_metadata
         WHERE sport_key = ANY($1)`,
        [Array.from(sportMap.keys())]
      )

      const sportTitleMap = new Map(sportTitles.map(s => [s.sport_key, s.sport_title]))

      const bySport = Array.from(sportMap.entries()).map(([sport_key, data]) => ({
        sport_key,
        sport_title: sportTitleMap.get(sport_key) || null,
        wins: data.wins,
        losses: data.losses,
        total: data.wins + data.losses,
        winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0,
      })).sort((a, b) => b.winRate - a.winRate) // Sort by win rate descending

      return {
        overall: {
          wins,
          losses,
          winRate: Math.round(winRate * 100) / 100,
          total,
        },
        byWeek,
        bySport,
      }
    } catch (error) {
      logger.error('Failed to get user analytics', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Gets user bet statistics
   */
  async getUserBetStats(userId: string): Promise<{
    total: number
    pending: number
    won: number
    lost: number
    winRate: number
  }> {
    try {
      const stats = await query<{
        status: string
        count: string
      }>(
        `SELECT LOWER(TRIM(status)) as status, COUNT(*)::text as count 
         FROM user_saved_bets 
         WHERE user_id = $1 
         GROUP BY LOWER(TRIM(status))`,
        [userId]
      )

      const total = stats.reduce((sum, s) => sum + parseInt(s.count), 0)
      const pending = parseInt(stats.find((s) => s.status === 'pending')?.count || '0')
      const won = parseInt(stats.find((s) => s.status === 'won')?.count || '0')
      const lost = parseInt(stats.find((s) => s.status === 'lost')?.count || '0')
      const winRate = won + lost > 0 ? (won / (won + lost)) * 100 : 0

      return {
        total,
        pending,
        won,
        lost,
        winRate: Math.round(winRate * 100) / 100, // Round to 2 decimals
      }
    } catch (error) {
      logger.error('Failed to get bet stats', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }
}

export const savedBetsService = new SavedBetsService()
