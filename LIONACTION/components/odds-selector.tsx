"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SPORTS } from "@/lib/odds-types"

interface OddsSelectorProps {
  onSportChange: (sport: string) => void
  selectedSport: string
}

export function OddsSelector({ onSportChange, selectedSport }: OddsSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Sport</label>
      <Select value={selectedSport} onValueChange={onSportChange}>
        <SelectTrigger className="w-full md:w-64 h-10 bg-background/50 border-border/60">
          <SelectValue placeholder="Select Sport" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SPORTS).map(([key, sport]) => (
            <SelectItem key={key} value={sport.key}>
              {sport.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
