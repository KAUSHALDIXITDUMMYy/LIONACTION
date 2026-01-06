# Project Overview: Sports Odds Dashboard

**Document Version:** 1.1.0  
**Last Updated:** January 2, 2026  
**Status:** Production-Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Data Freshness & Update Intervals](#data-freshness--update-intervals)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Database Schema](#database-schema)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Authentication & Authorization](#authentication--authorization)
9. [Data Flow & Polling Mechanism](#data-flow--polling-mechanism)
10. [API Endpoints](#api-endpoints)
11. [Features Implementation Status](#features-implementation-status)
12. [Security Measures](#security-measures)
13. [Performance Optimizations](#performance-optimizations)
14. [Known Limitations](#known-limitations)

---

## Executive Summary

This is a full-stack sports betting odds comparison dashboard that aggregates odds from multiple sportsbooks through periodic polling. The system consists of:

- **Backend:** Node.js/Express API with TypeScript
- **Frontend:** Next.js 16 (React 19) with TypeScript
- **Database:** PostgreSQL with JSONB storage for odds data
- **Authentication:** Firebase Authentication (Google + Email/Password)
- **External API:** The Odds API (https://the-odds-api.com)

**Core Functionality:**
- Periodic odds aggregation from 7 bookmakers (DraftKings, FanDuel, BetMGM, ESPN BET, PointsBet, Caesars, bet365)
- Historical odds tracking with snapshot system
- User bet saving and tracking
- Performance analytics with charts
- Dynamic background polling based on game states

**Important:** This is a **polling-based system**, not a real-time system. Data freshness ranges from 40-100 seconds (live games) to 1+ hours (scheduled games) depending on game state.

---

## Data Freshness & Update Intervals

### Understanding Data Latency

This system uses a **two-tier polling architecture** where data staleness is compounded by both upstream and application-level delays:

```
Sportsbook updates odds
         ↓
The Odds API aggregates & caches
         ↓ (40-60 second intervals)
Our backend polls The Odds API
         ↓ (60 second - 1 hour intervals)
Frontend displays data
```

### The Odds API Update Intervals (Upstream)

The external data source (The Odds API) updates at the following intervals:

| Market Type | Pre-Match Interval | In-Play Interval | Our Usage |
|-------------|-------------------|------------------|-----------|
| **Featured Markets** (h2h, spreads, totals) | 60 seconds | **40 seconds** | ✅ Used |
| Additional Markets (props, alternates) | 60 seconds | 60 seconds | ❌ Not used |
| Outrights / Futures | 5 minutes | 60 seconds | ❌ Not used |
| Betting Exchanges | 30 seconds | 20 seconds | ❌ Not used |

**Source:** The Odds API documentation

### Our Application Polling Intervals

The backend polls The Odds API at dynamic intervals based on game state:

| Game State | Condition | Polling Interval | Total Latency |
|------------|-----------|------------------|---------------|
| **Live** | Game has started | Every 60 seconds | **40-100 seconds** |
| **Pre-Game** | <3 hours until kickoff | Every 2 minutes | **60-180 seconds** |
| **Scheduled** | >3 hours until kickoff | Every 1 hour | **60s - 1 hour** |

### Actual Data Freshness Examples

**Best Case (Live Featured Market):**
- The Odds API last updated: 40 seconds ago
- Our app just polled: 5 seconds ago
- **User sees data that is ~45 seconds old**

**Worst Case (Live Featured Market):**
- The Odds API will update in: 5 seconds
- Our app last polled: 55 seconds ago
- **User sees data that is ~100 seconds old**

**Typical Pre-Game:**
- Data is **1-3 minutes old**

**Scheduled Games (>3 hours away):**
- Data can be **up to 1 hour old**

### User-Initiated Refresh

- **Manual refresh button:** Fetches immediately from The Odds API
- **Rate limit:** 60 seconds per IP address
- **Data freshness after refresh:** 0-40 seconds old (depends on when The Odds API last updated)

### Terminology Clarification

❌ **NOT Real-Time:** Real-time implies <100ms latency  
❌ **NOT Near-Real-Time:** Near-real-time implies 1-2 second latency  
✅ **Periodic Polling System:** Data updates every 40 seconds to 1 hour  
✅ **Delayed Batch Updates:** Two-tier polling with compounded latency

---

## System Architecture

### High-Level Architecture

**Data Flow Latency:** Data passes through two polling layers, resulting in 40 seconds to 1+ hour staleness depending on game state.

```
┌─────────────────┐
│   The Odds API  │ (External - updates every 40-60 seconds)
└────────┬────────┘
         │ (HTTP polling)
         ▼
┌─────────────────────────────────────────┐
│         Backend (Express API)           │
│  ┌─────────────────────────────────┐   │
│  │  Background Jobs (node-cron)    │   │
│  │  - Dynamic Odds Poller          │   │
│  │    • Live: 60s intervals        │   │
│  │    • Pre-game: 2min intervals   │   │
│  │    • Scheduled: 1hr intervals   │   │
│  │  - Evaluator (every 5 min)      │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  API Routes                     │   │
│  │  - /api/odds (rate-limited)     │   │
│  │  - /api/odds/db (no limit)      │   │
│  │  - /api/bets (authenticated)    │   │
│  │  - /api/profile (authenticated) │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Services                       │   │
│  │  - odds.service                 │   │
│  │  - snapshot.service             │   │
│  │  - saved-bets.service           │   │
│  └─────────────────────────────────┘   │
└─────────────┬───────────────────────────┘
              │
              ▼
    ┌─────────────────┐
    │   PostgreSQL    │
    │   - odds_snapshots
    │   - game_metadata
    │   - user_saved_bets
    │   - user_profiles
    └─────────────────┘
              ▲
              │
┌─────────────┴───────────────────────────┐
│      Frontend (Next.js 16)              │
│  ┌─────────────────────────────────┐   │
│  │  Pages                          │   │
│  │  - /odds (Dashboard)            │   │
│  │  - /my-odds (Saved Bets)        │   │
│  │  - /historical-odds (Charts)    │   │
│  │  - /profile                     │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Authentication                 │   │
│  │  - Firebase Auth Context        │   │
│  │  - Protected Routes             │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ▲
              │
    ┌─────────────────┐
    │ Firebase Auth   │
    └─────────────────┘
```

---

## Technology Stack

### Backend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | ≥18.0.0 | Server execution |
| Framework | Express | 5.2.1 | HTTP server |
| Language | TypeScript | 5.9.3 | Type safety |
| Database Driver | pg | 8.11.3 | PostgreSQL client |
| Task Scheduler | node-cron | 4.2.1 | Background jobs |
| CORS | cors | 2.8.5 | Cross-origin requests |
| Environment | dotenv | 17.2.3 | Config management |

**Build:** TypeScript compilation (`tsc`)  
**Dev Mode:** `ts-node-dev` with hot reload

### Frontend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | Next.js | 16.0.0 | React framework |
| React | React | 19.2.0 | UI library |
| Language | TypeScript | 5.x | Type safety |
| UI Library | Radix UI | Various | Accessible components |
| Styling | Tailwind CSS | 4.1.9 | Utility-first CSS |
| Charts | Recharts | 2.15.4 | Data visualization |
| Authentication | Firebase | latest | User auth |
| Forms | React Hook Form | 7.60.0 | Form handling |
| Validation | Zod | 3.25.76 | Schema validation |
| Date Utils | date-fns | 4.1.0 | Date formatting |
| Notifications | Sonner | 1.7.4 | Toast notifications |
| Analytics | Vercel Analytics | latest | Usage tracking |

**Build:** Next.js production build  
**Dev Mode:** Next.js development server (port 3000)

### Database

- **PostgreSQL** (no specific version requirement in code)
- Connection pooling: max 20 connections
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

### External Services

1. **The Odds API** (`https://api.the-odds-api.com/v4`)
   - Purpose: Periodic odds data aggregation
   - Update frequency: 40 seconds (in-play featured markets), 60 seconds (pre-match)
   - Authentication: API key
   - Rate limits: Managed by service provider (usage quota)

2. **Firebase** (Project: `lionstrikeaction`)
   - Authentication (Google OAuth, Email/Password)
   - Firestore (initialized but not actively used in backend logic)

---

## Database Schema

### Table: `odds_snapshots`

Stores historical snapshots of odds data as JSONB.

```sql
CREATE TABLE odds_snapshots (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(255) NOT NULL,
  sport_key VARCHAR(100) NOT NULL,
  commence_time TIMESTAMP NOT NULL,
  snapshot_type VARCHAR(50) NOT NULL, -- 'opening', 'hourly', 'live_60s', 'closing'
  snapshot_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  odds_data JSONB NOT NULL, -- Full OddsEvent object
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_game_id` on `game_id`
- `idx_sport_key` on `sport_key`
- `idx_commence_time` on `commence_time`
- `idx_snapshot_timestamp` on `snapshot_timestamp`
- `idx_snapshot_type` on `snapshot_type`
- `idx_game_snapshot_type` on `(game_id, snapshot_type)`

**Snapshot Types:**
- `opening`: First snapshot when game discovered
- `hourly`: Regular pre-game intervals
- `live_60s`: During live games (60s intervals)
- `closing`: Within 5 min of start or when finished

### Table: `game_metadata`

Tracks game lifecycle and polling status.

```sql
CREATE TABLE game_metadata (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(255) UNIQUE NOT NULL,
  sport_key VARCHAR(100) NOT NULL,
  sport_title VARCHAR(100),
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
```

**Indexes:**
- `idx_game_metadata_status` on `status`
- `idx_game_metadata_commence_time` on `commence_time`
- `idx_game_metadata_sport_key` on `sport_key`
- `idx_game_metadata_sport_title` on `sport_title`

### Table: `user_saved_bets`

Stores user-saved bets with locked and editable odds.

```sql
CREATE TABLE user_saved_bets (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL, -- Firebase UID
  game_id VARCHAR(255) NOT NULL,
  sport_key VARCHAR(100) NOT NULL,
  bookmaker_key VARCHAR(100) NOT NULL,
  market_key VARCHAR(50) NOT NULL, -- 'h2h', 'spreads', 'totals'
  outcome_name VARCHAR(255) NOT NULL,
  
  -- Original locked odds
  locked_price NUMERIC(10, 2) NOT NULL,
  locked_point NUMERIC(10, 2), -- NULL for h2h
  
  -- User-editable odds
  edited_price NUMERIC(10, 2),
  edited_point NUMERIC(10, 2),
  
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'won', 'lost', 'void'
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_user_bet_game FOREIGN KEY (game_id) REFERENCES game_metadata(game_id)
);
```

**Indexes:**
- `idx_user_saved_bets_user_id` on `user_id`
- `idx_user_saved_bets_game_id` on `game_id`
- `idx_user_saved_bets_status` on `status`
- `idx_user_saved_bets_sport_key` on `sport_key`
- `idx_user_saved_bets_created_at` on `created_at`
- `idx_user_saved_bets_user_status` on `(user_id, status)`

**Foreign Key Behavior:**
- If `game_id` doesn't exist in `game_metadata`, a placeholder entry is created with "Unknown Team" values
- This allows bets to be saved even before the game is polled

### Table: `user_profiles`

Stores user settings and preferences.

```sql
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL, -- Firebase UID
  telegram_id VARCHAR(255), -- Currently unused
  display_name VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_user_profiles_user_id` on `user_id`
- `idx_user_profiles_telegram_id` on `telegram_id`

**Note:** Telegram integration is defined in schema but not implemented in application logic.

---

## Backend Implementation

### Server Configuration

**File:** `backend/src/server.ts`

- Starts Express server on configured port (default 8000)
- Initializes background odds poller
- Implements graceful shutdown handlers (SIGTERM, SIGINT)
- Handles uncaught exceptions and unhandled promise rejections
- Logs startup status including poller initialization

**Environment Variables (required):**
```bash
ODDS_API_KEY=<api_key>              # Required
ODDS_API_BASE_URL=<url>             # Default: https://api.the-odds-api.com/v4
PORT=8000                            # Default: 8000
FRONTEND_URL=http://localhost:3000  # Default: http://localhost:3000
DB_HOST=localhost                    # Default: localhost
DB_PORT=5432                         # Default: 5432
DB_NAME=odds_dashboard               # Default: odds_dashboard
DB_USER=postgres                     # Default: postgres
DB_PASSWORD=<password>               # Default: postgres_password_change_me
CACHE_TTL_SECONDS=300                # Default: 300
NODE_ENV=development                 # Default: development
```

### Middleware Stack

**File:** `backend/src/app.ts`

Middleware execution order:
1. **JSON/URL-encoded body parser** (10MB limit)
2. **Request logger** (logs all requests with request ID, duration)
3. **CORS middleware** (allows frontend origin)
4. **Security headers:**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
5. **Route handlers**
6. **404 handler**
7. **Error middleware** (catches and formats errors)

### Services

#### 1. Database Service (`database.service.ts`)

- Connection pooling with pg Pool
- Max 20 connections
- Helper functions:
  - `query<T>(text, params)`: Execute parameterized queries
  - `getClient()`: Get client for transactions
- Tests connection on startup
- Logs all query errors

#### 2. Odds Service (`odds.service.ts`)

**Responsibilities:**
- Fetch odds from The Odds API
- Apply mock data generation (if enabled via `mock-odds.service`)
- Request deduplication (prevents duplicate concurrent API calls)
- Retry logic with exponential backoff

**Configured Bookmakers:**
- draftkings, fanduel, betmgm, espnbet, pointsbetus, caesars, bet365

**Markets:**
- h2h (moneyline), spreads, totals

**Odds Format:** American

**Key Method:**
```typescript
async getOdds(sport: string): Promise<OddsEvent[]>
```

#### 3. Snapshot Service (`snapshot.service.ts`)

**Responsibilities:**
- Save odds snapshots to database
- Determine snapshot type based on game state
- Manage game metadata lifecycle
- Retrieve latest odds from database
- Provide historical odds for charting

**Snapshot Type Logic:**
- **Opening:** First snapshot for a game
- **Closing:** Within 5 minutes of start OR game finished
- **Live (60s):** Game has started (commence_time <= now)
- **Hourly:** Default for scheduled games

**Key Methods:**
```typescript
async saveSnapshot(event: OddsEvent, snapshotType?: SnapshotType): Promise<void>
async saveSnapshots(events: OddsEvent[]): Promise<void>
async getLatestOddsFromDB(sport: string): Promise<OddsEvent[]>
async getHistoricalOdds(gameId: string, marketKey?: string): Promise<...>
async getSportPollingInterval(sport: string): Promise<number>
```

**Polling Interval Determination:**
- Returns 60 seconds if any game is live
- Returns 120 seconds if any game starts within 3 hours
- Returns 3600 seconds (1 hour) otherwise

#### 4. Saved Bets Service (`saved-bets.service.ts`)

**Responsibilities:**
- CRUD operations for user bets
- Analytics calculations (win rate by week/sport)
- Statistics aggregation

**Key Methods:**
```typescript
async createBet(input: CreateBetInput): Promise<SavedBet>
async getUserBets(userId: string): Promise<SavedBet[]>
async getBetsForGame(userId: string, gameId: string): Promise<SavedBet[]>
async updateBet(betId, userId, updates): Promise<SavedBet>
async deleteBet(betId, userId): Promise<void>
async getUserAnalytics(userId, startDate?, endDate?): Promise<...>
async getUserBetStats(userId): Promise<...>
```

**Analytics Implementation:**
- Only includes bets with status 'won' or 'lost' (excludes 'pending' and 'void')
- Groups by ISO week (Monday start)
- Calculates win rate: `(wins / (wins + losses)) * 100`
- Normalizes status values with `LOWER(TRIM(status))`

#### 5. User Profile Service (`user-profile.service.ts`)

**Responsibilities:**
- Get or create user profiles
- Update profile fields (telegram_id, display_name)

**Note:** Telegram ID field exists but no Telegram bot integration is implemented.

### Background Jobs

**File:** `backend/src/jobs/odds-poller.job.ts`

#### Dynamic Odds Poller

**Architecture:**
- Evaluator runs every 5 minutes
- Per-sport pollers with dynamic intervals
- Uses node-cron for scheduling

**Sports Monitored:**
- `americanfootball_nfl`
- `basketball_nba`
- `baseball_mlb`

**Polling Intervals:**
| Interval | Condition | Cron Expression |
|----------|-----------|-----------------|
| 60 seconds | Game is live | `*/1 * * * *` |
| 2 minutes | Pre-game (<3 hours) | `*/2 * * * *` |
| 1 hour | Default | `0 * * * *` |

**Flow:**
1. Every 5 minutes: Evaluator checks `game_metadata` table
2. For each sport, determine optimal interval via `getSportPollingInterval()`
3. Stop existing cron job for sport (if any)
4. Create new cron job with updated interval
5. At polling intervals: Fetch odds and save snapshots

**Implementation Details:**
- Each sport has its own cron task stored in `sportCronTasks` Map
- Tasks can be dynamically started/stopped
- Continues on error (doesn't crash if one sport fails)

---

## Frontend Implementation

### Framework & Routing

- **Framework:** Next.js 16 (App Router)
- **React Version:** 19.2.0
- **Rendering:** Client-side components (`"use client"`)

**Route Structure:**
```
/                   → Landing page (page.tsx)
/odds               → Main odds dashboard
/my-odds            → Saved bets & analytics
/historical-odds    → Historical odds charts
/profile            → User profile settings
/login              → Login page
/signup             → Signup page
/account            → Account settings
```

### Authentication

**File:** `LIONACTION/lib/auth-context.tsx`

**Implementation:**
- Firebase Authentication SDK
- Context API for global auth state
- `onAuthStateChanged` listener

**Supported Methods:**
- Email/password signup and login
- Google Sign-In (OAuth popup)
- Logout

**Auth Context API:**
```typescript
{
  user: User | null,
  loading: boolean,
  signUp: (email, password) => Promise<void>,
  signIn: (email, password) => Promise<void>,
  signInWithGoogle: () => Promise<void>,
  logout: () => Promise<void>
}
```

**Protected Routes:**
- Component: `ProtectedRoute` (`protected-route.tsx`)
- Redirects to `/login` if not authenticated
- Shows loading state during auth check

### Key Pages

#### 1. Odds Dashboard (`/odds`)

**File:** `LIONACTION/app/odds/page.tsx`

**Features:**
- Sport selector (NFL, NBA, MLB, NHL, College Football, College Basketball)
- Market selector (Moneyline, Spread, Totals)
- Team search functionality
- Refresh button with rate limiting
- Odds table with expandable rows

**Data Fetching:**
- Initial load: `GET /api/odds/db?sport={sport}` (no rate limit)
- Refresh button: `GET /api/odds?sport={sport}` (60s rate limit)
- Sport change: Triggers database fetch (instant)

**Data Freshness:**
- Displayed odds are from the most recent snapshot in database
- Age depends on last background poll: 0-60 seconds (live), 0-2 minutes (pre-game), 0-1 hour (scheduled)
- Manual refresh fetches from The Odds API but data is still 0-40 seconds old at source

**Rate Limit Handling:**
- Displays countdown timer when rate limited
- Disables refresh button during countdown
- Shows error message with remaining seconds

**State Management:**
```typescript
- events: OddsEvent[]
- loading: boolean
- sport: string (default: "americanfootball_nfl")
- market: string (default: "h2h")
- searchQuery: string
- rateLimitCountdown: number | null
```

#### 2. My Odds Page (`/my-odds`)

**File:** `LIONACTION/app/my-odds/page.tsx`

**Features:**
- Analytics section (via ref)
- Bet statistics cards
- List of saved bets
- Edit bet dialog (odds, notes, status)
- Delete bet functionality

**Data Fetching:**
```typescript
// Initial load
GET /api/bets           // Fetch all bets
GET /api/bets/stats     // Fetch statistics

// After edit/delete
analyticsRef.current?.refresh()  // Trigger analytics refresh
```

**Edit Dialog Fields:**
- Edited Price (American odds)
- Edited Point (for spreads/totals)
- Notes (text area)
- Status (pending/won/lost/void)

**Bet Display:**
- Color-coded status badges
- Locked vs edited odds comparison
- Game information (teams, commence time)
- Bookmaker and market badges

#### 3. Historical Odds Page (`/historical-odds`)

**File:** `LIONACTION/app/historical-odds/page.tsx`

**Features:**
- Sport selector
- Game dropdown
- Market selector
- Line chart with multiple bookmaker lines
- Saved odds highlighting (amber dots)
- Snapshot count and type breakdown

**Data Fetching:**
```typescript
GET /api/odds/db?sport={sport}              // Get available games
GET /api/odds/historical?game_id={id}       // Get snapshots
GET /api/odds/debug/snapshots?game_id={id}  // Debug info
GET /api/bets/game/{gameId}                 // Get saved bets for highlighting
```

**Chart Implementation:**
- Uses Recharts `<LineChart>` component
- One line per bookmaker
- X-axis: Timestamp labels
- Y-axis: American odds
- Custom dot rendering for saved odds
- Tooltip shows all bookmaker odds at timestamp

**Saved Odds Highlighting:**
- Compares saved bet price/point with snapshot data
- Highlights matching data points with amber color
- Shows bookmark icon in tooltip
- Tolerance: 0.01 for floating-point comparison

#### 4. Profile Page (`/profile`)

**File:** `LIONACTION/app/profile/page.tsx`

**Features:**
- Display name editing
- Telegram ID field (inactive)
- User email display (read-only from Firebase)

**Data Fetching:**
```typescript
GET /api/profile      // Get or create profile
PATCH /api/profile    // Update profile fields
```

### Components

#### Analytics Section (`analytics-section.tsx`)

**Features:**
- Overall win rate card
- This week stats card
- Best sport card
- Weekly trend line chart (last 8 weeks)
- Win rate by sport bar chart

**Ref API:**
```typescript
interface AnalyticsSectionRef {
  refresh: () => void
}
```

**Implementation:**
- Uses `forwardRef` and `useImperativeHandle`
- Parent can call `analyticsRef.current?.refresh()`
- Automatically called after bet edit/delete

**Data Processing:**
- Fetches from `GET /api/bets/analytics`
- Filters for 'won' and 'lost' status only
- Groups by ISO week (Monday start)
- Sorts sports by win rate descending

**Empty State:**
- Shows message when no resolved bets exist
- Explains that pending/void bets are excluded

#### Odds Table (`odds-table.tsx`)

**Features:**
- Expandable row per game
- Shows best odds per bookmaker
- Highlights line movements
- Save bet button (authenticated users)

**Saved Bet Flow:**
1. User clicks "Save" on specific odds
2. `POST /api/bets` with bet details
3. Toast notification on success
4. Bet appears in My Odds page

#### Odds Selector (`odds-selector.tsx`)

**Features:**
- Visual sport icons
- Active sport highlighting
- Responsive grid layout

**Sports Available:**
- NFL, NBA, MLB, NHL, College Football, College Basketball

### Utilities

**File:** `LIONACTION/lib/utils.ts`

**Key Functions:**
```typescript
// Get API URL (backend)
function getApiUrl(): string
  // Returns: 'http://localhost:8000' or production URL

// Get auth headers with Firebase UID
function getAuthHeaders(userId: string): HeadersInit
  // Returns: { 'Authorization': 'Bearer {userId}', ... }

// Format odds for display
function formatOdds(price: number, market: string, point?: number): string
  // Examples: "+150", "-110 (-3.5)", "Over 45.5 (-115)"

// Convert decimal to American odds
function decimalToAmerican(decimal: number): number
  // 1.5 → -200, 2.5 → +150
```

---

## Authentication & Authorization

### Authentication Flow

1. **User Login:**
   - Frontend: Firebase Auth (email/password or Google)
   - Firebase returns user object with UID
   - UID stored in auth context

2. **API Requests:**
   - Frontend includes `Authorization: Bearer {uid}` header
   - Backend `authMiddleware` extracts UID
   - UID attached to `req.userId`

3. **Authorization:**
   - All `/api/bets/*` routes require authentication
   - All `/api/profile/*` routes require authentication
   - `/api/odds/*` routes are public (rate-limited)

### Backend Auth Middleware

**File:** `backend/src/middleware/auth.middleware.ts`

**Implementation:**
```typescript
// Accepts user ID from:
1. Authorization header: "Bearer {uid}"
2. Request body: user_id field
3. Query parameter: ?user_id={uid}

// IMPORTANT: Does NOT verify Firebase tokens
// Accepts UID directly (trust-based)
```

**Security Note:**
- Current implementation accepts UID without verification
- Production systems should verify Firebase ID tokens using Firebase Admin SDK
- Comment in code: "In production, you'd verify the Firebase token here"

### Data Isolation

- All user data queries filter by `user_id`
- Update/delete operations verify ownership
- SQL: `WHERE user_id = $1 AND id = $2`

---

## Data Flow & Polling Mechanism

### Background Polling Flow

```
Every 5 minutes (Evaluator):
  ├─ Query game_metadata for all sports
  ├─ Determine interval for NFL
  │   └─ If live games → 60s
  │   └─ If pre-game (<3h) → 2min
  │   └─ Else → 1 hour
  ├─ Update NFL poller cron job
  ├─ Determine interval for NBA
  └─ ... (repeat for all sports)

At polling intervals (per sport):
  ├─ Fetch odds from The Odds API
  ├─ For each game:
  │   ├─ Determine snapshot type
  │   ├─ Save to odds_snapshots table
  │   └─ Update game_metadata
  └─ Log results
```

### User-Initiated Refresh Flow

```
User clicks "Refresh" button:
  ├─ Check rate limit (IP-based)
  ├─ If rate limited:
  │   ├─ Return 429 with retryAfter
  │   └─ Frontend shows countdown timer
  ├─ Else:
  │   ├─ Fetch from The Odds API
  │   ├─ Save snapshot to database
  │   ├─ Return fresh odds to frontend
  │   └─ Set rate limit timestamp
```

### Sport Change Flow

```
User selects different sport:
  ├─ Trigger fetchOddsFromDB()
  ├─ Query: SELECT DISTINCT ON (game_id) ... WHERE sport_key = $1
  ├─ Return latest snapshot for each game
  └─ No rate limiting (instant response)
```

### Bet Save Flow

```
User saves bet from odds table:
  ├─ POST /api/bets with game/odds details
  ├─ Check if game_id exists in game_metadata
  ├─ If not, create placeholder entry
  ├─ Insert into user_saved_bets
  ├─ Return saved bet
  └─ Frontend shows toast notification
```

### Analytics Calculation Flow

```
Analytics section loads:
  ├─ GET /api/bets/analytics
  ├─ Query 1: Overall stats (status IN ('won', 'lost'))
  ├─ Query 2: Weekly stats (GROUP BY ISO week)
  ├─ Query 3: Sport stats (GROUP BY sport_key)
  ├─ Query 4: Get sport titles from game_metadata
  ├─ Aggregate and calculate win rates
  └─ Return { overall, byWeek, bySport }

After bet edit/delete:
  ├─ Update bet in database
  ├─ Refetch bet list
  └─ Call analyticsRef.current?.refresh()
```

---

## API Endpoints

### Public Endpoints (No Auth Required)

#### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-02T12:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

#### GET `/api/odds/db`

Fetch latest odds from database (no rate limit).

**Query Parameters:**
- `sport` (string, optional): Sport key (default: `americanfootball_nfl`)

**Response:**
```json
{
  "data": [
    {
      "id": "abc123",
      "sport_key": "americanfootball_nfl",
      "sport_title": "NFL",
      "commence_time": "2026-01-05T18:00:00Z",
      "home_team": "Kansas City Chiefs",
      "away_team": "Buffalo Bills",
      "bookmakers": [...]
    }
  ]
}
```

#### GET `/api/odds`

Fetch fresh odds from external API (60s rate limit per IP).

**Rate Limit:** 60 seconds per IP address

**Query Parameters:**
- `sport` (string, optional): Sport key

**Success Response (200):**
```json
{
  "data": [...] // Same format as /api/odds/db
}
```

**Rate Limited Response (429):**
```json
{
  "error": "Too many requests",
  "message": "Please wait 45 seconds before refreshing again.",
  "retryAfter": 45
}
```

#### GET `/api/odds/historical`

Fetch historical odds snapshots for a game.

**Query Parameters:**
- `game_id` (string, required): Game ID
- `market` (string, optional): Market key filter

**Response:**
```json
{
  "data": [
    {
      "snapshot_timestamp": "2026-01-05T12:00:00Z",
      "snapshot_type": "hourly",
      "odds_data": { /* OddsEvent object */ }
    }
  ]
}
```

#### GET `/api/odds/debug/snapshots`

Debug endpoint to check snapshot counts for a game.

**Query Parameters:**
- `game_id` (string, required)

**Response:**
```json
{
  "game_id": "abc123",
  "total_snapshots": 15,
  "by_type": [
    {
      "type": "opening",
      "count": 1,
      "first": "2026-01-04T10:00:00Z",
      "last": "2026-01-04T10:00:00Z"
    },
    {
      "type": "hourly",
      "count": 12,
      "first": "2026-01-04T11:00:00Z",
      "last": "2026-01-05T10:00:00Z"
    }
  ]
}
```

### Authenticated Endpoints

**Authentication:** Requires `Authorization: Bearer {firebase_uid}` header

#### POST `/api/bets`

Create a new saved bet.

**Request Body:**
```json
{
  "game_id": "abc123",
  "sport_key": "americanfootball_nfl",
  "bookmaker_key": "draftkings",
  "market_key": "h2h",
  "outcome_name": "Kansas City Chiefs",
  "locked_price": -150,
  "locked_point": null,
  "notes": "Optional notes"
}
```

**Response (201):**
```json
{
  "data": {
    "id": 1,
    "user_id": "firebase_uid",
    "game_id": "abc123",
    // ... all bet fields
    "created_at": "2026-01-02T12:00:00Z"
  }
}
```

#### GET `/api/bets`

Get all bets for authenticated user.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "game_id": "abc123",
      // ... all bet fields
      "game_info": {
        "home_team": "...",
        "away_team": "...",
        "sport_title": "NFL",
        "commence_time": "...",
        "status": "scheduled"
      }
    }
  ]
}
```

#### GET `/api/bets/game/:gameId`

Get saved bets for a specific game.

**Response:** Same format as `/api/bets`

#### GET `/api/bets/stats`

Get bet statistics for user.

**Response:**
```json
{
  "data": {
    "total": 25,
    "pending": 10,
    "won": 8,
    "lost": 7,
    "winRate": 53.33
  }
}
```

#### GET `/api/bets/analytics`

Get analytics data (win rates by week/sport).

**Query Parameters:**
- `startDate` (ISO string, optional): Filter start date
- `endDate` (ISO string, optional): Filter end date

**Response:**
```json
{
  "data": {
    "overall": {
      "wins": 8,
      "losses": 7,
      "winRate": 53.33,
      "total": 15
    },
    "byWeek": [
      {
        "week": "2026-W01",
        "weekStart": "2025-12-30",
        "weekEnd": "2026-01-05",
        "wins": 3,
        "losses": 2,
        "winRate": 60.0,
        "total": 5
      }
    ],
    "bySport": [
      {
        "sport_key": "americanfootball_nfl",
        "sport_title": "NFL",
        "wins": 5,
        "losses": 3,
        "winRate": 62.5,
        "total": 8
      }
    ]
  }
}
```

#### GET `/api/bets/analytics/debug`

Debug endpoint showing raw bet status breakdown.

**Response:**
```json
{
  "user_id": "firebase_uid",
  "total_bets": 25,
  "all_bets": [...],
  "status_breakdown": [...],
  "won_lost_bets": [...],
  "won_lost_count": 15
}
```

#### GET `/api/bets/:id`

Get a single bet by ID.

**Response:**
```json
{
  "data": { /* SavedBet object */ }
}
```

**Error (404):**
```json
{
  "error": "Not found",
  "message": "Bet not found"
}
```

#### PATCH `/api/bets/:id`

Update a bet.

**Request Body:**
```json
{
  "edited_price": -140,
  "edited_point": null,
  "notes": "Updated notes",
  "status": "won"
}
```

**Valid Status Values:** `pending`, `won`, `lost`, `void`

**Response:**
```json
{
  "data": { /* Updated SavedBet */ }
}
```

#### DELETE `/api/bets/:id`

Delete a bet.

**Response:** 204 No Content

#### GET `/api/profile`

Get user profile (creates if doesn't exist).

**Response:**
```json
{
  "data": {
    "id": 1,
    "user_id": "firebase_uid",
    "telegram_id": null,
    "display_name": "John Doe",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-02T12:00:00Z"
  }
}
```

#### PATCH `/api/profile`

Update user profile.

**Request Body:**
```json
{
  "telegram_id": "@johndoe",
  "display_name": "John Doe"
}
```

**Response:**
```json
{
  "data": { /* Updated profile */ }
}
```

---

## Features Implementation Status

### ✅ Fully Implemented

| Feature | Description | Files |
|---------|-------------|-------|
| **Periodic Odds Fetching** | External API integration with The Odds API (40s-1hr latency) | `odds.service.ts` |
| **Dynamic Background Polling** | Adjusts intervals based on game state (60s/2min/1hr) | `odds-poller.job.ts` |
| **Snapshot System** | Historical odds tracking with 4 types | `snapshot.service.ts` |
| **User Authentication** | Firebase Auth (Google + Email/Password) | `auth-context.tsx`, `firebase.ts` |
| **Bet Saving** | Save odds with locked and editable values | `saved-bets.service.ts` |
| **Bet Management** | CRUD operations for saved bets | `/api/bets` routes |
| **Analytics Dashboard** | Win rate charts by week/sport | `analytics-section.tsx` |
| **Historical Odds Charts** | Line charts showing odds movement | `historical-odds/page.tsx` |
| **Rate Limiting** | 60s cooldown for API refresh | `rate-limit.middleware.ts` |
| **Odds Search** | Filter games by team name | `/odds` page |
| **Responsive Design** | Mobile-friendly UI with Tailwind | All pages |
| **Dark Mode** | Theme toggle with next-themes | `theme-provider.tsx` |
| **Toast Notifications** | Success/error messages with Sonner | Throughout app |
| **Request Logging** | Structured logging with request IDs | `logger.ts`, `app.ts` |
| **Error Handling** | Global error middleware | `error.middleware.ts` |
| **Database Pooling** | Connection reuse with pg Pool | `database.service.ts` |
| **Graceful Shutdown** | Signal handlers for clean exit | `server.ts` |

### 🚧 Partially Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| **Mock Odds Generation** | Code exists | `mock-odds.service.ts` present but implementation unclear |
| **Request Deduplication** | Code exists | `request-deduplication.service.ts` present but not examined in detail |
| **Telegram Integration** | Schema only | `telegram_id` field in database, no bot implementation |

### ❌ Not Implemented

| Feature | Notes |
|---------|-------|
| **Real Firebase Token Verification** | Auth middleware accepts UID directly without verification |
| **Websocket Live Updates** | All updates are poll-based |
| **Email Notifications** | No email service integration |
| **Push Notifications** | No push notification system |
| **Odds Comparison Alerts** | No alert/notification system for line movements |
| **Admin Dashboard** | No admin-specific routes or features |
| **CSV Export** | No data export functionality |
| **Multi-language Support** | English only |
| **A/B Testing** | No feature flag system |
| **Database Migrations System** | No migration framework (only init.sql) |

---

## Security Measures

### ✅ Implemented

1. **CORS Protection**
   - Configured to allow frontend origin only
   - Credentials enabled

2. **Security Headers**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`

3. **Request Size Limits**
   - JSON body: 10MB max
   - URL-encoded: 10MB max

4. **SQL Injection Prevention**
   - Parameterized queries throughout
   - No string concatenation in SQL

5. **Rate Limiting**
   - 60-second cooldown on external API calls
   - IP-based tracking
   - Automatic cleanup of old entries

6. **User Data Isolation**
   - All queries filter by `user_id`
   - Ownership verification on updates/deletes

7. **Input Validation**
   - Sport parameter sanitization
   - Status enum validation
   - Numeric parsing with checks

8. **Error Information Hiding**
   - Generic error messages to clients
   - Detailed logs server-side only

### ⚠️ Security Concerns

1. **Firebase Token Verification Missing**
   - Current auth accepts UID without verification
   - **Impact:** Anyone can impersonate any user if they know the UID
   - **Recommendation:** Implement Firebase Admin SDK token verification

2. **API Key Exposure Risk**
   - ODDS_API_KEY in environment variables
   - **Recommendation:** Use secret management service in production

3. **No HTTPS Enforcement**
   - No redirect from HTTP to HTTPS
   - **Recommendation:** Implement HTTPS-only in production

4. **No Request ID Sanitization**
   - User-agent logged as-is
   - **Recommendation:** Sanitize logged data

5. **Database Password in Plain Text**
   - `.env` file stores password
   - **Recommendation:** Use secret management or environment variable injection

6. **No Account Lockout**
   - No protection against brute force on Firebase Auth
   - **Recommendation:** Implement rate limiting on auth endpoints

---

## Performance Optimizations

### ✅ Implemented

1. **Database Connection Pooling**
   - Max 20 connections
   - Connection reuse
   - Idle timeout: 30s

2. **Database Indexing**
   - 15 indexes across all tables
   - Composite indexes for common queries
   - Index on foreign keys

3. **Request Deduplication**
   - Prevents duplicate concurrent API calls
   - Reduces external API usage

4. **Efficient Database Queries**
   - `DISTINCT ON` for latest snapshots
   - Aggregations pushed to database
   - JOINs for related data

5. **JSONB Storage**
   - Efficient storage of odds data
   - No need for complex relational structure

6. **Retry Logic with Backoff**
   - Exponential backoff for failed API calls
   - Prevents API rate limit exhaustion

7. **Client-Side Caching**
   - React state management
   - Memoized computations with `useMemo`

8. **Lazy Loading**
   - Analytics only load when needed
   - Historical data fetched on demand

### 🔍 Potential Optimizations

1. **Add Redis Caching**
   - Cache latest odds per sport
   - Reduce database load
   - TTL: 1-5 minutes

2. **Database Query Optimization**
   - Add query result caching
   - Optimize JOIN operations
   - Consider materialized views

3. **Frontend Code Splitting**
   - Lazy load chart libraries
   - Split by route

4. **Image Optimization**
   - Next.js Image component
   - WebP format

5. **API Response Compression**
   - gzip/brotli middleware
   - Reduce bandwidth

6. **Batch Database Operations**
   - Bulk inserts for snapshots
   - Transaction optimization

---

## Known Limitations

### Technical Limitations

1. **Two-Tier Polling Architecture with Compounded Latency**
   - **Upstream:** The Odds API updates every 40-60 seconds (not real-time)
   - **Application:** Backend polls every 60 seconds to 1 hour
   - **Result:** Data is 40-100+ seconds stale depending on game state
   - No push updates, websockets, or sub-second refresh capability
   - Manual refresh rate limit: 60 seconds per IP

2. **External API Dependency & Inherent Limitations**
   - Relies on The Odds API availability
   - **Data source limitation:** The Odds API itself only updates every 40-60 seconds
   - Rate limits imposed by provider (usage quota)
   - API quota can be exhausted
   - **Real-time/near-real-time impossible:** Even with faster polling, data would still be 40+ seconds stale due to upstream caching

3. **No Automatic Game Status Updates**
   - Game status (scheduled/live/finished) inferred from time
   - No integration with official game results API
   - Users must manually update bet status

4. **Limited Historical Data Retention**
   - No automatic cleanup of old snapshots
   - Database size grows unbounded
   - No archival strategy

5. **Single Region Deployment**
   - No multi-region support
   - Latency for distant users

6. **In-Memory Rate Limiting**
   - Rate limit state lost on server restart
   - No distributed rate limiting

### Functional Limitations

1. **No Bet Tracking Automation**
   - Users must manually mark bets as won/lost
   - No integration with sportsbook APIs for result tracking
   - No automatic status updates based on game results

2. **Limited Analytics Period**
   - Analytics show all-time + weekly breakdown
   - No custom date range filtering in UI
   - Historical analysis limited to data retention

3. **No Bankroll Management**
   - No bet amount tracking
   - No profit/loss calculations
   - No unit sizing features

4. **Limited Notification System**
   - No alerts for line movements
   - No bet reminders
   - No game start notifications

5. **Single User Profile**
   - No multi-profile support (e.g., multiple betting strategies)
   - No profile sharing or following

6. **No Mobile App**
   - Web-only interface
   - No native mobile features (push notifications, offline mode)

### Data Limitations

1. **Sportsbooks Coverage**
   - Limited to 7 configured bookmakers
   - No user-selectable bookmaker filtering in database queries

2. **Sports Coverage**
   - Background polling only for NFL, NBA, MLB
   - Other sports (NHL, College) require manual refresh

3. **Market Types**
   - Only h2h, spreads, totals
   - No props, parlays, futures

4. **No International Odds Formats**
   - American odds only
   - No decimal or fractional formats

---

## Deployment Notes

### Backend Deployment

**Requirements:**
- Node.js ≥18.0.0
- PostgreSQL database
- Environment variables configured

**Steps:**
```bash
cd backend
npm install
npm run build    # Compiles TypeScript
npm start        # Runs dist/server.js
```

**Database Setup:**
```sql
-- Run init.sql
psql -U postgres -d odds_dashboard -f src/db/init.sql
```

### Frontend Deployment

**Requirements:**
- Node.js ≥18.0.0
- Backend API URL configured

**Steps:**
```bash
cd LIONACTION
npm install
npm run build    # Next.js production build
npm start        # Runs production server
```

**Environment Variables:**
- No `.env` file in codebase for frontend
- API URL determined by `getApiUrl()` function (hardcoded)

### Production Considerations

1. **Use Process Manager**
   - PM2 recommended for backend
   - Handle restarts and logging

2. **Reverse Proxy**
   - Nginx/Apache in front of Express
   - SSL termination

3. **Database Backups**
   - Regular PostgreSQL dumps
   - Point-in-time recovery enabled

4. **Monitoring**
   - Application performance monitoring
   - Error tracking (e.g., Sentry)

5. **Logging**
   - Structured JSON logs
   - Log aggregation service

6. **Secret Management**
   - Use AWS Secrets Manager or similar
   - Rotate API keys regularly

---

## Maintenance & Operations

### Regular Maintenance Tasks

1. **Database Cleanup**
   - Archive old odds snapshots (>30 days)
   - Vacuum and analyze tables
   - Reindex if needed

2. **Log Rotation**
   - Rotate application logs
   - Clean up old log files

3. **Dependency Updates**
   - Regular security updates
   - Test before deploying

4. **API Key Rotation**
   - Rotate ODDS_API_KEY periodically
   - Update environment variables

### Monitoring Recommendations

**Key Metrics:**
- API response times
- Database connection pool usage
- External API call count and errors
- Rate limit hits
- User authentication failures
- Background job execution status

**Alerts:**
- Database connection failures
- External API errors (>5% error rate)
- Background poller failures
- High response times (>2s for 95th percentile)
- Disk space <20%

### Troubleshooting

**Common Issues:**

1. **Background Poller Not Running**
   - Check server logs for startup errors
   - Verify database connectivity
   - Check ODDS_API_KEY validity

2. **Rate Limiting Too Aggressive**
   - Adjust `RATE_LIMIT_WINDOW` in `rate-limit.middleware.ts`
   - Clear rate limit store on restart (already automatic)

3. **Analytics Not Updating**
   - Check bet status values (must be 'won' or 'lost')
   - Verify `LOWER(TRIM(status))` normalization
   - Check query logs for errors

4. **Historical Charts Empty**
   - Verify snapshots exist: `SELECT COUNT(*) FROM odds_snapshots WHERE game_id = ?`
   - Check background poller is running
   - Verify sport is in `POPULAR_SPORTS` array

---

## Code Quality & Testing

### Current State

**Testing:**
- ❌ No unit tests found
- ❌ No integration tests
- ❌ No E2E tests

**Type Safety:**
- ✅ TypeScript used throughout
- ✅ Interfaces defined for data structures
- ⚠️ Some `any` types used (e.g., in request handling)

**Code Organization:**
- ✅ Clear separation of concerns (routes/services/middleware)
- ✅ Consistent file naming
- ✅ Logical folder structure

**Documentation:**
- ✅ `POLLING_AND_REFRESH_FEATURES.md` exists
- ⚠️ No JSDoc comments in most files
- ⚠️ No API documentation (OpenAPI/Swagger)

### Recommendations

1. **Add Unit Tests**
   - Test service methods
   - Test utility functions
   - Target: 80%+ coverage

2. **Add Integration Tests**
   - Test API endpoints
   - Test database operations
   - Use test database

3. **Add E2E Tests**
   - Test critical user flows
   - Use Playwright or Cypress

4. **Improve Type Safety**
   - Remove `any` types
   - Add stricter TypeScript config
   - Validate API responses with Zod

5. **API Documentation**
   - Generate OpenAPI spec
   - Add Swagger UI

---

## Conclusion

This is a **production-ready** sports odds dashboard with comprehensive features for odds comparison, bet tracking, and performance analytics. The system uses a **polling-based architecture** with data freshness ranging from 40-100 seconds (live games) to 1+ hours (scheduled games).

**Strengths:**
- Dynamic polling system that adapts to game states (60s/2min/1hr intervals)
- Comprehensive historical data tracking with snapshot system
- User-friendly analytics dashboard with charts
- Responsive design with modern UI
- Robust error handling and logging
- Efficient database design with JSONB storage

**Priority Improvements:**
1. Implement Firebase token verification (security)
2. Add automated bet result tracking
3. Implement comprehensive testing
4. Add database migration system
5. Set up monitoring and alerting

**Tech Debt:**
- Firebase token verification missing
- No test coverage
- In-memory rate limiting
- Manual bet status updates
- No database migration framework

**Data Freshness Characteristics:**
- **Not real-time** (real-time = <100ms latency)
- **Not near-real-time** (near-real-time = 1-2 second latency)
- **Polling-based system** with two-tier latency:
  - Upstream: The Odds API updates every 40-60 seconds
  - Application: Polls every 60 seconds to 1 hour
  - Total: Data is 40-100+ seconds to 1+ hour stale

The codebase demonstrates solid engineering practices with room for enhancement in security verification, automated testing, and operational tooling.

