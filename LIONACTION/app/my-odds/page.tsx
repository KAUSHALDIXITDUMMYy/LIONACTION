"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { AppLayout } from "@/components/app-layout"
import { AnalyticsSection, type AnalyticsSectionRef } from "@/components/analytics-section"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { getApiUrl, getAuthHeaders, formatOdds } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Trophy, TrendingUp, Calendar, Edit2, Trash2, Bookmark } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"

interface SavedBet {
  id: number
  user_id: string
  game_id: string
  sport_key: string
  bookmaker_key: string
  market_key: string
  outcome_name: string
  locked_price: number
  locked_point: number | null
  edited_price: number | null
  edited_point: number | null
  notes: string | null
  status: "pending" | "won" | "lost" | "void"
  created_at: string
  updated_at: string
  game_info?: {
    home_team: string
    away_team: string
    sport_title: string
    commence_time: string
    status: string
  }
}

interface BetStats {
  total: number
  pending: number
  won: number
  lost: number
  winRate: number
}

function MyOddsContent() {
  const { user } = useAuth()
  const analyticsRef = useRef<AnalyticsSectionRef>(null)
  const [bets, setBets] = useState<SavedBet[]>([])
  const [stats, setStats] = useState<BetStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingBet, setEditingBet] = useState<SavedBet | null>(null)
  const [editForm, setEditForm] = useState({
    edited_price: "",
    edited_point: "",
    notes: "",
    status: "pending" as const,
  })

  const fetchBets = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      const [betsResponse, statsResponse] = await Promise.all([
        fetch(`${apiUrl}/api/bets`, {
          headers: getAuthHeaders(user.uid),
        }),
        fetch(`${apiUrl}/api/bets/stats`, {
          headers: getAuthHeaders(user.uid),
        }),
      ])

      if (!betsResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to fetch bets")
      }

      const betsData = await betsResponse.json()
      const statsData = await statsResponse.json()

      setBets(betsData.data || [])
      setStats(statsData.data || null)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load bets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchBets()
  }, [fetchBets])

  const handleEdit = (bet: SavedBet) => {
    setEditingBet(bet)
    setEditForm({
      edited_price: bet.edited_price?.toString() || "",
      edited_point: bet.edited_point?.toString() || "",
      notes: bet.notes || "",
      status: bet.status,
    })
  }

  const handleSaveEdit = async () => {
    if (!user || !editingBet) return

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/bets/${editingBet.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(user.uid),
        body: JSON.stringify({
          edited_price: editForm.edited_price ? parseFloat(editForm.edited_price) : null,
          edited_point: editForm.edited_point ? parseFloat(editForm.edited_point) : null,
          notes: editForm.notes || null,
          status: editForm.status,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update bet")
      }

      toast({
        title: "Bet updated",
        description: "Your bet has been updated successfully",
      })

      setEditingBet(null)
      fetchBets()
      // Refresh analytics after bet update
      analyticsRef.current?.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update bet",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (betId: number) => {
    if (!user) return

    if (!confirm("Are you sure you want to delete this bet?")) return

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/bets/${betId}`, {
        method: "DELETE",
        headers: getAuthHeaders(user.uid),
      })

      if (!response.ok) {
        throw new Error("Failed to delete bet")
      }

      toast({
        title: "Bet deleted",
        description: "Your bet has been deleted",
      })

      fetchBets()
      // Refresh analytics after bet deletion
      analyticsRef.current?.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete bet",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won":
        return "bg-green-500/20 text-green-500 border-green-500/30"
      case "lost":
        return "bg-red-500/20 text-red-500 border-red-500/30"
      case "void":
        return "bg-gray-500/20 text-gray-500 border-gray-500/30"
      default:
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
    }
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1800px] mx-auto">
        {/* Performance Analytics */}
        <AnalyticsSection ref={analyticsRef} />

        <Card className="border-border/70 bg-gradient-to-r from-[#161922] via-[#11131a] to-[#0d0f12]">
          <CardHeader>
            <CardTitle className="text-3xl">My Odds</CardTitle>
            <CardDescription>Track your saved bets and performance</CardDescription>
          </CardHeader>
          <CardContent>
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border/60 bg-card/70 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Bookmark className="w-4 h-4 text-accent" />
                    Total Bets
                  </div>
                  <div className="text-2xl font-semibold">{stats.total}</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/70 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4 text-accent" />
                    Pending
                  </div>
                  <div className="text-2xl font-semibold">{stats.pending}</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/70 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Trophy className="w-4 h-4 text-green-500" />
                    Won
                  </div>
                  <div className="text-2xl font-semibold text-green-500">{stats.won}</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/70 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    Win Rate
                  </div>
                  <div className="text-2xl font-semibold">{stats.winRate.toFixed(1)}%</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Saved Bets</CardTitle>
            <CardDescription>View and manage your saved bets</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10">Loading bets...</div>
            ) : bets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No saved bets yet. Start saving bets from the odds dashboard!
              </div>
            ) : (
              <div className="space-y-4">
                {bets.map((bet) => (
                  <Card key={bet.id} className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getStatusColor(bet.status)}>{bet.status.toUpperCase()}</Badge>
                            <Badge variant="outline">{bet.sport_key}</Badge>
                            <Badge variant="outline">{bet.market_key}</Badge>
                            <Badge variant="outline">{bet.bookmaker_key}</Badge>
                          </div>
                          <div>
                            {bet.game_info && (
                              <p className="font-semibold text-base mb-1">
                                {bet.game_info.away_team} @ {bet.game_info.home_team}
                              </p>
                            )}
                            <p className="font-semibold">{bet.outcome_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {bet.bookmaker_key} • {bet.market_key}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Locked: {formatOdds(bet.locked_price, bet.market_key, bet.locked_point || undefined)}
                              {bet.edited_price && (
                                <span className="ml-2">
                                  → Edited: {formatOdds(bet.edited_price, bet.market_key, bet.edited_point || undefined)}
                                </span>
                              )}
                            </p>
                            {bet.notes && <p className="text-sm mt-1 italic text-muted-foreground">"{bet.notes}"</p>}
                            {bet.game_info && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Game: {format(new Date(bet.game_info.commence_time), "MMM d, yyyy h:mm a")}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Saved: {format(new Date(bet.created_at), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <LiquidButton
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(bet)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </LiquidButton>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Bet</DialogTitle>
                                <DialogDescription>Update your bet details</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Edited Price (Odds)</Label>
                                  <Input
                                    type="number"
                                    placeholder={bet.locked_price.toString()}
                                    value={editForm.edited_price}
                                    onChange={(e) => setEditForm({ ...editForm, edited_price: e.target.value })}
                                  />
                                </div>
                                {(bet.market_key === "spreads" || bet.market_key === "totals") && (
                                  <div className="space-y-2">
                                    <Label>Edited Point</Label>
                                    <Input
                                      type="number"
                                      step="0.5"
                                      placeholder={bet.locked_point?.toString() || ""}
                                      value={editForm.edited_point}
                                      onChange={(e) => setEditForm({ ...editForm, edited_point: e.target.value })}
                                    />
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <Label>Notes</Label>
                                  <Textarea
                                    placeholder="Add notes about this bet..."
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Status</Label>
                                  <Select
                                    value={editForm.status}
                                    onValueChange={(value: any) => setEditForm({ ...editForm, status: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="won">Won</SelectItem>
                                      <SelectItem value="lost">Lost</SelectItem>
                                      <SelectItem value="void">Void</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <LiquidButton variant="outline" onClick={() => setEditingBet(null)}>
                                  Cancel
                                </LiquidButton>
                                <LiquidButton onClick={handleSaveEdit}>Save Changes</LiquidButton>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <LiquidButton
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(bet.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </LiquidButton>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default function MyOddsPage() {
  return (
    <ProtectedRoute>
      <MyOddsContent />
    </ProtectedRoute>
  )
}
