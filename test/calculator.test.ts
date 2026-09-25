import { describe, expect, it } from "bun:test"
import {
  formatCost,
  formatPercent,
  formatTokens,
  getSaturationIcon,
  getSaturationLevel,
  renderProgressBar,
} from "../src/calculator.js"
import {
  computeSessionMetrics,
  getDefaultContextLimit,
  resolveContextLimit,
} from "../src/core.js"

describe("calculator formatting", () => {
  it("formats token counts properly", () => {
    expect(formatTokens(0)).toBe("0")
    expect(formatTokens(-5)).toBe("0")
    expect(formatTokens(NaN)).toBe("0")
    expect(formatTokens(450)).toBe("450")
    expect(formatTokens(999)).toBe("999")
    expect(formatTokens(1_000)).toBe("1k")
    expect(formatTokens(14_500)).toBe("14.5k")
    expect(formatTokens(200_000)).toBe("200k")
    expect(formatTokens(1_000_000)).toBe("1M")
    expect(formatTokens(1_250_000)).toBe("1.25M")
  })

  it("formats cost properly", () => {
    expect(formatCost(0)).toBe("$0.00")
    expect(formatCost(-1)).toBe("$0.00")
    expect(formatCost(0.00005)).toBe("<$0.0001")
    expect(formatCost(0.0042)).toBe("$0.0042")
    expect(formatCost(0.045)).toBe("$0.045")
    expect(formatCost(1.2)).toBe("$1.20")
    expect(formatCost(12.345)).toBe("$12.35")
  })

  it("formats percentages correctly", () => {
    expect(formatPercent(0)).toBe("0%")
    expect(formatPercent(-5)).toBe("0%")
    expect(formatPercent(7.34)).toBe("7.34%")
    expect(formatPercent(25.62)).toBe("25.6%")
    expect(formatPercent(100)).toBe("100%")
    expect(formatPercent(105)).toBe("100%")
  })

  it("determines saturation level accurately", () => {
    expect(getSaturationLevel(0)).toBe("normal")
    expect(getSaturationLevel(59.9)).toBe("normal")
    expect(getSaturationLevel(60)).toBe("warning")
    expect(getSaturationLevel(79.9)).toBe("warning")
    expect(getSaturationLevel(80)).toBe("critical")
    expect(getSaturationLevel(95)).toBe("critical")

    expect(getSaturationIcon("normal")).toBe("🟢")
    expect(getSaturationIcon("warning")).toBe("🟡")
    expect(getSaturationIcon("critical")).toBe("🔴")
  })

  it("renders progress bar gauge accurately", () => {
    expect(renderProgressBar(0, 10)).toBe("[░░░░░░░░░░]")
    expect(renderProgressBar(50, 10)).toBe("[█████░░░░░]")
    expect(renderProgressBar(100, 10)).toBe("[██████████]")
    expect(renderProgressBar(20, 10)).toBe("[██░░░░░░░░]")
  })
})

describe("core metrics computation", () => {
  it("resolves context limit for known models", () => {
    expect(getDefaultContextLimit("claude-3-7-sonnet")).toBe(200_000)
    expect(getDefaultContextLimit("gemini-2.5-pro")).toBe(1_000_000)
    expect(getDefaultContextLimit("gpt-4o")).toBe(128_000)
    expect(getDefaultContextLimit("deepseek-chat")).toBe(64_000)

    const models = [
      {
        id: "custom-model",
        providerID: "test",
        limit: { context: 500_000, output: 8_000 },
      },
    ]

    expect(
      resolveContextLimit({ id: "custom-model", providerID: "test" }, models),
    ).toBe(500_000)
  })

  it("computes empty session metrics safely", () => {
    const metrics = computeSessionMetrics({})
    expect(metrics.sessionCost).toBe(0)
    expect(metrics.contextWindow.currentTokens).toBe(0)
    expect(metrics.contextWindow.usedPercent).toBe(0)
    expect(metrics.contextWindow.saturation).toBe("normal")
    expect(metrics.sessionTotal.total).toBe(0)
    expect(metrics.cacheHitRate).toBe(0)
  })

  it("computes full session metrics with turns and prompt caching", () => {
    const session = {
      id: "ses_12345",
      cost: 0.045,
      model: { providerID: "anthropic", id: "claude-3-7-sonnet" },
      tokens: {
        input: 10_000,
        output: 2_000,
        reasoning: 500,
        cache: {
          read: 40_000,
          write: 5_000,
        },
      },
    }

    const messages = [
      {
        type: "assistant",
        tokens: {
          input: 8_000,
          output: 1_200,
          reasoning: 500,
          cache: { read: 35_000, write: 5_000 },
        },
        cost: 0.03,
        model: { providerID: "anthropic", id: "claude-3-7-sonnet" },
      },
    ]

    const models = [
      {
        id: "claude-3-7-sonnet",
        providerID: "anthropic",
        limit: { context: 200_000, output: 8_192 },
        cost: [{ input: 3.0, output: 15.0, cache: { read: 0.3, write: 3.75 } }],
      },
    ]

    const metrics = computeSessionMetrics({ session, messages, models })

    expect(metrics.sessionID).toBe("ses_12345")
    expect(metrics.modelId).toBe("claude-3-7-sonnet")
    expect(metrics.sessionCost).toBe(0.045)

    // Context window for latest turn: 8k + 35k read + 5k write = 48,000 tokens
    expect(metrics.contextWindow.currentTokens).toBe(48_000)
    expect(metrics.contextWindow.limitTokens).toBe(200_000)
    // 48,000 / 200,000 = 24%
    expect(metrics.contextWindow.usedPercent).toBe(24)
    expect(metrics.contextWindow.saturation).toBe("normal")
    expect(metrics.contextWindow.remainingTokens).toBe(152_000)

    // Total tokens: 10k in + 2k out + 40k cacheRead + 5k cacheWrite = 57,000
    expect(metrics.sessionTotal.total).toBe(57_000)
    expect(metrics.sessionTotal.reasoning).toBe(500)

    // Cache hit rate: 40k read / (10k in + 40k read) = 80%
    expect(metrics.cacheHitRate).toBe(80)

    // Estimated cache savings: 40k tokens saved with (3.0 - 0.3) = $2.70/1M => 40k * 2.7 / 1M = $0.108
    expect(metrics.estimatedCacheSavingsUSD).toBeCloseTo(0.108, 3)

    // Last turn
    expect(metrics.lastTurn).toBeDefined()
    expect(metrics.lastTurn?.turnIndex).toBe(1)
    expect(metrics.lastTurn?.input).toBe(8_000)
    expect(metrics.lastTurn?.output).toBe(1_200)
    expect(metrics.lastTurn?.reasoning).toBe(500)
  })
})
