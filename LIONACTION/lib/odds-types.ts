export interface OddsMarket {
  key: string
  last_update: string
  outcomes: Array<{
    name: string
    price: number
    point?: number
  }>
}

export interface Bookmaker {
  key: string
  title: string
  last_update: string
  markets: OddsMarket[]
}

export interface OddsEvent {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: Bookmaker[]
}

export interface OddsResponse {
  data: OddsEvent[]
}

export const SPORTSBOOKS = {
  draftkings: { key: "draftkings", title: "DraftKings", color: "#2C5282" },
  fanduel: { key: "fanduel", title: "FanDuel", color: "#0052CC" },
  betmgm: { key: "betmgm", title: "BetMGM", color: "#FFB81C" },
  espnbet: { key: "espnbet", title: "ESPN BET", color: "#000000" },
  pointsbetus: { key: "pointsbetus", title: "PointsBet", color: "#00A3E0" },
  caesars: { key: "caesars", title: "Caesars", color: "#0B5F11" },
  draftkings_uk: { key: "draftkings_uk", title: "DraftKings UK", color: "#2C5282" },
  bet365: { key: "bet365", title: "bet365", color: "#FBAB17" },
}

export const SPORTS = {
  nfl: { key: "americanfootball_nfl", title: "NFL" },
  nba: { key: "basketball_nba", title: "NBA" },
  mlb: { key: "baseball_mlb", title: "MLB" },
  nhl: { key: "icehockey_nhl", title: "NHL" },
  college_football: { key: "americanfootball_ncaaf", title: "College Football" },
  college_basketball: { key: "basketball_ncaab", title: "College Basketball" },
}

export const MARKETS = {
  h2h: { key: "h2h", title: "Moneyline" },
  spread: { key: "spreads", title: "Spread" },
  totals: { key: "totals", title: "Totals" },
}

export const SPORTSBOOK_LOGOS: Record<string, string> = {
  draftkings: "🏴", // DraftKings
  fanduel: "🛡️", // FanDuel shield
  betmgm: "🎰", // BetMGM
  espnbet: "📺", // ESPN
  pointsbetus: "📍", // PointsBet
  caesars: "👑", // Caesars
  draftkings_uk: "🏴", // UK version
  bet365: "⭐", // Bet365
}

export const TEAM_LOGOS: Record<string, string> = {
  "New England Patriots": "🏈",
  "Atlanta Falcons": "🦅",
  "Green Bay Packers": "🧀",
  "Carolina Panthers": "🐆",
  "Indiana Pacers": "🏀",
  "Philadelphia 76ers": "🏀",
  "Boston Celtics": "🟢",
  "Atlanta Hawks": "🦅",
  "Toronto Blue Jays": "🦅",
  "Los Angeles Dodgers": "💙",
  "Vegas Golden Knights": "⚔️",
  "Colorado Avalanche": "❄️",
  "Washington Capitals": "🏛️",
  "New York Islanders": "🏝️",
}
