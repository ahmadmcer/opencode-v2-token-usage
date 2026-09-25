import { Plugin } from "@opencode/plugin"
import { computeSessionMetrics } from "./core.js"
import { formatCost, formatPercent, formatTokens } from "./calculator.js"

export interface PluginDefinition {
  id: string
  setup: (context: any) => Promise<void> | void
}

export const plugin = Plugin.define({
  id: "opencode-v2-token-usage",
  async setup(ctx: any) {
    // 1. Register tool 'token_usage' for agents and code-mode scripts
    if (ctx.tool?.transform) {
      await ctx.tool.transform((editor: any) => {
        editor.add({
          name: "token_usage",
          description: "Get real-time token usage, context window saturation, and cost metrics for an OpenCode session",
          input: {
            type: "object",
            properties: {
              sessionID: {
                type: "string",
                description: "Session ID to inspect. If omitted, uses the current session.",
              },
            },
            additionalProperties: false,
          },
          options: { codemode: true },
          execute: async (input: { sessionID?: string }) => {
            const sessionID = input?.sessionID
            let session: any
            let messages: any[] = []
            let models: any[] = []

            try {
              if (sessionID && ctx.session?.get) {
                session = await ctx.session.get({ sessionID })
              }
              if (sessionID && ctx.session?.context) {
                messages = (await ctx.session.context({ sessionID })) as any[]
              }
              if (ctx.model?.list) {
                models = (await ctx.model.list()) as any[]
              }
            } catch (err) {
              // Ignore fetch errors and fallback to empty
            }

            const metrics = computeSessionMetrics({ session, messages, models })
            const cw = metrics.contextWindow
            const tot = metrics.sessionTotal

            return {
              content: [
                `Model: ${metrics.modelId}`,
                `Context Window: ${formatTokens(cw.currentTokens)} / ${formatTokens(cw.limitTokens)} (${formatPercent(cw.usedPercent)})`,
                `Remaining Context: ${formatTokens(cw.remainingTokens)} tokens`,
                `Context Status: ${cw.saturation}`,
                `Total Session Tokens: ${formatTokens(tot.total)} (Input: ${formatTokens(tot.input)}, Output: ${formatTokens(tot.output)}, Reasoning: ${formatTokens(tot.reasoning)}, Cache Read: ${formatTokens(tot.cacheRead)}, Cache Write: ${formatTokens(tot.cacheWrite)})`,
                `Cache Hit Rate: ${formatPercent(metrics.cacheHitRate)}`,
                `Estimated Cost: ${formatCost(metrics.sessionCost)}`,
              ].join("\n"),
              metrics,
            }
          },
        })
      })
    }

    // 2. Register slash command 'usage' and 'tokens' in chat session
    if (ctx.command?.transform) {
      await ctx.command.transform((editor: any) => {
        editor.add({
          name: "tokens",
          description: "Display token usage and context window status for the current session",
          execute: async ({ sessionID }: { sessionID: string }) => {
            try {
              const session = await ctx.session.get({ sessionID })
              const messages = (await ctx.session.context({ sessionID })) as any[]
              const models = (await ctx.model.list()) as any[]
              const metrics = computeSessionMetrics({ session, messages, models })
              const cw = metrics.contextWindow
              const tot = metrics.sessionTotal

              const summary = [
                `**Token Usage Summary (${metrics.modelId})**`,
                `- **Context Window**: ${formatTokens(cw.currentTokens)} / ${formatTokens(cw.limitTokens)} (${formatPercent(cw.usedPercent)})`,
                `- **Remaining**: ${formatTokens(cw.remainingTokens)} tokens [${cw.saturation.toUpperCase()}]`,
                `- **Session Total**: ${formatTokens(tot.total)} tokens`,
                `  - Input: ${formatTokens(tot.input)} | Output: ${formatTokens(tot.output)}${tot.reasoning > 0 ? ` | Reasoning: ${formatTokens(tot.reasoning)}` : ""}`,
                `  - Cache Read: ${formatTokens(tot.cacheRead)} | Cache Write: ${formatTokens(tot.cacheWrite)}`,
                `- **Cache Hit Rate**: ${formatPercent(metrics.cacheHitRate)}`,
                `- **Estimated Cost**: ${formatCost(metrics.sessionCost)}`,
                metrics.estimatedCacheSavingsUSD > 0
                  ? `- **Estimated Cache Savings**: ~${formatCost(metrics.estimatedCacheSavingsUSD)}`
                  : null,
              ]
                .filter(Boolean)
                .join("\n")

              if (ctx.session?.synthetic) {
                await ctx.session.synthetic({ sessionID, text: summary })
              }
            } catch (err: any) {
              console.error("Failed to run tokens command:", err)
            }
          },
        })
      })
    }
  },
})

export default plugin
