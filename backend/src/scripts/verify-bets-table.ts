import { query } from '../services/database.service'
import { logger } from '../utils/logger'

async function verifyBetsTable() {
  try {
    logger.info('Checking if user_saved_bets table exists...')
    
    // Check if table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_saved_bets'
      );
    `)

    const tableExists = (tableCheck[0] as any)?.exists

    if (!tableExists) {
      logger.error('user_saved_bets table does not exist!')
      logger.info('Please run the migration: src/db/migrations/002_create_user_saved_bets.sql')
      process.exit(1)
    }

    logger.info('✓ user_saved_bets table exists')

    // Check table structure
    const columns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_saved_bets'
      ORDER BY ordinal_position;
    `)

    logger.info('Table columns:')
    console.table(columns)

    // Check indexes
    const indexes = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'user_saved_bets';
    `)

    logger.info('Table indexes:')
    console.table(indexes)

    // Check foreign key constraint
    const foreignKeys = await query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'user_saved_bets';
    `)

    logger.info('Foreign key constraints:')
    console.table(foreignKeys)

    // Count existing bets
    const count = await query(`SELECT COUNT(*) as count FROM user_saved_bets`)
    logger.info(`Total saved bets: ${(count[0] as any)?.count || 0}`)

    logger.info('✓ Database verification complete')
    process.exit(0)
  } catch (error) {
    logger.error('Database verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    process.exit(1)
  }
}

verifyBetsTable()
