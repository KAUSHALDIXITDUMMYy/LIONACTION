# 🔄 Polling & Refresh Features

> Quick reference guide for all automatic polling and manual refresh mechanisms in the Odds Dashboard

---

## 📊 Backend Polling Jobs

### Dynamic Odds Poller (`odds-poller.job.ts`)

#### Evaluator Schedule
- **Runs every:** 5 minutes
- **Purpose:** Checks game states and adjusts polling intervals dynamically

#### Automatic Polling Intervals

The system intelligently adjusts polling frequency based on game state:

| Interval | Trigger Condition | Use Case |
|----------|------------------|----------|
| **60 seconds** | Game has started (live) | High-frequency updates during live games |
| **2 minutes** | Pre-game (< 3 hours until kickoff) | Frequent updates as game approaches |
| **1 hour** | Default (scheduled, no action soon) | Standard polling for scheduled games |

#### Sports Monitored
- NFL (`americanfootball_nfl`)
- NBA (`basketball_nba`)
- MLB (`baseball_mlb`)

#### Job Flow
```
Every 5 minutes:
  1. Evaluator checks game_metadata table
  2. Determines optimal interval per sport
  3. Updates cron jobs dynamically
  
At polling intervals:
  1. Fetch odds from external API
  2. Determine snapshot type
  3. Save to odds_snapshots table (JSONB)
  4. Update game_metadata (status, timestamps)
```

---

## 📸 Snapshot Types

The system creates different snapshot types based on game lifecycle:

| Type | When Created | Purpose |
|------|-------------|---------|
| `opening` | First time game is discovered | Captures opening line |
| `hourly` | Regular pre-game intervals | Tracks line movement |
| `live_60s` | During live games (60s intervals) | Real-time odds during game |
| `closing` | Within 5 min of start or when finished | Captures closing line |

---

## 🖥️ Frontend Refresh Mechanisms

### 1. Odds Dashboard (`/odds` page)

#### On Sport Change
- **Trigger:** User selects different sport
- **Source:** Database (`/api/odds/db`)
- **Rate Limit:** None
- **Speed:** Instant (cached data)
- **Purpose:** Show last polled odds immediately

#### Refresh Button
- **Trigger:** User clicks "Refresh" button
- **Source:** External API (`/api/odds`)
- **Rate Limit:** 60 seconds per IP
- **Behavior:** 
  - Fetches fresh odds from external API
  - Saves new snapshot to database
  - Displays countdown timer when rate limited
  - Shows error message with remaining seconds

---

### 2. Saved Bets Page (`/my-odds` page)

#### Initial Load
- **Fetches:** User's saved bets + bet statistics
- **Source:** Database (`/api/bets`, `/api/bets/stats`)
- **Rate Limit:** None

#### After Bet Edit/Delete
- **Refetches:** Complete bet list + stats
- **Triggers:** Analytics section refresh (via ref)
- **Purpose:** Keep UI in sync with database

---

### 3. Analytics Section (Component)

#### Initial Load
- **Fetches:** Analytics data (`/api/bets/analytics`)
- **Calculates:** 
  - Overall win rate
  - Weekly trends (last 8 weeks)
  - Performance by sport
  - This week stats
- **Source:** Database (aggregates from `user_saved_bets`)

#### Auto-Refresh (via Ref)
```typescript
// Exposed via forwardRef
analyticsRef.current?.refresh()
```
- **Called:** After bet updates or deletions
- **Purpose:** Keep analytics charts current
- **Implementation:** `useImperativeHandle` hook

---

### 4. Historical Odds Page (`/historical-odds` page)

#### On Game Selection
- **Trigger:** User selects game from dropdown
- **Source:** Database (`/api/odds/historical`)
- **Fetches:** All snapshots for selected game (chronological)
- **Displays:** Line chart with odds movement over time
- **Rate Limit:** None
- **Note:** No auto-refresh - manual selection only

---

## 🔑 Key Differences Summary

