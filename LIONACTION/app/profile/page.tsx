"use client"

import { useCallback, useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { getApiUrl, getAuthHeaders } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Save, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface UserProfile {
  id: number
  user_id: string
  telegram_id: string | null
  display_name: string | null
  created_at: string
  updated_at: string
}

function ProfileContent() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    telegram_id: "",
    display_name: "",
  })

  const fetchProfile = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/profile`, {
        headers: getAuthHeaders(user.uid),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch profile")
      }

      const data = await response.json()
      setProfile(data.data)
      setFormData({
        telegram_id: data.data.telegram_id || "",
        display_name: data.data.display_name || "",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/profile`, {
        method: "PATCH",
        headers: getAuthHeaders(user.uid),
        body: JSON.stringify({
          telegram_id: formData.telegram_id.trim() || null,
          display_name: formData.display_name.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to update profile")
      }

      const data = await response.json()
      setProfile(data.data)
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      })

      fetchProfile()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="text-center py-10">Loading profile...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <Card className="border-border/70 bg-gradient-to-r from-[#161922] via-[#11131a] to-[#0d0f12]">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <User className="w-8 h-8" />
              My Profile
            </CardTitle>
            <CardDescription>Manage your personal information and notification settings</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Your email is managed through your authentication provider
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                type="text"
                placeholder="Enter your display name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                This name will be displayed in your profile
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram_id">Telegram ID</Label>
              <Input
                id="telegram_id"
                type="text"
                placeholder="@username or Telegram User ID"
                value={formData.telegram_id}
                onChange={(e) => setFormData({ ...formData, telegram_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Add your Telegram ID or username to receive notifications (e.g., @username or 123456789)
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="min-w-[120px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {profile && (
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-mono text-xs">{profile.user_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member since:</span>
                <span>{new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
              {profile.updated_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last updated:</span>
                  <span>{new Date(profile.updated_at).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
