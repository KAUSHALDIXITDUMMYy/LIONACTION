"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Navigation } from "@/components/navigation"
import { OddsSelector } from "@/components/odds-selector"
import { OddsTable } from "@/components/odds-table"
import { Card } from "@/components/ui/card"
import type { OddsEvent } from "@/lib/odds-types"

function OddsContent() {
  const [events, setEvents] = useState<OddsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState("americanfootball_nfl")
  const [market, setMarket] = useState("h2h")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOdds = async () => {
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
    }

    fetchOdds()
  }, [sport])

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Sports Betting Odds</h1>
          <p className="text-muted-foreground">Compare real-time odds across all major sportsbooks</p>
        </div>

        <OddsSelector
          selectedSport={sport}
          selectedMarket={market}
          onSportChange={setSport}
          onMarketChange={setMarket}
        />

        {error && <Card className="bg-destructive/10 text-destructive p-4 mb-6">{error}</Card>}

        {loading && <Card className="text-center py-12">Loading odds...</Card>}

        {!loading && events.length === 0 && (
          <Card className="text-center py-12 text-muted-foreground">No odds available for this sport.</Card>
        )}

        {!loading && events.length > 0 && <OddsTable events={events} selectedMarket={market} />}
      </main>
    </div>
  )
}

export default function OddsPage() {
  return (
    <ProtectedRoute>
      <OddsContent />
    </ProtectedRoute>
  )
}
