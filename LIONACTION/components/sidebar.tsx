"use client"

import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid"
import { LayoutDashboard, Globe, LogOut, UserCircle, X, Bookmark, TrendingUp } from "lucide-react"
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
    { href: "/historical-odds", label: "Historical Odds", icon: TrendingUp },
    { href: "/my-odds", label: "My Odds", icon: Bookmark },
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
          <LiquidButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden h-8 w-8"
          >
            <X className="h-4 w-4" />
          </LiquidButton>
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
        <Link
          href="/profile"
          onClick={handleLinkClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm",
            pathname === "/profile"
              ? "bg-accent text-accent-foreground font-semibold shadow-sm"
              : "bg-sidebar-accent/50 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
            pathname === "/profile"
              ? "bg-accent-foreground/10"
              : "bg-sidebar-accent"
          )}>
            <UserCircle className={cn(
              "w-5 h-5 transition-colors",
              pathname === "/profile"
                ? "text-accent-foreground"
                : "text-sidebar-foreground/70"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn(
              "text-sm font-medium truncate transition-colors",
              pathname === "/profile"
                ? "text-accent-foreground"
                : "text-sidebar-foreground"
            )}>
              My Profile
            </div>
          </div>
        </Link>
        <LiquidButton
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-3 px-3 py-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </LiquidButton>
      </div>
    </aside>
  )
}

