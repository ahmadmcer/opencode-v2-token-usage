import { getSaturationLevel } from "./calculator.js"
import type {
  ContextWindowState,
  SessionTokenMetrics,
  TokenBreakdown,
  TurnStats,
} from "./types.js"

export interface RawTokens {
  input?: number
  output?: number
  reasoning?: number
  cache?: {
    read?: number
    write?: number
  }
}

export interface RawModelRef {
  providerID?: string
  id?: string
  variant?: string
}

export interface RawModelInfo {
  id: string
  providerID: string
  limit?: {
    context?: number
    output?: number
  }
  cost?: Array<{
    input?: number
    output?: number
    cache?: {
      read?: number
      write?: number
    }
  }>
}

export interface RawMessage {
  type: string
  tokens?: RawTokens
  cost?: number
  model?: RawModelRef
}

export interface RawSession {
  id?: string
  cost?: number
  model?: RawModelRef
  tokens?: RawTokens
}

/**
 * Heuristic fallback context limits for well-known model families
 * when limit is omitted in the model catalog.
 */
export function getDefaultContextLimit(modelId: string): number {
  const lower = modelId.toLowerCase()
  if (lower.includes("gemini")) return 1_000_000
  if (lower.includes("claude-3") || lower.includes("claude-sonnet") || lower.includes("claude-opus")) return 200_000
  if (lower.includes("o1") || lower.includes("o3") || lower.includes("gpt-5") || lower.includes("gpt-4o")) return 128_000
  if (lower.includes("deepseek")) return 64_000
  if (lower.includes("qwen")) return 128_000
  return 128_000
}

/**
 * Find the context limit for a model reference from available models list
 */
export function resolveContextLimit(
  modelRef?: RawModelRef,
  models?: readonly RawModelInfo[],
): number {
  if (!modelRef?.id) return 128_000

  if (models && models.length > 0) {
    const matched = models.find(
      (m) =>
        m.id === modelRef.id &&
        (!modelRef.providerID || m.providerID === modelRef.providerID),
    )
    if (matched?.limit?.context && matched.limit.context > 0) {
      return matched.limit.context
    }
  }

  return getDefaultContextLimit(modelRef.id)
}

/**
 * Compute comprehensive token and context window metrics for a session
 */