| Feature | Trigger | Source | Rate Limit | Auto-Refresh |
|---------|---------|--------|------------|--------------|
| **Background Polling** | Automatic (cron) | External API | None (server) | ✅ Yes |
| **Sport Change** | User selection | Database | None | ❌ No |
| **Refresh Button** | User click | External API | 60s per IP | ❌ No |
| **Analytics Refresh** | Bet update/delete | Database | None | ✅ Yes (via ref) |
| **Historical Odds** | User selection | Database | None | ❌ No |
| **Bet List** | Page load/update | Database | None | ✅ Yes (after edits) |

---

## 🔄 Complete Data Flow

### Backend (Automatic)
```
Background Job (every 60s/2m/1h)
  ↓
External API (The Odds API)
  ↓
Save to PostgreSQL (odds_snapshots)
  ↓
Update game_metadata (status, timestamps)
```

### Frontend (User-Initiated)
```
User Changes Sport
  ↓
Fetch /api/odds/db (database)
  ↓
Display cached odds (instant)

---

User Clicks Refresh
  ↓
Fetch /api/odds (external API)
  ↓
Backend saves snapshot
  ↓
Frontend displays fresh odds
  ↓
Rate limit timer starts (60s)
```

### Analytics Flow
```
User Edits/Deletes Bet
  ↓
PATCH/DELETE /api/bets/:id
  ↓
Database updated
  ↓
Frontend refetches bet list
  ↓
analyticsRef.current.refresh() called
  ↓
GET /api/bets/analytics
  ↓
Charts re-render with new data
```

---

## ⚙️ Rate Limiting Details

### External API Refresh
- **Limit:** 60 seconds between requests
- **Scope:** Per IP address
- **Storage:** In-memory Map (auto-cleanup every 5 minutes)
- **Response:** HTTP 429 with `retryAfter` value
- **UI Behavior:** 
  - Button disabled
  - Countdown timer displayed
  - Error message shown
  - Auto-enables after cooldown

### Database Queries
- **No rate limit:** All database-sourced endpoints
- **Fast response:** Indexed queries with connection pooling
- **Concurrent safe:** PostgreSQL handles concurrent reads

---

## 🎯 Best Practices

### For Users
1. **Switch sports freely** - No rate limits on database queries
2. **Use refresh sparingly** - Background jobs keep data fresh
3. **Check timestamps** - See when data was last updated
4. **Analytics auto-update** - No need to manually refresh after bet changes

### For Developers
1. **Background polling** handles most data freshness needs
2. **Rate limiting** protects external API quota
3. **Database caching** provides instant responses
4. **Dynamic intervals** optimize API usage based on game state

---

## 📈 Performance Impact

| Operation | Response Time | API Calls | DB Queries |
|-----------|--------------|-----------|------------|
| Sport Change | < 100ms | 0 | 1 |
| Refresh Button | 2-5s | 1 | 1 (save) |
| Background Poll | N/A | 1 per interval | 1 (save) |
| Analytics Refresh | < 200ms | 0 | 4-5 (aggregations) |
| Bet Edit | < 300ms | 0 | 2 (update + fetch) |

---

## 🔧 Configuration

### Environment Variables
```bash
# Backend polling (no user config needed)
# Intervals are dynamic based on game state

# External API
ODDS_API_KEY=your_key_here

# Rate limiting
# Hardcoded: 60 seconds (can be changed in rate-limit.middleware.ts)
```

### Adjusting Polling Intervals
Edit `backend/src/jobs/odds-poller.job.ts`:
```typescript
// Current intervals (in seconds)
60    // Live games
120   // Pre-game (< 3 hours)
3600  // Default
```

---

## 🐛 Troubleshooting

### Background Polling Not Working
- Check server logs for cron job startup
- Verify database connection
- Check ODDS_API_KEY is valid
- Ensure game_metadata table has games

### Rate Limit Issues
- Wait for countdown timer to complete
- Check if another user on same IP
- Clear browser cache if timer stuck
- Verify rate-limit.middleware.ts logic

### Analytics Not Refreshing
- Check if `analyticsRef` is properly connected
- Verify bets have status 'won' or 'lost' (not pending)
- Check console for API errors
- Ensure user is authenticated

---

**Last Updated:** January 2026  
**Version:** 1.0.0

