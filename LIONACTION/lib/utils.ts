import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts decimal odds to American (moneyline) odds format
 * @param decimal - Decimal odds (e.g., 2.50, 1.50)
 * @returns American odds (e.g., +150, -200)
 */
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2.0) {
    return Math.round((decimal - 1) * 100)
  } else {
    return Math.round(-100 / (decimal - 1))
  }
}

/**
 * Checks if odds are already in American format (vs decimal format)
 * @param price - Odds price
 * @returns true if price appears to be in American format
 */
function isAmericanFormat(price: number): boolean {
  // American odds are typically >= 100 (positive) or <= -100 (negative)
  // Decimal odds are typically between 1.0 and ~10.0
  // If absolute value is >= 100, it's American format
  return Math.abs(price) >= 100
}

/**
 * Formats odds for display based on market type
 * @param price - Odds price (decimal or American format)
 * @param market - Market type ('h2h', 'spreads', 'totals')
 * @param point - Optional point value for spreads/totals
 * @returns Formatted odds string
 */
export function formatOdds(price: number, market: string, point?: number): string {
  // Convert to American format if needed
  const americanOdds = isAmericanFormat(price) ? price : decimalToAmerican(price)
  const oddsStr = americanOdds > 0 ? `+${americanOdds}` : `${americanOdds}`
  
  if (market === 'h2h') {
    // Moneyline should be in American format
    return oddsStr
  } else if (market === 'spreads' || market === 'totals') {
    // Spreads and totals use American odds format with points
    const pointStr = point !== undefined ? `${point > 0 ? '+' : ''}${point.toFixed(1)} ` : ''
    return `${pointStr}${oddsStr}`
  }
  // Fallback to decimal format
  return price.toFixed(2)
}
