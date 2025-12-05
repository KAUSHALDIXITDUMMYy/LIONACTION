import { OddsEvent, Bookmaker, OddsMarket } from '../types/odds.types'

/**
 * Generates mock odds data when API doesn't return proper outcomes
 */
export function generateMockOdds(events: OddsEvent[]): OddsEvent[] {
  return events.map((event) => ({
    ...event,
    bookmakers: event.bookmakers
      ? event.bookmakers.map((book: Bookmaker) => {
          // Check if outcomes are empty or invalid
          const hasValidOutcomes =
            book.markets &&
            Array.isArray(book.markets) &&
            book.markets.some(
              (market: OddsMarket) =>
                market.outcomes &&
                Array.isArray(market.outcomes) &&
                market.outcomes.length > 0 &&
                market.outcomes[0].name !== undefined &&
                market.outcomes[0].price !== undefined
            )

          if (!hasValidOutcomes && book.markets && Array.isArray(book.markets)) {
            // Generate mock outcomes
            return {
              ...book,
              markets: book.markets.map((market: OddsMarket) => {
                if (market.key === 'h2h') {
                  // Home and Away odds in American format
                  // Generate random decimal odds first, then convert to American
                  const awayDecimal = Math.round((1.8 + Math.random() * 0.4) * 100) / 100
                  const homeDecimal = Math.round((1.8 + Math.random() * 0.4) * 100) / 100
                  const awayAmerican =
                    awayDecimal >= 2.0
                      ? Math.round((awayDecimal - 1) * 100)
                      : Math.round(-100 / (awayDecimal - 1))
                  const homeAmerican =
                    homeDecimal >= 2.0
                      ? Math.round((homeDecimal - 1) * 100)
                      : Math.round(-100 / (homeDecimal - 1))
                  return {
                    ...market,
                    outcomes: [
                      { name: event.away_team, price: awayAmerican },
                      { name: event.home_team, price: homeAmerican },
                    ],
                  }
                } else if (market.key === 'spreads') {
                  // Spread odds in American format (-110 is standard)
                  const spread = Math.round((Math.random() * 10 - 5) * 10) / 10
                  return {
                    ...market,
                    outcomes: [
                      { name: event.away_team, price: -110, point: spread },
                      { name: event.home_team, price: -110, point: -spread },
                    ],
                  }
                } else if (market.key === 'totals') {
                  // Totals/Over-Under odds in American format (-110 is standard)
                  const total = Math.round((45 + Math.random() * 20) * 10) / 10
                  return {
                    ...market,
                    outcomes: [
                      { name: 'Over', price: -110, point: total },
                      { name: 'Under', price: -110, point: total },
                    ],
                  }
                }
                return market
              }),
            }
          }
          return book
        })
      : [],
  }))
}

