"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { AppLayout } from "@/components/app-layout"
import { OddsSelector } from "@/components/odds-selector"
import { OddsTableNew } from "@/components/odds-table-new"
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
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/odds?sport=${sport}`)
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
    <AppLayout>
      <div className="p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold mb-1">Sports Betting Odds</h1>
        </div>

        <div className="mb-4 md:mb-6">
          <OddsSelector
            selectedSport={sport}
            selectedMarket={market}
            onSportChange={setSport}
            onMarketChange={setMarket}
          />
        </div>

        {error && <Card className="bg-destructive/10 text-destructive p-4 mb-6">{error}</Card>}

        {loading && <Card className="text-center py-12">Loading odds...</Card>}

        {!loading && events.length === 0 && (
          <Card className="text-center py-12 text-muted-foreground">No odds available for this sport.</Card>
        )}

        {!loading && events.length > 0 && <OddsTableNew events={events} selectedMarket={market} />}
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
