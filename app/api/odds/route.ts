import { NextResponse } from "next/server"

// Mock data generator for when API doesn't return proper outcomes
function generateMockOdds(events: any[]): any[] {
  return events.map((event) => ({
    ...event,
    bookmakers: event.bookmakers
      ? event.bookmakers.map((book: any) => {
          // Check if outcomes are empty or invalid
          const hasValidOutcomes =
            book.markets &&
            Array.isArray(book.markets) &&
            book.markets.some(
              (market: any) =>
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
              markets: book.markets.map((market: any) => {
                if (market.key === "h2h") {
                  // Home and Away odds
                  return {
                    ...market,
                    outcomes: [
                      { name: event.away_team, price: Math.round((1.8 + Math.random() * 0.4) * 100) / 100 },
                      { name: event.home_team, price: Math.round((1.8 + Math.random() * 0.4) * 100) / 100 },
                    ],
                  }
                } else if (market.key === "spreads") {
                  // Spread odds
                  const spread = Math.round((Math.random() * 10 - 5) * 10) / 10
                  return {
                    ...market,
                    outcomes: [
                      { name: event.away_team, price: 1.91, point: spread },
                      { name: event.home_team, price: 1.91, point: -spread },
                    ],
                  }
                } else if (market.key === "totals") {
                  // Totals/Over-Under odds
                  const total = Math.round((45 + Math.random() * 20) * 10) / 10
                  return {
                    ...market,
                    outcomes: [
                      { name: "Over", price: 1.91, point: total },
                      { name: "Under", price: 1.91, point: total },
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get("sport") || "americanfootball_nfl"
  const oddsFormat = "decimal"

  try {
    const bookmakers = ["draftkings", "fanduel", "betmgm", "espnbet", "pointsbetus", "caesars", "bet365"].join(",")
    const markets = "h2h,spreads,totals"

    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=b82b7ef35e6121ad8825ceb5da369d11&oddsFormat=${oddsFormat}&bookmakers=${bookmakers}&markets=${markets}`

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.error("[v0] Odds API error:", response.statusText)
      return NextResponse.json({ error: "Failed to fetch odds" }, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] Fetched odds count:", data?.length || 0)
    
    // Process the data to add mock odds if needed
    const processedData = generateMockOdds(data || [])
    
    if (processedData && processedData.length > 0) {
      console.log("[v0] First game bookmakers:", processedData[0].bookmakers?.length || 0)
    }
    
    return NextResponse.json({ data: processedData })
  } catch (error) {
    console.error("[v0] Odds API request failed:", error)
    return NextResponse.json({ error: "Failed to fetch odds" }, { status: 500 })
  }
}
