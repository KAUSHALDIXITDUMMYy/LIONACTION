"use client"
import { ProtectedRoute } from "@/components/protected-route"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown } from "lucide-react"
import { useState, useEffect } from "react"
import type { OddsEvent } from "@/lib/odds-types"

function HomeContent() {
  const [featuredEvent, setFeaturedEvent] = useState<OddsEvent | null>(null)
  const [todaysGames, setTodaysGames] = useState<OddsEvent[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/odds?sport=americanfootball_nfl`)
        if (response.ok) {
          const data = await response.json()
          if (data.data && data.data.length > 0) {
            setFeaturedEvent(data.data[0])
            setTodaysGames(data.data.slice(0, 3))
          }
        }
      } catch (error) {
        console.error("Failed to fetch featured odds:", error)
      }
    }
    fetchData()
  }, [])

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold mb-1">My Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Your personalized view of the latest odds</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Featured Match - Large Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Featured Match</CardTitle>
            </CardHeader>
            <CardContent>
              {featuredEvent ? (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center text-white text-2xl">
                    🏈
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg mb-1">
                      {featuredEvent.away_team} vs. {featuredEvent.home_team}
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      {new Date(featuredEvent.commence_time).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-muted-foreground">Moneyline: </span>
                        <span className="font-medium">
                          {featuredEvent.away_team} +150, {featuredEvent.home_team} -120, Draw +250
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Spread: </span>
                        <span className="font-medium">-1.5, Total: O/U 2.5</span>
                      </div>
                    </div>
                    <Button className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black">
                      View All Markets
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Loading featured match...</div>
              )}
            </CardContent>
          </Card>

          {/* Odds Movers */}
          <Card>
            <CardHeader>
              <CardTitle>Odds Movers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-medium text-sm mb-1">GS Warriors vs LAL</div>
                <div className="text-xs text-muted-foreground">
                  Spread: -5.5{" "}
                  <span className="text-green-500 inline-flex items-center">
                    <ArrowUp className="w-3 h-3 mr-1" />-110
                  </span>{" "}
                  <span className="text-red-500 inline-flex items-center">
                    <ArrowDown className="w-3 h-3 mr-1" />-125
                  </span>
                </div>
              </div>
              <div>
                <div className="font-medium text-sm mb-1">NY Yankees vs BOS</div>
                <div className="text-xs text-muted-foreground">
                  Moneyline{" "}
                  <span className="text-red-500 inline-flex items-center">
                    <ArrowDown className="w-3 h-3 mr-1" />+150
                  </span>{" "}
                  <span className="text-green-500 inline-flex items-center">
                    <ArrowUp className="w-3 h-3 mr-1" />+135
                  </span>
                </div>
              </div>
              <div>
                <div className="font-medium text-sm mb-1">Real Madrid vs BAR</div>
                <div className="text-xs text-muted-foreground">
                  Total O/U: 3.5{" "}
                  <span className="text-green-500 inline-flex items-center">
                    <ArrowUp className="w-3 h-3 mr-1" />-105
                  </span>{" "}
                  <span className="text-red-500 inline-flex items-center">
                    <ArrowDown className="w-3 h-3 mr-1" />-115
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Favorite Teams */}
          <Card>
            <CardHeader>
              <CardTitle>My Favorite Teams</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">Golden State Warriors</div>
                  <div className="text-xs text-muted-foreground">Next Match vs. Lakers</div>
                  <Button variant="link" className="p-0 h-auto text-xs text-yellow-500 mt-1">
                    See Odds →
                  </Button>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  🏀
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">Kansas City Chiefs</div>
                  <div className="text-xs text-muted-foreground">Next Match vs. Raiders</div>
                  <Button variant="link" className="p-0 h-auto text-xs text-yellow-500 mt-1">
                    See Odds →
                  </Button>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white">
                  🏈
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Games */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Today's NBA Games</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaysGames.length > 0 ? (
                todaysGames.map((game) => {
                  const gameTime = new Date(game.commence_time)
                  return (
                    <div key={game.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="font-medium text-sm mb-1">
                        {game.away_team} @ {game.home_team}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {gameTime.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        EST
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {game.home_team.split(" ").pop()} -7.5, O/U 225.5
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">No games today</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  )
}
