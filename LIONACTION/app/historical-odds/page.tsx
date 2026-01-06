"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { OddsSelector } from "@/components/odds-selector"
import { ProtectedRoute } from "@/components/protected-route"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import type { OddsEvent } from "@/lib/odds-types"
import { MARKETS, SPORTS, SPORTSBOOKS } from "@/lib/odds-types"
import { getApiUrl, getAuthHeaders, formatOdds, decimalToAmerican } from "@/lib/utils"
import { format } from "date-fns"
import { TrendingUp, Calendar, BarChart3, Bookmark } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface HistoricalSnapshot {
  snapshot_timestamp: string
  snapshot_type: string
  odds_data: OddsEvent
}

type ChartDataPoint = {
  timestamp: string
  timeLabel: string
  _savedOdds?: Record<string, boolean> // Track which bookmaker odds are saved
} & {
  [K in string as K extends 'timestamp' | 'timeLabel' | '_savedOdds' ? never : K]: string | number | null | undefined
}

interface SavedBet {
  id: number
  bookmaker_key: string
  market_key: string
  outcome_name: string
  locked_price: number
  locked_point: number | null
  created_at: string
}

function HistoricalOddsContent() {
  const { user } = useAuth()
  const [events, setEvents] = useState<OddsEvent[]>([])
  const [historicalData, setHistoricalData] = useState<HistoricalSnapshot[]>([])
  const [savedBets, setSavedBets] = useState<SavedBet[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sport, setSport] = useState("americanfootball_nfl")
  const [selectedGameId, setSelectedGameId] = useState<string>("")
  const [selectedMarket, setSelectedMarket] = useState("h2h")
  const [error, setError] = useState<string | null>(null)
  const [snapshotDebugInfo, setSnapshotDebugInfo] = useState<{
    total_snapshots: number
    by_type: Array<{ type: string; count: number; first: string; last: string }>
  } | null>(null)

  // Fetch available games from database
  const fetchGames = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/odds/db?sport=${sport}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch games")
      }
      const data = await response.json()
      setEvents(data.data || [])
      
      // Auto-select first game if available
      if (data.data && data.data.length > 0 && !selectedGameId) {
        setSelectedGameId(data.data[0].id)
      }
    } catch (err) {
      console.error("Error fetching games:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch games")
    } finally {
      setLoading(false)
    }
  }, [sport, selectedGameId])

  // Fetch saved bets for the selected game
  const fetchSavedBets = useCallback(async () => {
    if (!selectedGameId || !user?.uid) return

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/bets/game/${selectedGameId}`, {
        headers: getAuthHeaders(user.uid),
      })

      if (response.ok) {
        const data = await response.json()
        setSavedBets(data.data || [])
        console.log(`[Historical Odds] Fetched ${data.data?.length || 0} saved bets for game ${selectedGameId}`)
      }
    } catch (err) {
      console.warn("Failed to fetch saved bets:", err)
      // Don't show error to user, just log it
    }
  }, [selectedGameId, user])

  // Fetch historical data for selected game
  const fetchHistoricalData = useCallback(async () => {
    if (!selectedGameId) return

    setLoadingHistory(true)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/odds/historical?game_id=${selectedGameId}&market=${selectedMarket}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch historical data")
      }
      const data = await response.json()
      const snapshots = data.data || []
      
      console.log(`[Historical Odds] Fetched ${snapshots.length} snapshots from database for game ${selectedGameId}`)
      console.log(`[Historical Odds] Snapshot timestamps:`, snapshots.map((s: HistoricalSnapshot) => ({
        timestamp: s.snapshot_timestamp,
        type: s.snapshot_type,
        hasBookmakers: !!s.odds_data?.bookmakers?.length
      })))
      
      setHistoricalData(snapshots)

      // Fetch debug info about snapshots
      try {
        const debugResponse = await fetch(`${apiUrl}/api/odds/debug/snapshots?game_id=${selectedGameId}`)
        if (debugResponse.ok) {
          const debugData = await debugResponse.json()
          console.log(`[Historical Odds] Database has ${debugData.total_snapshots} total snapshots`)
          setSnapshotDebugInfo(debugData)
        }
      } catch (debugErr) {
        console.warn("Failed to fetch snapshot debug info:", debugErr)
      }
    } catch (err) {
      console.error("Error fetching historical data:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch historical data")
    } finally {
      setLoadingHistory(false)
    }
  }, [selectedGameId, selectedMarket])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  useEffect(() => {
    if (selectedGameId) {
      fetchHistoricalData()
      fetchSavedBets()
    }
  }, [selectedGameId, selectedMarket, fetchHistoricalData, fetchSavedBets])

  const selectedGame = useMemo(() => {
    return events.find((e) => e.id === selectedGameId)
  }, [events, selectedGameId])

  // Process historical data for chart
  const chartData = useMemo(() => {
    if (!historicalData.length || !selectedGame) {
      console.log(`[Historical Odds] No chart data: historicalData.length=${historicalData.length}, selectedGame=${!!selectedGame}`)
      return []
    }

    console.log(`[Historical Odds] Processing ${historicalData.length} snapshots for chart`)

    // Filter saved bets for the selected market
    const relevantSavedBets = savedBets.filter(bet => bet.market_key === selectedMarket)

    // Create chart data points - one point per snapshot timestamp
    const dataPoints: ChartDataPoint[] = historicalData.map((snapshot, index) => {
      const timestamp = new Date(snapshot.snapshot_timestamp)
      const point = {
        timestamp: snapshot.snapshot_timestamp,
        timeLabel: format(timestamp, "MMM d, HH:mm"),
        _savedOdds: {} as Record<string, boolean>,
      } as ChartDataPoint

      // Extract odds for each bookmaker for the selected market
      let bookmakerCount = 0
      snapshot.odds_data?.bookmakers?.forEach((book) => {
        const market = book.markets?.find((m) => m.key === selectedMarket)
        if (market?.outcomes && market.outcomes.length > 0) {
          // For moneyline (h2h), show away team odds (first outcome)
          // For spreads/totals, show the first outcome's price
          const outcome = market.outcomes[0]
          const price = outcome.price
          
          // Convert to American odds for display
          const americanOdds = Math.abs(price) >= 100 ? price : decimalToAmerican(price)
          
          point[book.key] = americanOdds
          bookmakerCount++

          // Check if this odds point matches a saved bet
          const savedBet = relevantSavedBets.find(bet => {
            if (bet.bookmaker_key !== book.key) return false
            
            // Match by price (within 0.01 tolerance for floating point)
            const priceMatch = Math.abs(bet.locked_price - price) < 0.01
            
            // For spreads/totals, also check point match
            if (selectedMarket === 'spreads' || selectedMarket === 'totals') {
              const pointValue = outcome.point
              const pointMatch = bet.locked_point !== null && pointValue !== undefined 
                ? Math.abs(bet.locked_point - pointValue) < 0.01
                : true
              return priceMatch && pointMatch
            }
            
            return priceMatch
          })

          if (savedBet) {
            point._savedOdds![book.key] = true
            console.log(`[Historical Odds] Found saved bet match: ${book.key} at ${point.timeLabel}`)
          }
        } else {
          point[book.key] = null as any
        }
      })

      if (index === 0) {
        console.log(`[Historical Odds] First snapshot (${snapshot.snapshot_timestamp}) has ${bookmakerCount} bookmakers with data for market ${selectedMarket}`)
      }
      if (index === historicalData.length - 1) {
        console.log(`[Historical Odds] Last snapshot (${snapshot.snapshot_timestamp}) has ${bookmakerCount} bookmakers`)
      }

      return point
    })

    console.log(`[Historical Odds] Created ${dataPoints.length} chart data points`)
    const savedPointsCount = dataPoints.filter(p => Object.keys(p._savedOdds || {}).length > 0).length
    console.log(`[Historical Odds] Found ${savedPointsCount} data points with saved odds`)
    
    return dataPoints
  }, [historicalData, selectedMarket, selectedGame, savedBets])

  // Get bookmaker colors for chart
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {}
    
    // Default colors for bookmakers (cycling through chart colors if no color defined)
    const defaultColors = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ]
    
    if (historicalData.length > 0) {
      let colorIndex = 0
      historicalData[0].odds_data.bookmakers?.forEach((book) => {
        const bookInfo = SPORTSBOOKS[book.key as keyof typeof SPORTSBOOKS]
        if (bookInfo) {
          const color = bookInfo.color || defaultColors[colorIndex % defaultColors.length]
          config[book.key] = {
            label: bookInfo.title,
            color: color,
          }
          colorIndex++
        }
      })
    }
    
    return config
  }, [historicalData])

  const sportTitle = Object.values(SPORTS).find((s) => s.key === sport)?.title ?? "Selected Sport"
  const marketTitle = Object.values(MARKETS).find((m) => m.key === selectedMarket)?.title ?? "Selected Market"

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1800px] mx-auto">
        <Card className="border-border/70 bg-gradient-to-r from-[#161922] via-[#11131a] to-[#0d0f12]">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-accent/15 text-accent border-accent/30">
                Historical Analysis
              </Badge>
              <Badge variant="outline" className="border-border/70 text-muted-foreground">
                {sportTitle}
              </Badge>
              <Badge variant="outline" className="border-border/70 text-muted-foreground">
                {marketTitle}
              </Badge>
            </div>
            <CardTitle className="text-3xl flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-accent" />
              Historical Odds Movement
            </CardTitle>
            <CardDescription className="max-w-2xl">
              Track how odds have moved over time across different sportsbooks. Analyze trends and identify the best moments to place your bets.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">Select Game & Market</CardTitle>
            <CardDescription>Choose a game and market type to view historical odds movement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-[auto_1fr_auto]">
              <OddsSelector
                selectedSport={sport}
                onSportChange={setSport}
              />
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Game</Label>
                <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a game" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.away_team} @ {event.home_team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Market Type</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(MARKETS).map((mkt) => (
                    <Badge
                      key={mkt.key}
                      variant={selectedMarket === mkt.key ? "default" : "outline"}
                      className={selectedMarket === mkt.key ? "bg-accent text-accent-foreground cursor-pointer" : "cursor-pointer hover:bg-accent/10"}
                      onClick={() => setSelectedMarket(mkt.key)}
                    >
                      {mkt.title}
                    </Badge>
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

        {loading && (
          <Card className="text-center py-10 border-border/70">
            Loading games...
          </Card>
        )}

        {!loading && !selectedGameId && events.length > 0 && (
          <Card className="text-center py-12 text-muted-foreground border-border/70">
            Please select a game to view historical odds
          </Card>
        )}

        {selectedGame && (
          <Card className="border-border/70">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {selectedGame.away_team} @ {selectedGame.home_team}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {format(new Date(selectedGame.commence_time), "EEE MMM d, yyyy 'at' h:mm a")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{historicalData.length} snapshots</span>
                  {snapshotDebugInfo && snapshotDebugInfo.total_snapshots !== historicalData.length && (
                    <Badge variant="outline" className="text-xs">
                      DB: {snapshotDebugInfo.total_snapshots}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {snapshotDebugInfo && snapshotDebugInfo.total_snapshots > 0 && (
                <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Snapshot Breakdown:</div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {snapshotDebugInfo.by_type.map((item) => (
                      <div key={item.type} className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                        <span className="text-muted-foreground">{item.count}</span>
                      </div>
                    ))}
                  </div>
                  {snapshotDebugInfo.total_snapshots === 1 && (
                    <div className="mt-2 text-xs text-amber-500/80">
                      ⚠️ Only 1 snapshot found in database for this game. 
                      {historicalData.length !== snapshotDebugInfo.total_snapshots && (
                        <span className="block mt-1">Note: {historicalData.length} snapshot(s) loaded from API response.</span>
                      )}
                    </div>
                  )}
                  {snapshotDebugInfo.total_snapshots > 1 && historicalData.length !== snapshotDebugInfo.total_snapshots && (
                    <div className="mt-2 text-xs text-amber-500/80">
                      ⚠️ Database has {snapshotDebugInfo.total_snapshots} snapshots, but only {historicalData.length} were returned by the API.
                    </div>
                  )}
                </div>
              )}
              {loadingHistory ? (
                <div className="text-center py-20 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 animate-pulse" />
                  Loading historical data...
                </div>
              ) : historicalData.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No historical data available for this game</p>
                  <p className="text-xs mt-2">Historical data is collected as games are polled</p>
                </div>
              ) : chartData.length > 0 ? (
                <div className="space-y-4">
                  <ChartContainer
                    config={chartConfig}
                    className="h-[500px] w-full"
                  >
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        dataKey="timeLabel"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        label={{ value: "Odds (American)", angle: -90, position: "insideLeft" }}
                      />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null
                          
                          const dataPoint = payload[0]?.payload as ChartDataPoint
                          const hasSavedOdds = dataPoint?._savedOdds && Object.keys(dataPoint._savedOdds).length > 0
                          
                          return (
                            <div className="rounded-lg border bg-card p-3 shadow-lg">
                              <p className="font-semibold mb-2 text-sm">{label}</p>
                              {hasSavedOdds && (
                                <div className="mb-2 pb-2 border-b border-border/50 flex items-center gap-1.5 text-xs text-amber-500">
                                  <Bookmark className="w-3 h-3" />
                                  <span>Saved odds highlighted</span>
                                </div>
                              )}
                              <div className="space-y-1">
                                {payload.map((entry: any, index: number) => {
                                  const bookmakerKey = entry.dataKey
                                  const bookInfo = SPORTSBOOKS[bookmakerKey as keyof typeof SPORTSBOOKS]
                                  const value = entry.value as number
                                  const isSaved = dataPoint?._savedOdds?.[bookmakerKey]
                                  
                                  if (value === null || value === undefined) return null
                                  
                                  return (
                                    <div key={index} className="flex items-center gap-2 text-xs">
                                      <div
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ 
                                          backgroundColor: isSaved ? "#fbbf24" : entry.color,
                                          border: isSaved ? "2px solid #f59e0b" : "none"
                                        }}
                                      />
                                      <span className="text-muted-foreground">
                                        {bookInfo?.title || bookmakerKey}:
                                      </span>
                                      <span className={`font-semibold ${isSaved ? "text-amber-500" : "text-foreground"}`}>
                                        {value > 0 ? `+${value}` : value}
                                      </span>
                                      {isSaved && (
                                        <Bookmark className="w-3 h-3 text-amber-500" />
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        }}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      {Object.keys(chartConfig).map((bookmakerKey) => {
                        // Check if this bookmaker has any data points
                        const hasData = chartData.some(point => point[bookmakerKey] != null)
                        if (!hasData) {
                          console.log(`[Historical Odds] Bookmaker ${bookmakerKey} has no data points, skipping line`)
                          return null
                        }
                        
                        // Check if this bookmaker has any saved odds
                        const hasSavedOdds = chartData.some(point => point._savedOdds?.[bookmakerKey])
                        
                        return (
                          <Line
                            key={bookmakerKey}
                            type="monotone"
                            dataKey={bookmakerKey}
                            stroke={chartConfig[bookmakerKey].color}
                            strokeWidth={2}
                            dot={(props: any) => {
                              const isSaved = props.payload?._savedOdds?.[bookmakerKey]
                              return (
                                <circle
                                  key={`${bookmakerKey}-${props.index}`}
                                  cx={props.cx}
                                  cy={props.cy}
                                  r={isSaved ? 6 : 3}
                                  fill={isSaved ? "#fbbf24" : chartConfig[bookmakerKey].color}
                                  stroke={isSaved ? "#f59e0b" : "none"}
                                  strokeWidth={isSaved ? 2 : 0}
                                  style={{ filter: isSaved ? "drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))" : "none" }}
                                />
                              )
                            }}
                            activeDot={(props: any) => {
                              const isSaved = props.payload?._savedOdds?.[bookmakerKey]
                              return (
                                <circle
                                  key={`${bookmakerKey}-active-${props.index}`}
                                  cx={props.cx}
                                  cy={props.cy}
                                  r={isSaved ? 8 : 5}
                                  fill={isSaved ? "#fbbf24" : chartConfig[bookmakerKey].color}
                                  stroke={isSaved ? "#f59e0b" : "#fff"}
                                  strokeWidth={isSaved ? 3 : 2}
                                  style={{ filter: isSaved ? "drop-shadow(0 0 6px rgba(251, 191, 36, 1))" : "none" }}
                                />
                              )
                            }}
                            connectNulls={false}
                          />
                        )
                      })}
                    </LineChart>
                  </ChartContainer>

                  {/* Legends */}
                  <div className="space-y-3 pt-4 border-t border-border/50">
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>Opening Line</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Hourly Pre-Game</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span>Live (60s)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Closing Line</span>
                      </div>
                    </div>
                    {savedBets.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-500">
                        <Bookmark className="w-3 h-3" />
                        <span>Highlighted points indicate your saved odds</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  Unable to process chart data
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

export default function HistoricalOddsPage() {
  return (
    <ProtectedRoute>
      <HistoricalOddsContent />
    </ProtectedRoute>
  )
}
