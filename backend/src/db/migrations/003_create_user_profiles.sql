-- Migration: Create user_profiles table for user settings
-- Run this if you already have the database created

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
