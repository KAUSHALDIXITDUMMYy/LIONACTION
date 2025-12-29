"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border shrink-0">
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}

