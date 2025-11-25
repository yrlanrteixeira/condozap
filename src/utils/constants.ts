// Time constants (in milliseconds)
export const NOTIFICATION_DURATION_MS = 3000
export const ONE_DAY_MS = 86400000
export const TWO_DAYS_MS = 172800000

// ID generation
let idCounter = Date.now()

export function generateUniqueId(): number {
  return idCounter++
}

export function resetIdCounter(startValue?: number): void {
  idCounter = startValue ?? Date.now()
}
