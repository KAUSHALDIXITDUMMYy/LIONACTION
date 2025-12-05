"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"

export function Header() {
  const { user } = useAuth()

  const getInitials = (email: string | null | undefined) => {
    if (!email) return "U"
    return email.charAt(0).toUpperCase()
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-3 md:px-6 gap-2 md:gap-4">
      {/* Search Bar */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="search"
            placeholder="Search teams, leagues..."
            className="pl-8 md:pl-10 bg-background border-border text-sm md:text-base"
          />
        </div>
      </div>

      {/* User Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className="text-xs">{getInitials(user?.email)}</AvatarFallback>
      </Avatar>
    </header>
  )
}
