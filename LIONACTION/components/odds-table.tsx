"use client"

import React, { useState, useMemo } from "react"
import type { OddsEvent, Bookmaker, OddsMarket } from "@/lib/odds-types"
import { SPORTSBOOKS, SPORTSBOOK_LOGOS, TEAM_LOGOS } from "@/lib/odds-types"
import { formatOdds } from "@/lib/utils"
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid"
import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { SaveBetButton } from "@/components/save-bet-button"

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

function findBestTotalOdds(
  bookmakers: Bookmaker[] | undefined,
  marketKey: string,
  selectedBookmakers: Set<string>,
  outcomeIndex: number
): { price: number; point?: number; bookmaker: string } | null {
  if (!bookmakers) return null

  let bestOutcome: { price: number; point?: number; bookmaker: string } | null = null

  bookmakers.forEach((book) => {
    if (!selectedBookmakers.has(book.key)) return

    const market = book.markets?.find((m) => m.key === marketKey)
    if (!market?.outcomes || market.outcomes.length <= outcomeIndex) return

    const outcome = market.outcomes[outcomeIndex]

    if (!bestOutcome || outcome.price > bestOutcome.price) {
      bestOutcome = {
        price: outcome.price,
        point: outcome.point,
        bookmaker: book.key,
      }
    }
  })

  return bestOutcome
}

