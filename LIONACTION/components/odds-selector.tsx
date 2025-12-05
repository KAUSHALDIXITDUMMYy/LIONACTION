"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SPORTS, MARKETS } from "@/lib/odds-types"

interface OddsSelectorProps {
  onSportChange: (sport: string) => void
  onMarketChange: (market: string) => void
  selectedSport: string
  selectedMarket: string
}

export function OddsSelector({ onSportChange, onMarketChange, selectedSport, selectedMarket }: OddsSelectorProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      <Select value={selectedSport} onValueChange={onSportChange}>
        <SelectTrigger className="w-full md:w-40 bg-card border-border">
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

      <Select value={selectedMarket} onValueChange={onMarketChange}>
        <SelectTrigger className="w-full md:w-40 bg-card border-border">
          <SelectValue placeholder="Select Market" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(MARKETS).map(([key, market]) => (
            <SelectItem key={key} value={market.key}>
              {market.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
