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

