/**
 * Simple script to view saved odds snapshots from the database
 * Run with: npx ts-node src/scripts/view-snapshots.ts
 */

import { query } from '../services/database.service'
import { logger } from '../utils/logger'

async function viewSnapshots() {
  try {
    logger.info('Fetching odds snapshots...')

    // Get recent snapshots
    const snapshots = await query(
      `SELECT 
        id,
        game_id,
        sport_key,
        commence_time,
        snapshot_type,
        snapshot_timestamp,
        created_at
      FROM odds_snapshots 
      ORDER BY created_at DESC 
      LIMIT 20`
    )

    if (snapshots.length === 0) {
      logger.info('No snapshots found in database')
      return
    }

    logger.info(`Found ${snapshots.length} snapshots:`)
    console.table(snapshots)

    // Get summary by snapshot type
    const summary = await query(
      `SELECT 
        snapshot_type,
        COUNT(*) as count
      FROM odds_snapshots 
      GROUP BY snapshot_type`
    )

    logger.info('Summary by type:')
    console.table(summary)
  } catch (error) {
    logger.error('Error viewing snapshots', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

viewSnapshots()
