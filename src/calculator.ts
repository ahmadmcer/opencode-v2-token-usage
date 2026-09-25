import type { SaturationLevel } from "./types.js"

/**
 * Format a token count into a readable string (e.g. 850, 14.5k, 1.25M)
 */
export function formatTokens(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "0"
  if (count < 1_000) {
    return Math.round(count).toLocaleString("en-US")
  }
  if (count < 1_000_000) {
    const k = count / 1_000
    return k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, "")}k`
  }
  const m = count / 1_000_000
  return `${m.toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1")}M`
}

/**
 * Format USD currency with appropriate precision
 */
export function formatCost(cost: number): string {
  if (!Number.isFinite(cost) || cost <= 0) return "$0.00"
  if (cost < 0.0001) return "<$0.0001"
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}

/**
 * Format percentage (e.g. 12.4%)
 */
export function formatPercent(percent: number): string {
  if (!Number.isFinite(percent) || percent <= 0) return "0%"
  if (percent >= 100) return "100%"
  return `${percent >= 10 ? percent.toFixed(1) : percent.toFixed(2)}%`
}

/**
 * Determine saturation level based on percentage:
 * - normal: < 60%
 * - warning: 60% - 80% (approaching compaction)
 * - critical: > 80% (risk of context truncation or overflow)
 */
export function getSaturationLevel(percent: number): SaturationLevel {
  if (percent >= 80) return "critical"
  if (percent >= 60) return "warning"
  return "normal"
}

/**
 * Render a visual ASCII / Unicode progress bar gauge, e.g. [████░░░░░░░░░░░░]
 */
export function renderProgressBar(percent: number, width: number = 14): string {
  const boundedPct = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))
  const filledBlocks = Math.round((boundedPct / 100) * width)
  const emptyBlocks = Math.max(0, width - filledBlocks)
  
  const filledStr = "█".repeat(filledBlocks)
  const emptyStr = "░".repeat(emptyBlocks)
  return `[${filledStr}${emptyStr}]`
}

/**
 * Return an indicator icon based on saturation
 */
export function getSaturationIcon(level: SaturationLevel): string {
  switch (level) {
    case "critical":
      return "🔴"
    case "warning":
      return "🟡"
    case "normal":
    default:
      return "🟢"
  }
}
