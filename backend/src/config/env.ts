import dotenv from 'dotenv'

dotenv.config()

interface EnvConfig {
  ODDS_API_KEY: string
  ODDS_API_BASE_URL: string
  PORT: number
  FRONTEND_URL: string
  CACHE_TTL_SECONDS: number
  NODE_ENV: string
  DB_HOST: string
  DB_PORT: number
  DB_NAME: string
  DB_USER: string
  DB_PASSWORD: string
}

function validatePort(port: number): number {
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${port}. Must be between 1 and 65535`)
  }
  return port
}

function validateUrl(url: string, name: string): string {
  try {
    new URL(url)
    return url
  } catch {
    throw new Error(`Invalid ${name} URL: ${url}`)
  }
}

function validateCacheTtl(ttl: number): number {
  if (isNaN(ttl) || ttl < 0) {
    throw new Error(`Invalid CACHE_TTL_SECONDS: ${ttl}. Must be >= 0`)
  }
  return ttl
}

function getEnvConfig(): EnvConfig {
  const ODDS_API_KEY = process.env.ODDS_API_KEY
  if (!ODDS_API_KEY || ODDS_API_KEY.trim() === '') {
    throw new Error('ODDS_API_KEY is required in environment variables')
  }

  const PORT = validatePort(parseInt(process.env.PORT || '8000', 10))
  const FRONTEND_URL = validateUrl(
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'FRONTEND_URL'
  )
  const CACHE_TTL_SECONDS = validateCacheTtl(
    parseInt(process.env.CACHE_TTL_SECONDS || '300', 10)
  )

  // Database configuration
  const DB_HOST = process.env.DB_HOST || 'localhost'
  const DB_PORT = validatePort(parseInt(process.env.DB_PORT || '5432', 10))
  const DB_NAME = process.env.DB_NAME || 'odds_dashboard'
  const DB_USER = process.env.DB_USER || 'postgres'
  const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres_password_change_me'

  return {
    ODDS_API_KEY: ODDS_API_KEY.trim(),
    ODDS_API_BASE_URL:
      process.env.ODDS_API_BASE_URL || 'https://api.the-odds-api.com/v4',
    PORT,
    FRONTEND_URL,
    CACHE_TTL_SECONDS,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
  }
}

export const env = getEnvConfig()

