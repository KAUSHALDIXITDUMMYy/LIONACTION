"use client"

import { useEffect, useState, useMemo, useImperativeHandle, forwardRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from "recharts"
import { Trophy, TrendingUp, Calendar, BarChart3, Target } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getApiUrl, getAuthHeaders } from "@/lib/utils"
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns"
import { SPORTS } from "@/lib/odds-types"

interface AnalyticsData {
  overall: {
    wins: number
    losses: number
    winRate: number
    total: number
  }
  byWeek: Array<{
    week: string
    weekStart: string
    weekEnd: string
    wins: number
    losses: number
    winRate: number
    total: number
  }>
  bySport: Array<{
    sport_key: string
    sport_title: string | null
    wins: number
    losses: number
    winRate: number
    total: number
  }>
}

export interface AnalyticsSectionRef {
  refresh: () => void
}

export const AnalyticsSection = forwardRef<AnalyticsSectionRef>((props, ref) => {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/bets/analytics`, {
        headers: getAuthHeaders(user.uid),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Analytics API error:", response.status, errorText)
        throw new Error("Failed to fetch analytics")
      }

      const data = await response.json()
      console.log("[Analytics] Received data:", data)
      console.log("[Analytics] Overall stats:", data.data?.overall)
      console.log("[Analytics] Total resolved bets:", data.data?.overall?.total)
      console.log("[Analytics] Wins:", data.data?.overall?.wins)
      console.log("[Analytics] Losses:", data.data?.overall?.losses)
      console.log("[Analytics] By week:", data.data?.byWeek?.length || 0, "weeks")
      console.log("[Analytics] By sport:", data.data?.bySport?.length || 0, "sports")
      
      if (!data.data) {
        console.warn("[Analytics] No data field in response:", data)
      }
      
      setAnalytics(data.data)
    } catch (err) {
      console.error("Error fetching analytics:", err)
      setError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refresh: fetchAnalytics,
  }), [fetchAnalytics])

  // Get this week's stats
  const thisWeekStats = useMemo(() => {
    if (!analytics?.byWeek.length) return null
    
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    
    return analytics.byWeek.find(week => {
      const weekStartDate = new Date(week.weekStart)
      return weekStartDate >= weekStart && weekStartDate <= weekEnd
    }) || null
  }, [analytics])

  // Prepare chart data
  const weeklyChartData = useMemo(() => {
    if (!analytics?.byWeek.length) return []
    
    // Get last 8 weeks
    const recentWeeks = analytics.byWeek.slice(-8)
    return recentWeeks.map(week => ({
      week: week.week,
      label: format(new Date(week.weekStart), "MMM d"),
      winRate: Math.round(week.winRate * 10) / 10,
      wins: week.wins,
      losses: week.losses,
    }))
  }, [analytics])

  const sportChartData = useMemo(() => {
    if (!analytics?.bySport.length) return []
    
    return analytics.bySport.map(sport => ({
      sport: sport.sport_title || sport.sport_key,
      winRate: Math.round(sport.winRate * 10) / 10,
      wins: sport.wins,
      losses: sport.losses,
      total: sport.total,
    }))
  }, [analytics])

  if (loading) {
    return (
      <Card className="border-border/70">
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">Loading analytics...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border/70">
        <CardContent className="py-10">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Analytics
          </CardTitle>
          <CardDescription>Track your betting performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No analytics data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show analytics even if total is 0, but with a message
  if (analytics.overall.total === 0) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Analytics
          </CardTitle>
          <CardDescription>Track your betting performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No resolved bets yet</p>
            <p className="text-sm mt-2">
              Mark your bets as <span className="font-semibold text-green-500">won</span> or{" "}
              <span className="font-semibold text-red-500">lost</span> in the bet list below to see analytics.
            </p>
            <p className="text-xs mt-3 text-muted-foreground/70">
              Note: Only bets with status "won" or "lost" are included in analytics. "Pending" and "void" bets are excluded.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-gradient-to-br from-[#161922] to-[#0d0f12]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Overall Win Rate
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {analytics.overall.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {analytics.overall.wins} wins, {analytics.overall.losses} losses
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {analytics.overall.total} resolved bets
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-gradient-to-br from-[#161922] to-[#0d0f12]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                This Week
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {thisWeekStats ? (
              <>
                <div className="text-3xl font-bold text-foreground">
                  {thisWeekStats.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {thisWeekStats.wins} wins, {thisWeekStats.losses} losses
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {format(new Date(thisWeekStats.weekStart), "MMM d")} - {format(new Date(thisWeekStats.weekEnd), "MMM d")}
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-muted-foreground">—</div>
                <div className="text-sm text-muted-foreground mt-1">No bets this week</div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-gradient-to-br from-[#161922] to-[#0d0f12]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Best Sport
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {analytics.bySport.length > 0 ? (
              <>
                <div className="text-3xl font-bold text-foreground">
                  {analytics.bySport[0].winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {analytics.bySport[0].sport_title || analytics.bySport[0].sport_key}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {analytics.bySport[0].wins}W-{analytics.bySport[0].losses}L
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-muted-foreground">—</div>
                <div className="text-sm text-muted-foreground mt-1">No data</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Trend */}
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Weekly Win Rate Trend
            </CardTitle>
            <CardDescription>Last 8 weeks performance</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyChartData.length > 0 ? (
              <ChartContainer
                config={{
                  winRate: {
                    label: "Win Rate (%)",
                    color: "#3b82f6",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      label={{ value: "Win Rate (%)", angle: -90, position: "insideLeft" }}
                      domain={[0, 100]}
                    />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-card p-3 shadow-lg">
                            <p className="font-semibold mb-2 text-sm">{data.label}</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Win Rate:</span>
                                <span className="font-semibold">{data.winRate}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Record:</span>
                                <span className="font-semibold">{data.wins}W-{data.losses}L</span>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="winRate"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "#ffffff" }}
                      activeDot={{ r: 7, fill: "#60a5fa", strokeWidth: 2, stroke: "#ffffff" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No weekly data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Sport */}
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Win Rate by Sport
            </CardTitle>
            <CardDescription>Performance breakdown by sport</CardDescription>
          </CardHeader>
          <CardContent>
            {sportChartData.length > 0 ? (
              <ChartContainer
                config={{
                  winRate: {
                    label: "Win Rate (%)",
                    color: "#10b981",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sportChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="sport"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      label={{ value: "Win Rate (%)", angle: -90, position: "insideLeft" }}
                      domain={[0, 100]}
                    />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-card p-3 shadow-lg">
                            <p className="font-semibold mb-2 text-sm">{data.sport}</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Win Rate:</span>
                                <span className="font-semibold">{data.winRate}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Record:</span>
                                <span className="font-semibold">{data.wins}W-{data.losses}L</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Total:</span>
                                <span className="font-semibold">{data.total} bets</span>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar
                      dataKey="winRate"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No sport data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
})

AnalyticsSection.displayName = "AnalyticsSection"


