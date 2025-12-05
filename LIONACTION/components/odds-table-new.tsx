"use client"

import { useState, useMemo } from "react"
import type { OddsEvent, Bookmaker } from "@/lib/odds-types"
import { SPORTSBOOKS, SPORTSBOOK_LOGOS } from "@/lib/odds-types"
import { formatOdds } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface OddsTableNewProps {
  events: OddsEvent[]
  selectedMarket: string
}

interface BestOdds {
  away: { price: number; point?: number; bookmaker: string }
  home: { price: number; point?: number; bookmaker: string }
}

export function OddsTableNew({ events, selectedMarket }: OddsTableNewProps) {
  const [selectedBookmakers, setSelectedBookmakers] = useState<Set<string>>(
    new Set(Object.values(SPORTSBOOKS).map((b) => b.key)),
  )

  // Get available sportsbooks from the events
  const availableSportsbooks = useMemo(() => {
    const books = new Set<string>()
    events.forEach((event) => {
      event.bookmakers?.forEach((book) => {
        if (SPORTSBOOKS[book.key as keyof typeof SPORTSBOOKS]) {
          books.add(book.key)
        }
      })
    })
    return Array.from(books).sort()
  }, [events])

  const toggleBookmaker = (key: string) => {
    const newSet = new Set(selectedBookmakers)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setSelectedBookmakers(newSet)
  }

  // Filter events based on selected bookmakers and market
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      return event.bookmakers?.some(
        (book) => selectedBookmakers.has(book.key) && book.markets?.some((m) => m.key === selectedMarket),
      )
    })
  }, [events, selectedMarket, selectedBookmakers])

  // Calculate best odds for each event
  const getBestOdds = (bookmakers: Bookmaker[] | undefined, marketKey: string): BestOdds | null => {
    if (!bookmakers) return null

    let bestAway: { price: number; point?: number; bookmaker: string } | null = null
    let bestHome: { price: number; point?: number; bookmaker: string } | null = null

    bookmakers
      .filter((book) => selectedBookmakers.has(book.key))
      .forEach((book) => {
        const market = book.markets?.find((m) => m.key === marketKey)
        if (!market?.outcomes || market.outcomes.length < 2) return

        const awayOutcome = market.outcomes[0]
        const homeOutcome = market.outcomes[1]

        // For spreads/totals, best odds = highest price (closest to 0 for negative, highest positive)
        // For moneyline, best odds = highest price
        if (marketKey === "spreads" || marketKey === "totals") {
          // Best is the one with highest price (least negative or most positive)
          if (!bestAway || awayOutcome.price > bestAway.price) {
            bestAway = { price: awayOutcome.price, point: awayOutcome.point, bookmaker: book.key }
          }
          if (!bestHome || homeOutcome.price > bestHome.price) {
            bestHome = { price: homeOutcome.price, point: homeOutcome.point, bookmaker: book.key }
          }
        } else {
          // Moneyline - best is highest positive or least negative
          if (!bestAway || awayOutcome.price > bestAway.price) {
            bestAway = { price: awayOutcome.price, bookmaker: book.key }
          }
          if (!bestHome || homeOutcome.price > bestHome.price) {
            bestHome = { price: homeOutcome.price, bookmaker: book.key }
          }
        }
      })

    if (!bestAway || !bestHome) return null
    return { away: bestAway, home: bestHome }
  }

  // Get open odds (first bookmaker's odds)
  const getOpenOdds = (bookmakers: Bookmaker[] | undefined, marketKey: string) => {
    if (!bookmakers || bookmakers.length === 0) return null
    const firstBook = bookmakers.find((book) => selectedBookmakers.has(book.key))
    if (!firstBook) return null
    const market = firstBook.markets?.find((m) => m.key === marketKey)
    if (!market?.outcomes || market.outcomes.length < 2) return null
    return {
      away: market.outcomes[0],
      home: market.outcomes[1],
    }
  }

  // Get filtered bookmakers for table columns
  const tableBookmakers = useMemo(() => {
    return availableSportsbooks.filter((key) => selectedBookmakers.has(key))
  }, [availableSportsbooks, selectedBookmakers])

  return (
    <div className="space-y-4">
      {/* Sportsbook Filter */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Select Sportsbooks</h3>
        <div className="flex flex-wrap gap-2">
          {availableSportsbooks.map((key) => {
            const book = SPORTSBOOKS[key as keyof typeof SPORTSBOOKS]
            if (!book) return null

            const isSelected = selectedBookmakers.has(key)
            return (
              <Button
                key={key}
                onClick={() => toggleBookmaker(key)}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={isSelected ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}
              >
                <span className="mr-1">{SPORTSBOOK_LOGOS[key] || "📱"}</span>
                {book.title}
              </Button>
            )
          })}
        </div>
      </Card>

      {/* Odds Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle px-4 md:px-0">
            <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-card border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 font-semibold sticky left-0 bg-card z-10">Scheduled</th>
                <th className="text-left py-3 px-4 font-semibold sticky left-[120px] bg-card z-10">Teams</th>
                <th className="text-center py-3 px-4 font-semibold">Open Odds</th>
                <th className="text-center py-3 px-4 font-semibold">Best Odds</th>
                {tableBookmakers.map((bookKey) => {
                  const book = SPORTSBOOKS[bookKey as keyof typeof SPORTSBOOKS]
                  if (!book) return null
                  return (
                    <th key={bookKey} className="text-center py-3 px-3 font-semibold whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <span>{SPORTSBOOK_LOGOS[bookKey] || "📱"}</span>
                        <span className="text-xs hidden sm:inline">{book.title}</span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => {
                const bestOdds = getBestOdds(event.bookmakers, selectedMarket)
                const openOdds = getOpenOdds(event.bookmakers, selectedMarket)
                const gameDate = new Date(event.commence_time)

                return (
                  <tr key={event.id} className="border-b border-border hover:bg-card/50 transition-colors">
                    {/* Scheduled */}
                    <td className="py-4 px-4 sticky left-0 bg-background z-10">
                      <div className="text-xs text-muted-foreground">
                        {gameDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {gameDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Teams */}
                    <td className="py-4 px-4 sticky left-[120px] bg-background z-10 min-w-[200px]">
                      <div className="font-medium">{event.away_team}</div>
                      <div className="font-medium">{event.home_team}</div>
                    </td>

                    {/* Open Odds */}
                    <td className="py-4 px-4 text-center">
                      {openOdds ? (
                        <>
                          <div className="text-xs text-muted-foreground mb-1">
                            {formatOdds(openOdds.away.price, selectedMarket, openOdds.away.point)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatOdds(openOdds.home.price, selectedMarket, openOdds.home.point)}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Best Odds */}
                    <td className="py-4 px-4 text-center">
                      {bestOdds ? (
                        <>
                          <div className="text-xs font-semibold text-yellow-500 mb-1">
                            {formatOdds(bestOdds.away.price, selectedMarket, bestOdds.away.point)}
                          </div>
                          <div className="text-xs font-semibold text-yellow-500">
                            {formatOdds(bestOdds.home.price, selectedMarket, bestOdds.home.point)}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Bookmaker Columns */}
                    {tableBookmakers.map((bookKey) => {
                      const book = event.bookmakers?.find((b) => b.key === bookKey)
                      const market = book?.markets?.find((m) => m.key === selectedMarket)
                      const isBestAway =
                        bestOdds?.away.bookmaker === bookKey && market?.outcomes?.[0]
                      const isBestHome =
                        bestOdds?.home.bookmaker === bookKey && market?.outcomes?.[1]

                      if (!market?.outcomes || market.outcomes.length < 2) {
                        return (
                          <td key={bookKey} className="py-4 px-3 text-center">
                            <span className="text-muted-foreground">-</span>
                          </td>
                        )
                      }

                      return (
                        <td key={bookKey} className="py-4 px-3 text-center whitespace-nowrap">
                          <div
                            className={`text-xs mb-1 ${
                              isBestAway ? "font-semibold text-yellow-500" : "text-muted-foreground"
                            }`}
                          >
                            {formatOdds(market.outcomes[0].price, selectedMarket, market.outcomes[0].point)}
                          </div>
                          <div
                            className={`text-xs ${
                              isBestHome ? "font-semibold text-yellow-500" : "text-muted-foreground"
                            }`}
                          >
                            {formatOdds(market.outcomes[1].price, selectedMarket, market.outcomes[1].point)}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        </div>
      </Card>

      {filteredEvents.length === 0 && (
        <Card className="text-center py-12 text-muted-foreground">
          No games available for the selected filters. Try selecting different sportsbooks or markets.
        </Card>
      )}
    </div>
  )
}
