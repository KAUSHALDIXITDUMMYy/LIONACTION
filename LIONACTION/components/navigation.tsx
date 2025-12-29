"use client"

import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navigation() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-accent">🦁</span>
          <span className="text-xl font-bold">LionStrikeAction</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/odds" className="text-muted-foreground hover:text-foreground transition-colors">
            Odds
          </Link>
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
            Profile
          </Link>
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Home
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button onClick={handleLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
