"use client"

import { useState } from "react"
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid"
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getApiUrl, getAuthHeaders } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface SaveBetButtonProps {
  event: {
    id: string
    sport_key: string
    sport_title: string
  }
  bookmakerKey: string
  marketKey: string
  outcomeName: string
  price: number
  point?: number
}

export function SaveBetButton({
  event,
  bookmakerKey,
  marketKey,
  outcomeName,
  price,
  point,
}: SaveBetButtonProps) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent expanding/collapsing the game card

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save bets",
        variant: "destructive",
      })
      return
    }

    if (!event.id || !event.sport_key || !bookmakerKey || !marketKey || !outcomeName || price === undefined) {
      toast({
        title: "Invalid data",
        description: "Missing required information to save bet",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/bets`, {
        method: "POST",
        headers: getAuthHeaders(user.uid),
        body: JSON.stringify({
          game_id: event.id,
          sport_key: event.sport_key,
          bookmaker_key: bookmakerKey,
          market_key: marketKey,
          outcome_name: outcomeName,
          locked_price: price,
          locked_point: point !== undefined ? point : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`
        throw new Error(errorMessage)
      }

      const result = await response.json()
      setSaved(true)
      toast({
        title: "Bet saved",
        description: "Your bet has been saved to your profile",
      })

      // Reset saved state after 2 seconds
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error("Error saving bet:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save bet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return null // Don't show save button if not logged in
  }

  return (
    <LiquidButton
      size="sm"
      variant="ghost"
      onClick={handleSave}
      disabled={saving || saved}
      className="h-6 w-6 p-0"
      title={saved ? "Bet saved!" : "Save this bet"}
    >
      {saving ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : saved ? (
        <BookmarkCheck className="h-3 w-3 text-green-500" />
      ) : (
        <Bookmark className="h-3 w-3" />
      )}
    </LiquidButton>
  )
}
