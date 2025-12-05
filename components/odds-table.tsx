"use client"

import { useState, useMemo } from "react"
import type { OddsEvent, Bookmaker, OddsMarket } from "@/lib/odds-types"
import { SPORTSBOOKS, SPORTSBOOK_LOGOS, TEAM_LOGOS } from "@/lib/odds-types"
import { formatOdds } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Star, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface OddsTableProps {
  events: OddsEvent[]
  selectedMarket: string
}

interface BestOdds {
  outcome1: { price: number; point?: number; bookmaker: string }
  outcome2: { price: number; point?: number; bookmaker: string }
}

function findBestOdds(
  bookmakers: Bookmaker[] | undefined,
  marketKey: string,
  selectedBookmakers: Set<string>
): BestOdds | null {
  if (!bookmakers) return null

  let bestOutcome1: { price: number; point?: number; bookmaker: string } | null = null
  let bestOutcome2: { price: number; point?: number; bookmaker: string } | null = null

  bookmakers.forEach((book) => {
    if (!selectedBookmakers.has(book.key)) return

    const market = book.markets?.find((m) => m.key === marketKey)
    if (!market?.outcomes || market.outcomes.length < 2) return

    const outcome1 = market.outcomes[0]
    const outcome2 = market.outcomes[1]

    // For American odds: higher positive or less negative is better
    // For spreads/totals, we compare the price (odds)
    if (!bestOutcome1 || outcome1.price > bestOutcome1.price) {
      bestOutcome1 = {
        price: outcome1.price,
        point: outcome1.point,
        bookmaker: book.key,
      }
    }

    if (!bestOutcome2 || outcome2.price > bestOutcome2.price) {
      bestOutcome2 = {
        price: outcome2.price,
        point: outcome2.point,
        bookmaker: book.key,
      }
    }
  })

  if (!bestOutcome1 || !bestOutcome2) return null

  return { outcome1: bestOutcome1, outcome2: bestOutcome2 }
}

