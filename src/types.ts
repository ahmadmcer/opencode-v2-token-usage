export interface TokenBreakdown {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
  total: number
}

export type SaturationLevel = "normal" | "warning" | "critical"

export interface ContextWindowState {
  currentTokens: number
  limitTokens: number
  usedPercent: number
  remainingTokens: number
  saturation: SaturationLevel
}

export interface TurnStats {
  turnIndex: number
  modelId: string
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
  total: number
  cost: number
}

export interface SessionTokenMetrics {
  sessionID: string
  modelId: string
  providerId: string
  sessionCost: number
  contextWindow: ContextWindowState
  sessionTotal: TokenBreakdown
  lastTurn?: TurnStats
  turnCount: number
  cacheHitRate: number
  estimatedCacheSavingsUSD: number
}
