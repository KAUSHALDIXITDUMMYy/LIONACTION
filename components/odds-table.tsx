"use client"

import { useState, useMemo } from "react"
import type { OddsEvent, Bookmaker } from "@/lib/odds-types"
import { SPORTSBOOKS, SPORTSBOOK_LOGOS, TEAM_LOGOS } from "@/lib/odds-types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"

interface OddsTableProps {
  events: OddsEvent[]
  selectedMarket: string
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

  const getOddsForMarket = (bookmakers: Bookmaker[] | undefined, marketKey: string) => {
    if (!bookmakers) return null

    for (const book of bookmakers) {
      if (!selectedBookmakers.has(book.key)) continue

      const market = book.markets?.find((m) => m.key === marketKey)
      if (market?.outcomes) {
        return { bookmaker: book, market }
      }
    }
    return null
  }

  return (
    <div className="space-y-6">
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
          const oddsData = getOddsForMarket(event.bookmakers, selectedMarket)

          return (
            <Card key={event.id} className="overflow-hidden">
              {/* Game Header */}
              <button
                onClick={() => setExpandedGame(isExpanded ? null : event.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{TEAM_LOGOS[event.away_team] || "🏀"}</span>
                    <span className="text-2xl">{TEAM_LOGOS[event.home_team] || "🏀"}</span>
                  </div>

                  <div className="flex-1">
                    <div className="font-semibold text-lg">
                      {event.away_team} @ {event.home_team}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.commence_time).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Quick View - Best Odds */}
                  {oddsData && (
                    <div className="hidden md:flex items-center gap-4">
                      {oddsData.market.outcomes.map((outcome, idx) => (
                        <div key={idx} className="text-right">
                          <div className="text-xs text-muted-foreground">{outcome.name}</div>
                          <div className="font-semibold text-accent">
                            {selectedMarket === "spreads" || selectedMarket === "totals"
                              ? `${outcome.point !== undefined ? (outcome.point > 0 ? "+" : "") + outcome.point.toFixed(1) + " " : ""}${outcome.price.toFixed(2)}`
                              : outcome.price.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? "transform rotate-180" : ""}`} />
              </button>

              {/* Expanded Odds Table */}
              {isExpanded && (
                <div className="border-t border-border px-6 py-4 bg-card/50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-semibold">Sportsbook</th>
                          {selectedMarket === "totals" ? (
                            <>
                              <th className="text-center py-2 px-3 font-semibold">Over</th>
                              <th className="text-center py-2 px-3 font-semibold">Under</th>
                            </>
                          ) : (
                            <>
                              <th className="text-center py-2 px-3 font-semibold">
                                {selectedMarket === "h2h" ? event.away_team : selectedMarket === "spreads" ? event.away_team : "Option 1"}
                              </th>
                              <th className="text-center py-2 px-3 font-semibold">
                                {selectedMarket === "h2h" ? event.home_team : selectedMarket === "spreads" ? event.home_team : "Option 2"}
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {event.bookmakers
                          ?.filter((book) => selectedBookmakers.has(book.key))
                          .map((book) => {
                            const market = book.markets?.find((m) => m.key === selectedMarket)
                            if (!market?.outcomes) return null

                            return (
                              <tr key={book.key} className="border-b border-border hover:bg-card transition-colors">
                                <td className="py-3 px-3 font-medium">
                                  <span className="mr-1">{SPORTSBOOK_LOGOS[book.key] || "📱"}</span>
                                  {SPORTSBOOKS[book.key as keyof typeof SPORTSBOOKS]?.title || book.title}
                                </td>
                                {market.outcomes.map((outcome, idx) => (
                                  <td
                                    key={idx}
                                    className="text-center py-3 px-3 font-semibold text-accent bg-accent/5 rounded"
                                  >
                                    {selectedMarket === "spreads" || selectedMarket === "totals"
                                      ? `${outcome.point !== undefined ? (outcome.point > 0 ? "+" : "") + outcome.point.toFixed(1) + " " : ""}${outcome.price.toFixed(2)}`
                                      : outcome.price.toFixed(2)}
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
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