export function OddsTable({ events, selectedMarket }: OddsTableProps) {
  const [expandedGame, setExpandedGame] = useState<string | null>(null)
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

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      return event.bookmakers?.some(
        (book) => selectedBookmakers.has(book.key) && book.markets?.some((m) => m.key === selectedMarket),
      )
    })
  }, [events, selectedMarket, selectedBookmakers])

  const getOpeningOdds = (bookmakers: Bookmaker[] | undefined, marketKey: string): OddsMarket | null => {
    if (!bookmakers || bookmakers.length === 0) return null
    // Use first bookmaker as opening odds (in real app, this would track historical data)
    const firstBook = bookmakers[0]
    return firstBook.markets?.find((m) => m.key === marketKey) || null
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Sportsbook Filter */}
      <Card className="p-3 sm:p-4">
        <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Select Sportsbooks</h3>
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
                className={isSelected ? "bg-accent text-accent-foreground" : ""}
              >
                <span className="mr-1">{SPORTSBOOK_LOGOS[key] || "📱"}</span>
                {book.title}
              </Button>
            )
          })}
        </div>
      </Card>

      {/* Games List */}
      <div className="space-y-3">
        {filteredEvents.map((event) => {
          const isExpanded = expandedGame === event.id
          const bestOdds = findBestOdds(event.bookmakers, selectedMarket, selectedBookmakers)
          const openingOdds = getOpeningOdds(event.bookmakers, selectedMarket)

          return (
            <Card key={event.id} className="overflow-hidden">
              {/* Game Header - Collapsed View */}
              <button
                onClick={() => setExpandedGame(isExpanded ? null : event.id)}
                className="w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-4 flex-1 text-left min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <span className="text-xl sm:text-2xl">{TEAM_LOGOS[event.away_team] || "🏀"}</span>
                    <span className="text-xl sm:text-2xl">{TEAM_LOGOS[event.home_team] || "🏀"}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base md:text-lg truncate">
                      {event.away_team} @ {event.home_team}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {format(new Date(event.commence_time), "EEE M/d, h:mm a")}
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded Odds Table */}
              {isExpanded && (
                <div className="border-t border-border bg-card/50">
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-border bg-card">
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">SCHEDULED</th>
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">OPEN</th>
                          <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">BEST ODDS</th>
                          {availableSportsbooks
                            .filter((key) => selectedBookmakers.has(key))
                            .map((key) => (
                              <th key={key} className="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-sm sm:text-base">{SPORTSBOOK_LOGOS[key] || "📱"}</span>
                                  <span className="text-xs hidden sm:inline">{SPORTSBOOKS[key as keyof typeof SPORTSBOOKS]?.title || ""}</span>
                                </div>
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Away Team Row */}
                        <tr className="border-b border-border hover:bg-card/50 transition-colors">
                          <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-4">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span className="text-base sm:text-lg flex-shrink-0">{TEAM_LOGOS[event.away_team] || "🏀"}</span>
                              <div className="min-w-0">
                                <div className="font-medium text-xs sm:text-sm truncate">{event.away_team}</div>
                                <div className="text-xs text-muted-foreground hidden sm:block">({event.id})</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-2 sm:py-3 md:py-4 px-2 sm:px-4 text-muted-foreground text-xs sm:text-sm">
                            {openingOdds?.outcomes?.[0] ? (
                              <>
                                {selectedMarket === "spreads" || selectedMarket === "totals" ? (
                                  <>
                                    {openingOdds.outcomes[0].point !== undefined
                                      ? `${openingOdds.outcomes[0].point > 0 ? "+" : ""}${openingOdds.outcomes[0].point.toFixed(1)}`
                                      : ""}
                                    , {formatOdds(openingOdds.outcomes[0].price, selectedMarket)}
                                  </>
                                ) : (
                                  formatOdds(openingOdds.outcomes[0].price, selectedMarket)
                                )}
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-center py-2 sm:py-3 md:py-4 px-2 sm:px-4">
                            {bestOdds?.outcome1 ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-semibold text-accent text-xs sm:text-sm">
                                  {formatOdds(bestOdds.outcome1.price, selectedMarket, bestOdds.outcome1.point)}
                                </span>
                                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-accent fill-accent flex-shrink-0" />
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          {availableSportsbooks
                            .filter((key) => selectedBookmakers.has(key))
                            .map((key) => {
                              const book = event.bookmakers?.find((b) => b.key === key)
                              const market = book?.markets?.find((m) => m.key === selectedMarket)
                              const outcome = market?.outcomes?.[0]
                              const isBest =
                                bestOdds?.outcome1 &&
                                book?.key === bestOdds.outcome1.bookmaker &&
                                outcome?.price === bestOdds.outcome1.price

                              return (
                                <td
                                  key={key}
                                  className={cn(
                                    "text-center py-2 sm:py-3 md:py-4 px-2 sm:px-4 font-semibold text-xs sm:text-sm",
                                    isBest && "bg-accent/20 text-accent"
                                  )}
                                >
                                  {outcome ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-xs sm:text-sm">{formatOdds(outcome.price, selectedMarket, outcome.point)}</span>
                                      {isBest && <Star className="w-3 h-3 sm:w-4 sm:h-4 text-accent fill-accent flex-shrink-0" />}
                                    </div>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              )
                            })}
                        </tr>

                        {/* Home Team Row */}
                        <tr className="border-b border-border hover:bg-card/50 transition-colors">
                          <td className="py-2 sm:py-3 md:py-4 px-2 sm:px-4">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span className="text-base sm:text-lg flex-shrink-0">{TEAM_LOGOS[event.home_team] || "🏀"}</span>
                              <div className="min-w-0">
                                <div className="font-medium text-xs sm:text-sm truncate">{event.home_team}</div>
                                <div className="text-xs text-muted-foreground hidden sm:block">({event.id})</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-2 sm:py-3 md:py-4 px-2 sm:px-4 text-muted-foreground text-xs sm:text-sm">
                            {openingOdds?.outcomes?.[1] ? (
                              <>
                                {selectedMarket === "spreads" || selectedMarket === "totals" ? (
                                  <>
                                    {openingOdds.outcomes[1].point !== undefined
                                      ? `${openingOdds.outcomes[1].point > 0 ? "+" : ""}${openingOdds.outcomes[1].point.toFixed(1)}`
                                      : ""}
                                    , {formatOdds(openingOdds.outcomes[1].price, selectedMarket)}
                                  </>
                                ) : (
                                  formatOdds(openingOdds.outcomes[1].price, selectedMarket)
                                )}
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-center py-2 sm:py-3 md:py-4 px-2 sm:px-4">
                            {bestOdds?.outcome2 ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-semibold text-accent text-xs sm:text-sm">
                                  {formatOdds(bestOdds.outcome2.price, selectedMarket, bestOdds.outcome2.point)}
                                </span>
                                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-accent fill-accent flex-shrink-0" />
                                {selectedMarket === "h2h" && <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          {availableSportsbooks
                            .filter((key) => selectedBookmakers.has(key))
                            .map((key) => {
                              const book = event.bookmakers?.find((b) => b.key === key)
                              const market = book?.markets?.find((m) => m.key === selectedMarket)
                              const outcome = market?.outcomes?.[1] || market?.outcomes?.[0] // For totals, use first outcome for "Over"
                              const isBest =
                                bestOdds?.outcome2 &&
                                book?.key === bestOdds.outcome2.bookmaker &&
                                outcome?.price === bestOdds.outcome2.price

                              return (
                                <td
                                  key={key}
                                  className={cn(
                                    "text-center py-2 sm:py-3 md:py-4 px-2 sm:px-4 font-semibold text-xs sm:text-sm",
                                    isBest && "bg-accent/20 text-accent"
                                  )}
                                >
                                  {outcome ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-xs sm:text-sm">{formatOdds(outcome.price, selectedMarket, outcome.point)}</span>
                                      {isBest && <Star className="w-3 h-3 sm:w-4 sm:h-4 text-accent fill-accent flex-shrink-0" />}
                                    </div>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              )
                            })}
                        </tr>

                        {/* Totals Over/Under Row (if totals market) */}
                        {selectedMarket === "totals" && openingOdds?.outcomes?.[1] && (
                          <tr className="border-b border-border hover:bg-card/50 transition-colors">
                            <td className="py-4 px-4">
                              <div className="font-medium">Under</div>
                            </td>
                            <td className="text-center py-4 px-4 text-muted-foreground">
                              {openingOdds?.outcomes?.[1]
                                ? formatOdds(openingOdds.outcomes[1].price, selectedMarket, openingOdds.outcomes[1].point)
                                : "-"}
                            </td>
                            <td className="text-center py-4 px-4">-</td>
                            {availableSportsbooks
                              .filter((key) => selectedBookmakers.has(key))
                              .map((key) => {
                                const book = event.bookmakers?.find((b) => b.key === key)
                                const market = book?.markets?.find((m) => m.key === selectedMarket)
                                const outcome = market?.outcomes?.[1]

                                return (
                                  <td key={key} className="text-center py-4 px-4 font-semibold">
                                    {outcome ? formatOdds(outcome.price, selectedMarket, outcome.point) : "-"}
                                  </td>
                                )
                              })}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {filteredEvents.length === 0 && (
        <Card className="text-center py-12 text-muted-foreground">
          No games available for the selected filters. Try selecting different sportsbooks or markets.
        </Card>
      )}
    </div>
  )
}
