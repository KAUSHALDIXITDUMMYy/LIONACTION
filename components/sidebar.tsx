"use client"

import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Globe, LogOut, UserCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const handleLogout = async () => {
    await logout()
  }

  const handleLinkClick = () => {
    if (onClose) {
      onClose()
    }
  }

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/odds", label: "Odds Board", icon: Globe },
  ]

  return (
    <aside className="h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={handleLinkClick}>
          <span className="text-2xl font-bold text-accent">🦁</span>
          <span className="text-lg font-bold text-sidebar-foreground">LionStrikeAction</span>
        </Link>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href === "/" && pathname === "/")
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm",
                isActive
                  ? "bg-accent text-accent-foreground font-semibold shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border space-y-2 mt-auto">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/50">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
            <UserCircle className="w-5 h-5 text-sidebar-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.displayName || user?.email?.split("@")[0] || "User"}
            </div>
            <div className="text-xs text-sidebar-foreground/60 truncate">
              {user?.email || "user@email.com"}
            </div>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-3 px-3 py-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </Button>
      </div>
    </aside>
  )
}

