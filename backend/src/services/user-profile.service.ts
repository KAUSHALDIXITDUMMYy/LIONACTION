import { query, getClient } from './database.service'
import { logger } from '../utils/logger'

export interface UserProfile {
  id: number
  user_id: string
  telegram_id: string | null
  display_name: string | null
  created_at: Date
  updated_at: Date
}

export interface UpdateProfileInput {
  telegram_id?: string | null
  display_name?: string | null
}

/**
 * Service for managing user profiles
 */
class UserProfileService {
  /**
   * Gets or creates a user profile
   */
  async getOrCreateProfile(userId: string): Promise<UserProfile> {
    try {
      // Try to get existing profile
      const existing = await query<UserProfile>(
        `SELECT * FROM user_profiles WHERE user_id = $1`,
        [userId]
      )

      if (existing && existing.length > 0) {
        return existing[0]
      }

      // Create new profile if doesn't exist
      const inserted = await query<UserProfile>(
        `INSERT INTO user_profiles (user_id)
         VALUES ($1)
         RETURNING *`,
        [userId]
      )

      if (!inserted || inserted.length === 0) {
        throw new Error('Failed to create user profile')
      }

      logger.info('User profile created', { user_id: userId })
      return inserted[0]
    } catch (error) {
      logger.error('Failed to get or create profile', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Gets user profile by user ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profiles = await query<UserProfile>(
        `SELECT * FROM user_profiles WHERE user_id = $1`,
        [userId]
      )

      return profiles && profiles.length > 0 ? profiles[0] : null
    } catch (error) {
      logger.error('Failed to get profile', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Updates user profile
   */
  async updateProfile(userId: string, updates: UpdateProfileInput): Promise<UserProfile> {
    const client = await getClient()

    try {
      await client.query('BEGIN')

      // Check if profile exists
      const existing = await client.query(
        `SELECT * FROM user_profiles WHERE user_id = $1`,
        [userId]
      )

      let profile: UserProfile

      if (existing.rows.length === 0) {
        // Create profile if doesn't exist
        const inserted = await client.query<UserProfile>(
          `INSERT INTO user_profiles (user_id, telegram_id, display_name)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [userId, updates.telegram_id || null, updates.display_name || null]
        )
        profile = inserted.rows[0]
      } else {
        // Update existing profile
        const updateFields: string[] = []
        const updateValues: any[] = []
        let paramIndex = 1

        if (updates.telegram_id !== undefined) {
          updateFields.push(`telegram_id = $${paramIndex}`)
          updateValues.push(updates.telegram_id || null)
          paramIndex++
        }

        if (updates.display_name !== undefined) {
          updateFields.push(`display_name = $${paramIndex}`)
          updateValues.push(updates.display_name || null)
          paramIndex++
        }

        if (updateFields.length === 0) {
          throw new Error('No fields to update')
        }

        updateFields.push(`updated_at = NOW()`)
        updateValues.push(userId)

        const updated = await client.query<UserProfile>(
          `UPDATE user_profiles 
           SET ${updateFields.join(', ')}
           WHERE user_id = $${paramIndex}
           RETURNING *`,
          updateValues
        )

        profile = updated.rows[0]
      }

      await client.query('COMMIT')

      logger.info('Profile updated', {
        user_id: userId,
        updates: Object.keys(updates),
      })

      return profile
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to update profile', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    } finally {
      client.release()
    }
  }
}

export const userProfileService = new UserProfileService()
