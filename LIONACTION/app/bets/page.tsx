"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function BetsContent() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">My Bets</h1>
          <p className="text-muted-foreground">Track your betting history and active bets</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Bet tracking feature will be available soon.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default function BetsPage() {
  return (
    <ProtectedRoute>
      <BetsContent />
    </ProtectedRoute>
  )
}