export function computeSessionMetrics(options: {
  session?: RawSession
  messages?: readonly RawMessage[]
  models?: readonly RawModelInfo[]
}): SessionTokenMetrics {
  const { session, messages = [], models = [] } = options

  const sessionID = session?.id ?? "unknown"
  const modelRef = session?.model
  const modelId = modelRef?.id ?? "default"
  const providerId = modelRef?.providerID ?? "unknown"

  // Aggregate tokens across messages if not already aggregated on session
  let input = session?.tokens?.input ?? 0
  let output = session?.tokens?.output ?? 0
  let reasoning = session?.tokens?.reasoning ?? 0
  let cacheRead = session?.tokens?.cache?.read ?? 0
  let cacheWrite = session?.tokens?.cache?.write ?? 0
  let sessionCost = session?.cost ?? 0

  let lastSettledAssistantMsg: RawMessage | undefined
  let settledTurnIndex = 0
  let totalAssistantTurns = 0

  const needsAggregation =
    input === 0 && output === 0 && cacheRead === 0 && messages.length > 0

  for (const msg of messages) {
    if (msg.type === "assistant" || msg.type === "compaction") {
      if (msg.type === "assistant") {
        totalAssistantTurns++
        const hasTokens =
          (msg.tokens?.input ?? 0) > 0 ||
          (msg.tokens?.output ?? 0) > 0 ||
          (msg.tokens?.cache?.read ?? 0) > 0 ||
          (msg.tokens?.cache?.write ?? 0) > 0

        if (hasTokens) {
          lastSettledAssistantMsg = msg
          settledTurnIndex = totalAssistantTurns
        }
      }

      if (needsAggregation && msg.tokens) {
        input += msg.tokens.input ?? 0
        output += msg.tokens.output ?? 0
        reasoning += msg.tokens.reasoning ?? 0
        cacheRead += msg.tokens.cache?.read ?? 0
        cacheWrite += msg.tokens.cache?.write ?? 0
      }

      if (sessionCost === 0 && typeof msg.cost === "number") {
        sessionCost += msg.cost
      }
    }
  }

  const totalTokens = input + output + cacheRead + cacheWrite

  const sessionTotal: TokenBreakdown = {
    input,
    output,
    reasoning,
    cacheRead,
    cacheWrite,
    total: totalTokens,
  }

  // Active Context Window calculation:
  // In LLM requests, prompt tokens of the last settled assistant turn (input + cache.read + cache.write)
  // represent the active context window loaded into the model.
  const activeModelRef = lastSettledAssistantMsg?.model ?? modelRef
  const limitTokens = resolveContextLimit(activeModelRef, models)

  let currentContextTokens = 0
  let lastTurn: TurnStats | undefined

  if (lastSettledAssistantMsg?.tokens) {
    const t = lastSettledAssistantMsg.tokens
    const turnIn = t.input ?? 0
    const turnOut = t.output ?? 0
    const turnReasoning = t.reasoning ?? 0
    const turnCacheRead = t.cache?.read ?? 0
    const turnCacheWrite = t.cache?.write ?? 0
    const turnTotal = turnIn + turnOut + turnCacheRead + turnCacheWrite

    // Context loaded = input tokens + cached tokens for that turn
    currentContextTokens = turnIn + turnCacheRead + turnCacheWrite

    lastTurn = {
      turnIndex: settledTurnIndex,
      modelId: lastSettledAssistantMsg.model?.id ?? modelId,
      input: turnIn,
      output: turnOut,
      reasoning: turnReasoning,
      cacheRead: turnCacheRead,
      cacheWrite: turnCacheWrite,
      total: turnTotal,
      cost: lastSettledAssistantMsg.cost ?? 0,
    }
  } else if (session?.tokens) {
    // Fallback to session tokens if no settled message exists yet
    const sessIn = session.tokens.input ?? 0
    const sessCacheRead = session.tokens.cache?.read ?? 0
    const sessCacheWrite = session.tokens.cache?.write ?? 0
    currentContextTokens = sessIn + sessCacheRead + sessCacheWrite
  }

  const usedPercent =
    limitTokens > 0
      ? Math.min(100, (currentContextTokens / limitTokens) * 100)
      : 0

  const remainingTokens = Math.max(0, limitTokens - currentContextTokens)
  const saturation = getSaturationLevel(usedPercent)

  const contextWindow: ContextWindowState = {
    currentTokens: currentContextTokens,
    limitTokens,
    usedPercent,
    remainingTokens,
    saturation,
  }

  // Calculate Cache Hit Rate
  const totalPromptTokens = input + cacheRead
  const cacheHitRate =
    totalPromptTokens > 0 ? (cacheRead / totalPromptTokens) * 100 : 0

  // Calculate estimated Cache Savings ($ USD)
  // Prompt caching generally saves ~90% of input cost.
  let estimatedCacheSavingsUSD = 0
  const matchedModel = models.find(
    (m) =>
      m.id === activeModelRef?.id &&
      (!activeModelRef?.providerID || m.providerID === activeModelRef.providerID),
  )

  const pricing = matchedModel?.cost?.[0]
  if (pricing?.input && pricing?.cache?.read !== undefined) {
    const inputPricePerM = pricing.input
    const cacheReadPricePerM = pricing.cache.read
    const unitSavings = Math.max(0, inputPricePerM - cacheReadPricePerM)
    estimatedCacheSavingsUSD = (cacheRead / 1_000_000) * unitSavings
  } else if (cacheRead > 0) {
    // Default baseline estimate: $2.70 saved per 1M cached tokens (Anthropic / OpenAI standard discount)
    estimatedCacheSavingsUSD = (cacheRead / 1_000_000) * 2.7
  }

  return {
    sessionID,
    modelId: activeModelRef?.id ?? modelId,
    providerId: activeModelRef?.providerID ?? providerId,
    sessionCost,
    contextWindow,
    sessionTotal,
    lastTurn,
    turnCount: settledTurnIndex || totalAssistantTurns,
    cacheHitRate,
    estimatedCacheSavingsUSD,
  }
}
