-- Initialize database schema for odds dashboard

-- Odds snapshots table
CREATE TABLE IF NOT EXISTS odds_snapshots (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(255) NOT NULL,
  sport_key VARCHAR(100) NOT NULL,
  commence_time TIMESTAMP NOT NULL,
  snapshot_type VARCHAR(50) NOT NULL, -- 'opening', 'hourly', 'live_60s', 'closing'
  snapshot_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  odds_data JSONB NOT NULL, -- Store full odds data as JSON
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_id ON odds_snapshots(game_id);
CREATE INDEX IF NOT EXISTS idx_sport_key ON odds_snapshots(sport_key);
CREATE INDEX IF NOT EXISTS idx_commence_time ON odds_snapshots(commence_time);
CREATE INDEX IF NOT EXISTS idx_snapshot_timestamp ON odds_snapshots(snapshot_timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshot_type ON odds_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_game_snapshot_type ON odds_snapshots(game_id, snapshot_type);

-- Game metadata table (for tracking game lifecycle)
CREATE TABLE IF NOT EXISTS game_metadata (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(255) UNIQUE NOT NULL,
  sport_key VARCHAR(100) NOT NULL,
  sport_title VARCHAR(100), -- e.g., "NFL", "NBA", "MLB"
  home_team VARCHAR(255) NOT NULL,
  away_team VARCHAR(255) NOT NULL,
  commence_time TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'live', 'finished'
  opening_line_captured BOOLEAN DEFAULT FALSE,
  closing_line_captured BOOLEAN DEFAULT FALSE,
  last_snapshot_time TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_metadata_status ON game_metadata(status);
CREATE INDEX IF NOT EXISTS idx_game_metadata_commence_time ON game_metadata(commence_time);
CREATE INDEX IF NOT EXISTS idx_game_metadata_sport_key ON game_metadata(sport_key);
CREATE INDEX IF NOT EXISTS idx_game_metadata_sport_title ON game_metadata(sport_title);

-- User saved bets table (writeback feature)
CREATE TABLE IF NOT EXISTS user_saved_bets (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL, -- Firebase UID
  game_id VARCHAR(255) NOT NULL, -- Links to game_metadata
  sport_key VARCHAR(100) NOT NULL, -- For quick filtering
  bookmaker_key VARCHAR(100) NOT NULL, -- e.g., "draftkings", "fanduel"
  market_key VARCHAR(50) NOT NULL, -- "h2h", "spreads", "totals"
  outcome_name VARCHAR(255) NOT NULL, -- Team name or "Over"/"Under"
  
  -- Original locked odds (when saved from dashboard)
  locked_price NUMERIC(10, 2) NOT NULL,
  locked_point NUMERIC(10, 2), -- NULL for h2h, required for spreads/totals
  
  -- Editable odds (user can change these in profile)
  edited_price NUMERIC(10, 2), -- NULL if not edited, otherwise user's edited price
  edited_point NUMERIC(10, 2), -- NULL if not edited, otherwise user's edited point
  
  -- Optional fields
  notes TEXT, -- User notes about the bet
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'won', 'lost', 'void'
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign key to game_metadata
  CONSTRAINT fk_user_bet_game FOREIGN KEY (game_id) REFERENCES game_metadata(game_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_user_id ON user_saved_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_game_id ON user_saved_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_status ON user_saved_bets(status);
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_sport_key ON user_saved_bets(sport_key);
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_created_at ON user_saved_bets(created_at);
CREATE INDEX IF NOT EXISTS idx_user_saved_bets_user_status ON user_saved_bets(user_id, status);

-- User profiles table (for user settings)
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL, -- Firebase UID
  telegram_id VARCHAR(255), -- Telegram user ID or username
  display_name VARCHAR(255), -- Optional display name
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_telegram_id ON user_profiles(telegram_id);
