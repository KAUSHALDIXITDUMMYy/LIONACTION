"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock4, Flame, RefreshCw, Shield, Trophy } from "lucide-react"

import { AppLayout } from "@/components/app-layout"
import { OddsSelector } from "@/components/odds-selector"
import { OddsTable } from "@/components/odds-table"
import { ProtectedRoute } from "@/components/protected-route"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OddsEvent } from "@/lib/odds-types"
import { MARKETS, SPORTS, SPORTSBOOKS } from "@/lib/odds-types"

function OddsContent() {
  const [events, setEvents] = useState<OddsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState("americanfootball_nfl")
  const [market, setMarket] = useState("h2h")
  const [error, setError] = useState<string | null>(null)

  const fetchOdds = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/odds?sport=${sport}`)
      if (!response.ok) {
        throw new Error("Failed to fetch odds")
      }
      const data = await response.json()
      console.log("[v0] Received odds data:", data.data?.length || 0, "events")
      if (data.data && data.data.length > 0) {
        console.log("[v0] First event has", data.data[0].bookmakers?.length || 0, "bookmakers")
      }
      setEvents(data.data || [])
    } catch (err) {
      console.error("[v0] Error fetching odds:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch odds")
    } finally {
      setLoading(false)
    }
  }, [sport])

  useEffect(() => {
    fetchOdds()
  }, [fetchOdds])

  const availableSportsbooks = useMemo(() => {
    const books = new Set<string>()
    events.forEach((event) => {
      event.bookmakers?.forEach((book) => {
        if (SPORTSBOOKS[book.key as keyof typeof SPORTSBOOKS]) {
          books.add(book.key)
        }
      })
    })
    return Array.from(books)
  }, [events])

  const nextKickoff = useMemo(() => {
    if (!events.length) return null
    const sorted = [...events].sort(
      (a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime(),
    )
    return new Date(sorted[0].commence_time)
  }, [events])

  const marketTitle = Object.values(MARKETS).find((m) => m.key === market)?.title ?? "Selected Market"
  const sportTitle = Object.values(SPORTS).find((s) => s.key === sport)?.title ?? "Selected Sport"

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1800px] mx-auto">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card className="border-border/70 bg-gradient-to-r from-[#161922] via-[#11131a] to-[#0d0f12]">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-accent/15 text-accent border-accent/30">
                    Live board
                  </Badge>
                  <Badge variant="outline" className="border-border/70 text-muted-foreground">
                    {sportTitle}
                  </Badge>
                  <Badge variant="outline" className="border-border/70 text-muted-foreground">
                    {marketTitle}
                  </Badge>
                </div>
                <CardTitle className="text-3xl">Sports Betting Odds</CardTitle>
                <CardDescription className="max-w-2xl">
                  Compare real-time lines across the top books, spot movers quickly, and expand a matchup for a full
                  grid of prices.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Games tracked", value: events.length || "—", icon: Trophy },
                  { label: "Sportsbooks live", value: availableSportsbooks.length || "—", icon: Shield },
                  { label: "Market focus", value: marketTitle, icon: Flame },
                  {
                    label: "Next kickoff",
                    value: nextKickoff ? nextKickoff.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" }) : "TBD",
                    icon: Clock4,
                  },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="rounded-xl border border-border/60 bg-card/70 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon className="w-4 h-4 text-accent" />
                        {item.label}
                      </div>
                      <div className="text-lg font-semibold mt-1">{item.value}</div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Session status</CardTitle>
                <CardDescription>Keep your board current</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Refresh feed</p>
                    <p className="text-xs text-muted-foreground">Pull the latest odds instantly</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2" onClick={fetchOdds} disabled={loading}>
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Add custom filters</p>
                    <p className="text-xs text-muted-foreground">Dial into a league or market</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-accent hover:text-accent" asChild>
                    <Link href="/odds">
                      Manage <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Filter the board</CardTitle>
                  <CardDescription className="mt-1.5">Choose sport and market to focus on</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border/70 text-muted-foreground text-xs">
                    Real-time feed
                  </Badge>
                  <Badge variant="outline" className="border-border/70 text-muted-foreground text-xs">
                    Multi-book view
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                <OddsSelector
                  selectedSport={sport}
                  onSportChange={setSport}
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Market Type</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(MARKETS).map((mkt) => (
                      <Button
                        key={mkt.key}
                        variant={market === mkt.key ? "default" : "outline"}
                        size="sm"
                        className={market === mkt.key ? "bg-accent text-accent-foreground hover:bg-accent/90" : "text-muted-foreground hover:text-foreground hover:bg-accent/10"}
                        onClick={() => setMarket(mkt.key)}
                      >
                        {mkt.title}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card className="bg-destructive/10 text-destructive border-destructive/40 p-4">
              {error}
            </Card>
          )}

          {loading && <Card className="text-center py-10 border-border/70">Loading odds...</Card>}

          {!loading && events.length === 0 && (
            <Card className="text-center py-12 text-muted-foreground border-border/70">
              No odds available for this sport. Try a different market or sportsbook selection.
            </Card>
          )}

          {!loading && events.length > 0 && <OddsTable events={events} selectedMarket={market} />}
      </div>
    </AppLayout>
  )
}

export default function OddsPage() {
  return (
    <ProtectedRoute>
      <OddsContent />
    </ProtectedRoute>
  )
}
