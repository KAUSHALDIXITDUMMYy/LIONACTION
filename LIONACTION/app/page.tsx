"use client"

import Image from "next/image"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  CalendarClock,
  Flame,
  Shield,
  Sparkles,
  Trophy,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const oddsMovers = [
  { teams: "GS Warriors vs LAL", movement: "+5.5 → +5.5", change: "+110 → +125", trend: "up" as const },
  { teams: "NY Yankees vs BOS", movement: "Moneyline", change: "+150 → +135", trend: "down" as const },
  { teams: "Real Madrid vs BAR", movement: "Total O/U 3.5", change: "+105 → -115", trend: "up" as const },
]

const favoriteTeams = [
  { name: "Golden State Warriors", next: "Next match vs. Lakers" },
  { name: "Kansas City Chiefs", next: "Next match vs. Raiders" },
]

const todaysGames = [
  { title: "Lakers @ Celtics", detail: "Spread: -7.5 | O/U 225.5" },
  { title: "Nets @ 76ers", detail: "Spread: -4.0 | O/U 218.0" },
  { title: "Suns @ Mavericks", detail: "Spread: -1.5 | O/U 235.5" },
]

function HomeContent() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1800px] mx-auto">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 overflow-hidden border-border/60 bg-gradient-to-r from-[#161922] via-[#11131a] to-[#0d0f12]">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 text-accent px-3 py-1 text-xs font-medium w-fit">
                      <Sparkles className="w-4 h-4" />
                      Personalized dashboard preview
                    </div>
                    <div>
                      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Welcome back to LionStrikeAction</h1>
                      <p className="text-muted-foreground max-w-2xl">
                        Track the hottest lines across top sportsbooks, view odds movers at a glance, and jump straight into the markets you care about.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <LiquidButton size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                        <Link href="/odds" className="inline-flex items-center gap-2">
                          View Live Odds <ArrowRight className="w-4 h-4" />
                        </Link>
                      </LiquidButton>
                      <LiquidButton size="lg" variant="outline" className="border-border text-foreground">
                        Build Custom Widget
                      </LiquidButton>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: "Tracked Sportsbooks", value: "7 live", icon: Shield },
                        { label: "Active Alerts", value: "12", icon: Flame },
                        { label: "Open Markets", value: "48", icon: Activity },
                      ].map((item) => {
                        const Icon = item.icon
                        return (
                          <div key={item.label} className="rounded-xl border border-border/70 bg-card/50 p-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Icon className="w-4 h-4 text-accent" />
                              {item.label}
                            </div>
                            <div className="text-lg font-semibold mt-1">{item.value}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="relative h-48 w-full lg:w-72 overflow-hidden rounded-2xl border border-border/60 bg-card/70">
                    <Image
                      src="/placeholder.jpg"
                      alt="Featured match"
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 288px"
                      className="object-cover opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
                    <div className="absolute bottom-4 left-4 right-4 space-y-1">
                      <p className="text-xs uppercase tracking-wide text-accent">Featured match</p>
                      <p className="text-lg font-semibold">Manchester United vs Liverpool</p>
                      <p className="text-xs text-muted-foreground">Moneyline: Man U +150 | Spread: -1.5 | O/U 2.5</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle>Day overview</CardTitle>
                  <CardDescription>Quick look at today&apos;s board</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Games with movement", value: "18", badge: "+6 in the last hour" },
                    { label: "Best line improvements", value: "12", badge: "Across 4 books" },
                    { label: "Bets you follow", value: "9", badge: "Updated 15m ago" },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                      <div className="space-y-0.5">
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                      </div>
                      <span className="text-xs text-accent bg-accent/15 px-2 py-1 rounded-full">{stat.badge}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle>Upcoming highlights</CardTitle>
                  <CardDescription>Keep an eye on what moves next</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { title: "NFL · Week 9", detail: "Lines open in 3h", icon: CalendarClock },
                    { title: "NBA · Live tonight", detail: "5 games with sharp movement", icon: TrendingUp },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.title} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                        <div className="p-2 rounded-md bg-accent/15 text-accent">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-border/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Featured market</CardTitle>
                  <CardDescription>Premier League · Tomorrow, 8:00 PM</CardDescription>
                </div>
                <LiquidButton variant="outline" size="sm" asChild>
                  <Link href="/odds" className="inline-flex items-center gap-2">
                    View market <ArrowRight className="w-4 h-4" />
                  </Link>
                </LiquidButton>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                {[
                  { label: "Moneyline", value: "Man U +150 / LIV -120" },
                  { label: "Spread", value: "LIV -1.5 (+102)" },
                  { label: "Total", value: "O/U 2.5 (-110)" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/60 bg-card/70 p-4">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-semibold">{item.value}</p>
                  </div>
                ))}
                <div className="md:col-span-3 rounded-xl border border-border/60 bg-card/50 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Live comparison</p>
                    <p className="text-base font-semibold">DraftKings showing best away line right now</p>
                  </div>
                  <span className="text-xs rounded-full bg-accent/15 text-accent px-3 py-1">Best price</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle>Confidence snapshot</CardTitle>
                <CardDescription>Line stability across books</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Line consensus", value: "83%", icon: Trophy },
                  { label: "Movement heat", value: "High", icon: Flame },
                  { label: "Hold steady", value: "12 games", icon: Shield },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-accent/15 text-accent">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">vs top sportsbooks</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">{item.value}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Odds movers</CardTitle>
                  <CardDescription>Lines shifting the fastest</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {oddsMovers.map((item) => (
                  <div
                    key={item.teams}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold">{item.teams}</p>
                      <p className="text-xs text-muted-foreground">{item.movement}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium">
                      {item.trend === "up" ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={item.trend === "up" ? "text-green-400" : "text-red-400"}>{item.change}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>My favorite teams</CardTitle>
                  <CardDescription>Quick view of upcoming action</CardDescription>
                </div>
                <LiquidButton variant="ghost" size="sm" className="text-accent hover:text-accent">
                  Manage
                </LiquidButton>
              </CardHeader>
              <CardContent className="space-y-3">
                {favoriteTeams.map((team) => (
                  <div key={team.name} className="rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                    <p className="text-sm font-semibold">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team.next}</p>
                    <LiquidButton variant="ghost" size="sm" className="px-0 text-accent hover:text-accent">
                      See odds
                    </LiquidButton>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Today&apos;s games</CardTitle>
                  <CardDescription>Fast filters for tonight</CardDescription>
                </div>
                <LiquidButton variant="outline" size="sm" asChild>
                  <Link href="/odds">All markets</Link>
                </LiquidButton>
              </CardHeader>
              <CardContent className="space-y-3">
                {todaysGames.map((game) => (
                  <div key={game.title} className="rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                    <p className="text-sm font-semibold">{game.title}</p>
                    <p className="text-xs text-muted-foreground">{game.detail}</p>
                  </div>
                ))}
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
