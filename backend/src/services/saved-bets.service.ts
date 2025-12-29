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
        updateFields.push(`status = $${paramIndex}`)
        updateValues.push(updates.status)
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
        `SELECT status, COUNT(*) as count 
         FROM user_saved_bets 
         WHERE user_id = $1 
         GROUP BY status`,
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
