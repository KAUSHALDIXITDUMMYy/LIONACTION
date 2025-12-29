-- Migration: Create user_saved_bets table for writeback feature
-- Run this if you already have the database created

CREATE TABLE IF NOT EXISTS user_saved_bets (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  game_id VARCHAR(255) NOT NULL,
  sport_key VARCHAR(100) NOT NULL,
  bookmaker_key VARCHAR(100) NOT NULL,
  market_key VARCHAR(50) NOT NULL,
  outcome_name VARCHAR(255) NOT NULL,
  locked_price NUMERIC(10, 2) NOT NULL,
  locked_point NUMERIC(10, 2),
  edited_price NUMERIC(10, 2),
  edited_point NUMERIC(10, 2),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_bet_game FOREIGN KEY (game_id) REFERENCES game_metadata(game_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_user_id ON user_saved_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_game_id ON user_saved_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_status ON user_saved_bets(status);
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_sport_key ON user_saved_bets(sport_key);
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_created_at ON user_saved_bets(created_at);
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_user_status ON user_saved_bets(user_id, status);