export function OddsTable({ events, selectedMarket }: OddsTableProps) {
  const [selectedBookmakers, setSelectedBookmakers] = useState<Set<string>>(
    new Set(Object.values(SPORTSBOOKS).map((b) => b.key)),
  )
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

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
    const firstBook = bookmakers[0]
    return firstBook.markets?.find((m) => m.key === marketKey) || null
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Sportsbook Filter */}
      <Card className="p-3 sm:p-4 border-border/50">
        <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Select Sportsbooks</h3>
        <div className="flex flex-wrap gap-2">
          {availableSportsbooks.map((key) => {
            const book = SPORTSBOOKS[key as keyof typeof SPORTSBOOKS]
            if (!book) return null

            const isSelected = selectedBookmakers.has(key)
            return (
              <LiquidButton
                key={key}
                onClick={() => toggleBookmaker(key)}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  isSelected && "bg-accent text-accent-foreground border-accent"
                )}
              >
                <span className="mr-1.5 text-sm">{SPORTSBOOK_LOGOS[key] || "📱"}</span>
                <span className="hidden sm:inline">{book.title}</span>
              </LiquidButton>
            )
          })}
        </div>
      </Card>

      {/* Main Odds Table - Clean Design */}
      <Card className="border-border/50 overflow-hidden bg-card/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border/60 bg-card/90 backdrop-blur-sm sticky top-0 z-10">
                <th className="text-left py-4 px-5 font-semibold text-xs uppercase tracking-wider text-muted-foreground sticky left-0 bg-card/90 z-20 border-r border-border/30">
                  SCHEDULED
                </th>
                <th className="text-center py-4 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[90px]">
                  OPEN
                </th>
                <th className="text-center py-4 px-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[100px]">
                  BEST ODDS
                </th>
                {availableSportsbooks
                  .filter((key) => selectedBookmakers.has(key))
                  .map((key) => (
                    <th key={key} className="text-center py-4 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground min-w-[110px]">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span className="text-lg">{SPORTSBOOK_LOGOS[key] || "📱"}</span>
                        <span className="text-[10px] font-medium hidden sm:inline">
                          {SPORTSBOOKS[key as keyof typeof SPORTSBOOKS]?.title || ""}
                        </span>
                      </div>
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => {
                const bestOdds = findBestOdds(event.bookmakers, selectedMarket, selectedBookmakers)
                const openingOdds = getOpeningOdds(event.bookmakers, selectedMarket)

                return (
                  <React.Fragment key={event.id}>
                    {/* Game Header Row - Clean and Minimal */}
                    <tr className="bg-card/40 border-b border-border/40">
                      <td colSpan={3 + availableSportsbooks.filter((k) => selectedBookmakers.has(k)).length} className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="text-base">{TEAM_LOGOS[event.away_team] || "🏀"}</span>
                            <span className="text-base">{TEAM_LOGOS[event.home_team] || "🏀"}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-base text-foreground">
                              {event.away_team} @ {event.home_team}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(event.commence_time), "EEE M/d, h:mm a")}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Away Team Row */}
                    <tr 
                      key={`${event.id}-away`} 
                      className="hover:bg-card/60 transition-colors border-b border-border/20"
                    >
                      <td className="py-3.5 px-5 sticky left-0 bg-card z-10 border-r border-border/30">
                        <div className="font-medium text-sm text-foreground">
                          {event.away_team}
                          {selectedMarket === "spreads" && bestOdds?.outcome1?.point !== undefined && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              ({bestOdds.outcome1.point > 0 ? "+" : ""}{bestOdds.outcome1.point.toFixed(1)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3.5 px-4 text-muted-foreground text-sm font-medium">
                        {openingOdds?.outcomes?.[0] ? (
                          <>
                            {selectedMarket === "spreads" || selectedMarket === "totals" ? (
                              <>
                                {openingOdds.outcomes[0].point !== undefined && (
                                  <span className="text-xs text-muted-foreground/70 mr-1">
                                    {openingOdds.outcomes[0].point > 0 ? "+" : ""}{openingOdds.outcomes[0].point.toFixed(1)}
                                  </span>
                                )}
                                <span>{formatOdds(openingOdds.outcomes[0].price, selectedMarket)}</span>
                              </>
                            ) : (
                              formatOdds(openingOdds.outcomes[0].price, selectedMarket)
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="text-center py-3.5 px-4">
                        {bestOdds?.outcome1 ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-semibold text-accent text-sm">
                              {formatOdds(bestOdds.outcome1.price, selectedMarket, bestOdds.outcome1.point)}
                            </span>
                            <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
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
                            outcome?.price === bestOdds.outcome1.price &&
                            (selectedMarket === "spreads" || selectedMarket === "totals"
                              ? outcome?.point === bestOdds.outcome1.point
                              : true)
                          const cellId = `${event.id}-away-${key}`

                          return (
                            <td
                              key={key}
                              className={cn(
                                "text-center py-3.5 px-3 text-sm font-medium relative group",
                                isBest && "bg-accent/15"
                              )}
                              onMouseEnter={() => setHoveredCell(cellId)}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {outcome ? (
                                <div className="flex items-center justify-center gap-2">
                                  <span className={cn(
                                    "text-sm",
                                    isBest && "text-accent font-semibold"
                                  )}>
                                    {formatOdds(outcome.price, selectedMarket, outcome.point)}
                                  </span>
                                  {isBest && (
                                    <Star className="w-3.5 h-3.5 text-accent fill-accent flex-shrink-0" />
                                  )}
                                  <div className={cn(
                                    "transition-opacity",
                                    hoveredCell === cellId ? "opacity-100" : "opacity-0"
                                  )}>
                                    <SaveBetButton
                                      event={event}
                                      bookmakerKey={key}
                                      marketKey={selectedMarket}
                                      outcomeName={event.away_team}
                                      price={outcome.price}
                                      point={outcome.point}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          )
                        })}
                    </tr>

                    {/* Home Team Row */}
                    <tr 
                      key={`${event.id}-home`} 
                      className={cn(
                        "hover:bg-card/60 transition-colors border-b",
                        selectedMarket === "totals" ? "border-border/40" : "border-border/20"
                      )}
                    >
                      <td className="py-3.5 px-5 sticky left-0 bg-card z-10 border-r border-border/30">
                        <div className="font-medium text-sm text-foreground">
                          {event.home_team}
                          {selectedMarket === "spreads" && bestOdds?.outcome2?.point !== undefined && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              ({bestOdds.outcome2.point > 0 ? "+" : ""}{bestOdds.outcome2.point.toFixed(1)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3.5 px-4 text-muted-foreground text-sm font-medium">
                        {openingOdds?.outcomes?.[1] ? (
                          <>
                            {selectedMarket === "spreads" || selectedMarket === "totals" ? (
                              <>
                                {openingOdds.outcomes[1].point !== undefined && (
                                  <span className="text-xs text-muted-foreground/70 mr-1">
                                    {openingOdds.outcomes[1].point > 0 ? "+" : ""}{openingOdds.outcomes[1].point.toFixed(1)}
                                  </span>
                                )}
                                <span>{formatOdds(openingOdds.outcomes[1].price, selectedMarket)}</span>
                              </>
                            ) : (
                              formatOdds(openingOdds.outcomes[1].price, selectedMarket)
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="text-center py-3.5 px-4">
                        {bestOdds?.outcome2 ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-semibold text-accent text-sm">
                              {formatOdds(bestOdds.outcome2.price, selectedMarket, bestOdds.outcome2.point)}
                            </span>
                            <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      {availableSportsbooks
                        .filter((key) => selectedBookmakers.has(key))
                        .map((key) => {
                          const book = event.bookmakers?.find((b) => b.key === key)
                          const market = book?.markets?.find((m) => m.key === selectedMarket)
                          const outcome = market?.outcomes?.[1] || market?.outcomes?.[0]
                          const isBest =
                            bestOdds?.outcome2 &&
                            book?.key === bestOdds.outcome2.bookmaker &&
                            outcome?.price === bestOdds.outcome2.price &&
                            (selectedMarket === "spreads" || selectedMarket === "totals"
                              ? outcome?.point === bestOdds.outcome2.point
                              : true)
                          const cellId = `${event.id}-home-${key}`

                          return (
                            <td
                              key={key}
                              className={cn(
                                "text-center py-3.5 px-3 text-sm font-medium relative group",
                                isBest && "bg-accent/15"
                              )}
                              onMouseEnter={() => setHoveredCell(cellId)}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {outcome ? (
                                <div className="flex items-center justify-center gap-2">
                                  <span className={cn(
                                    "text-sm",
                                    isBest && "text-accent font-semibold"
                                  )}>
                                    {formatOdds(outcome.price, selectedMarket, outcome.point)}
                                  </span>
                                  {isBest && (
                                    <Star className="w-3.5 h-3.5 text-accent fill-accent flex-shrink-0" />
                                  )}
                                  <div className={cn(
                                    "transition-opacity",
                                    hoveredCell === cellId ? "opacity-100" : "opacity-0"
                                  )}>
                                    <SaveBetButton
                                      event={event}
                                      bookmakerKey={key}
                                      marketKey={selectedMarket}
                                      outcomeName={event.home_team}
                                      price={outcome.price}
                                      point={outcome.point}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          )
                        })}
                    </tr>

                    {/* Totals Over/Under Rows (if totals market) */}
                    {selectedMarket === "totals" && openingOdds?.outcomes && (() => {
                      const bestOverOdds = findBestTotalOdds(event.bookmakers, selectedMarket, selectedBookmakers, 0)
                      const bestUnderOdds = findBestTotalOdds(event.bookmakers, selectedMarket, selectedBookmakers, 1)
                      
                      return (
                        <>
                          {/* Over Row */}
                          <tr key={`${event.id}-over`} className="hover:bg-card/60 transition-colors border-b border-border/20">
                            <td className="py-3.5 px-5 sticky left-0 bg-card z-10 border-r border-border/30">
                              <div className="font-medium text-sm text-foreground">
                                Over
                                {openingOdds?.outcomes?.[0]?.point !== undefined && (
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    ({openingOdds.outcomes[0].point.toFixed(1)})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-center py-3.5 px-4 text-muted-foreground text-sm font-medium">
                              {openingOdds?.outcomes?.[0]
                                ? formatOdds(openingOdds.outcomes[0].price, selectedMarket, openingOdds.outcomes[0].point)
                                : <span className="text-muted-foreground/40">—</span>}
                            </td>
                            <td className="text-center py-3.5 px-4">
                              {bestOverOdds ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="font-semibold text-accent text-sm">
                                    {formatOdds(bestOverOdds.price, selectedMarket, bestOverOdds.point)}
                                  </span>
                                  <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                            {availableSportsbooks
                              .filter((key) => selectedBookmakers.has(key))
                              .map((key) => {
                                const book = event.bookmakers?.find((b) => b.key === key)
                                const market = book?.markets?.find((m) => m.key === selectedMarket)
                                const outcome = market?.outcomes?.[0]
                                const isBest =
                                  bestOverOdds &&
                                  book?.key === bestOverOdds.bookmaker &&
                                  outcome?.price === bestOverOdds.price &&
                                  outcome?.point === bestOverOdds.point
                                const cellId = `${event.id}-over-${key}`

                                return (
                                  <td 
                                    key={key} 
                                    className={cn(
                                      "text-center py-3.5 px-3 text-sm font-medium group",
                                      isBest && "bg-accent/15"
                                    )}
                                    onMouseEnter={() => setHoveredCell(cellId)}
                                    onMouseLeave={() => setHoveredCell(null)}
                                  >
                                    {outcome ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <span className={cn(
                                          "text-sm",
                                          isBest && "text-accent font-semibold"
                                        )}>
                                          {formatOdds(outcome.price, selectedMarket, outcome.point)}
                                        </span>
                                        {isBest && (
                                          <Star className="w-3.5 h-3.5 text-accent fill-accent flex-shrink-0" />
                                        )}
                                        <div className={cn(
                                          "transition-opacity",
                                          hoveredCell === cellId ? "opacity-100" : "opacity-0"
                                        )}>
                                          <SaveBetButton
                                            event={event}
                                            bookmakerKey={key}
                                            marketKey={selectedMarket}
                                            outcomeName="Over"
                                            price={outcome.price}
                                            point={outcome.point}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground/40">—</span>
                                    )}
                                  </td>
                                )
                              })}
                          </tr>
                          {/* Under Row */}
                          <tr key={`${event.id}-under`} className="hover:bg-card/60 transition-colors border-b-2 border-border/40">
                            <td className="py-3.5 px-5 sticky left-0 bg-card z-10 border-r border-border/30">
                              <div className="font-medium text-sm text-foreground">
                                Under
                                {openingOdds?.outcomes?.[1]?.point !== undefined && (
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    ({openingOdds.outcomes[1].point.toFixed(1)})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-center py-3.5 px-4 text-muted-foreground text-sm font-medium">
                              {openingOdds?.outcomes?.[1]
                                ? formatOdds(openingOdds.outcomes[1].price, selectedMarket, openingOdds.outcomes[1].point)
                                : <span className="text-muted-foreground/40">—</span>}
                            </td>
                            <td className="text-center py-3.5 px-4">
                              {bestUnderOdds ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="font-semibold text-accent text-sm">
                                    {formatOdds(bestUnderOdds.price, selectedMarket, bestUnderOdds.point)}
                                  </span>
                                  <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                            {availableSportsbooks
                              .filter((key) => selectedBookmakers.has(key))
                              .map((key) => {
                                const book = event.bookmakers?.find((b) => b.key === key)
                                const market = book?.markets?.find((m) => m.key === selectedMarket)
                                const outcome = market?.outcomes?.[1]
                                const isBest =
                                  bestUnderOdds &&
                                  book?.key === bestUnderOdds.bookmaker &&
                                  outcome?.price === bestUnderOdds.price &&
                                  outcome?.point === bestUnderOdds.point
                                const cellId = `${event.id}-under-${key}`

                                return (
                                  <td 
                                    key={key} 
                                    className={cn(
                                      "text-center py-3.5 px-3 text-sm font-medium group",
                                      isBest && "bg-accent/15"
                                    )}
                                    onMouseEnter={() => setHoveredCell(cellId)}
                                    onMouseLeave={() => setHoveredCell(null)}
                                  >
                                    {outcome ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <span className={cn(
                                          "text-sm",
                                          isBest && "text-accent font-semibold"
                                        )}>
                                          {formatOdds(outcome.price, selectedMarket, outcome.point)}
                                        </span>
                                        {isBest && (
                                          <Star className="w-3.5 h-3.5 text-accent fill-accent flex-shrink-0" />
                                        )}
                                        <div className={cn(
                                          "transition-opacity",
                                          hoveredCell === cellId ? "opacity-100" : "opacity-0"
                                        )}>
                                          <SaveBetButton
                                            event={event}
                                            bookmakerKey={key}
                                            marketKey={selectedMarket}
                                            outcomeName="Under"
                                            price={outcome.price}
                                            point={outcome.point}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground/40">—</span>
                                    )}
                                  </td>
                                )
                              })}
                          </tr>
                        </>
                      )
                    })()}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-16 text-muted-foreground px-4">
            <p className="text-sm">No games available for the selected filters.</p>
            <p className="text-xs mt-1 text-muted-foreground/70">Try selecting different sportsbooks or markets.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
