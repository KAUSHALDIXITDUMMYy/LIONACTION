"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function SettingsContent() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your preferences</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Settings feature will be available soon.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  )
}

