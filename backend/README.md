# LionStrikeAction Backend API

Node.js + Express + TypeScript backend for the LionStrikeAction odds comparison platform.

## Features

- **Caching**: In-memory cache with 5-minute TTL to reduce API calls
- **Request Deduplication**: Prevents duplicate concurrent requests
- **Background Polling**: Automatically polls popular sports every 5 minutes
- **Retry Logic**: Exponential backoff for failed API requests
- **CORS Support**: Configured for cross-origin requests
- **TypeScript**: Full type safety

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your API key:
```
ODDS_API_KEY=your_api_key_here
```

## Development

Run in development mode with hot reload:
```bash
npm run dev
```

The server will start on `http://localhost:8000`

## Production

Build the project:
```bash
npm run build
```

Start the server:
```bash
npm start
```

## API Endpoints

### GET `/api/odds`

Fetch odds for a specific sport.

**Query Parameters:**
- `sport` (optional): Sport key (default: `americanfootball_nfl`)

**Example:**
```
GET http://localhost:8000/api/odds?sport=americanfootball_nfl
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "sport_key": "americanfootball_nfl",
      "home_team": "...",
      "away_team": "...",
      "bookmakers": [...]
    }
  ]
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Environment Variables

- `ODDS_API_KEY`: The Odds API key (required)
- `ODDS_API_BASE_URL`: Base URL for The Odds API (default: https://api.the-odds-api.com/v4)
- `PORT`: Server port (default: 8000)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)
- `CACHE_TTL_SECONDS`: Cache TTL in seconds (default: 300)

## Architecture

- `src/routes/` - API route handlers
- `src/services/` - Business logic (odds, cache, mock generation)
- `src/middleware/` - Express middleware (CORS, error handling)
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions (logger, retry)
- `src/jobs/` - Background jobs (odds polling)
- `src/config/` - Configuration (env, constants)

## Caching Strategy

- Cache-first approach: Check cache before making API calls
- 5-minute TTL per sport
- Background job pre-populates cache for popular sports
- Request deduplication prevents duplicate concurrent requests

