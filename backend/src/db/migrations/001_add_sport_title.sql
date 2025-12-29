-- Migration: Add sport_title column to game_metadata table
-- Run this if you already have the database created

-- Add sport_title column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_metadata' AND column_name = 'sport_title'
  ) THEN
    ALTER TABLE game_metadata ADD COLUMN sport_title VARCHAR(100);
    CREATE INDEX IF NOT EXISTS idx_game_metadata_sport_title ON game_metadata(sport_title);
    RAISE NOTICE 'Added sport_title column to game_metadata';
  ELSE
    RAISE NOTICE 'sport_title column already exists';
  END IF;
END $$;
