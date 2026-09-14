/**
 * Shared Authoritative Time and Duration Calculation Utilities
 * 
 * Used across Admin Dashboard, Public Leaderboard, and Excel Export
 * to ensure 100% consistent, server-authoritative Total Time calculations.
 * 
 * Formula: Total Time = Game Time + Penalty Time
 */

export function calculateTotalTimeSeconds(gameTimeSeconds: number, penaltySeconds: number): number {
  return Math.max(0, Math.floor(gameTimeSeconds)) + Math.max(0, Math.floor(penaltySeconds));
}

export function formatDurationMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}
