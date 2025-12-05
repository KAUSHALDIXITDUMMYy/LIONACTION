import dotenv from 'dotenv'

dotenv.config()

interface EnvConfig {
  ODDS_API_KEY: string
  ODDS_API_BASE_URL: string
  PORT: number
  FRONTEND_URL: string
  CACHE_TTL_SECONDS: number
}

function getEnvConfig(): EnvConfig {
  const ODDS_API_KEY = process.env.ODDS_API_KEY
  if (!ODDS_API_KEY) {
    throw new Error('ODDS_API_KEY is required in environment variables')
  }

  return {
    ODDS_API_KEY,
    ODDS_API_BASE_URL: process.env.ODDS_API_BASE_URL || 'https://api.the-odds-api.com/v4',
    PORT: parseInt(process.env.PORT || '8000', 10),
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
  }
}

export const env = getEnvConfig()

