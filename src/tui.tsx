import { Plugin } from "@opencode/plugin/tui"
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js"
import { formatCost, formatPercent, formatTokens } from "./calculator.js"
import { BreakdownTable } from "./components/BreakdownTable.js"
import { UsageSidebar } from "./components/UsageSidebar.js"
import { computeSessionMetrics } from "./core.js"
import type { SessionTokenMetrics } from "./types.js"

type PluginContext = Parameters<Parameters<typeof Plugin.define>[0]["setup"]>[0]

function buildTextSummary(metrics: SessionTokenMetrics): string {
  const cw = metrics.contextWindow
  const tot = metrics.sessionTotal
  const lines = [
    `Token Usage & Context Analytics (${metrics.modelId})`,
    `═════════════════════════════════════════════`,
    `Context Window : ${formatTokens(cw.currentTokens)} / ${formatTokens(cw.limitTokens)} (${formatPercent(cw.usedPercent)})`,
    `Remaining      : ${formatTokens(cw.remainingTokens)} tokens`,
    `Status         : ${cw.saturation.toUpperCase()}`,
    ``,
    `Session Tokens : ${formatTokens(tot.total)}`,
    `  • Input      : ${formatTokens(tot.input)}`,
    `  • Output     : ${formatTokens(tot.output)}`,
  ]

  if (tot.reasoning > 0) {
    lines.push(`  • Reasoning  : ${formatTokens(tot.reasoning)}`)
  }

  lines.push(
    `  • Cache Read : ${formatTokens(tot.cacheRead)}`,
    `  • Cache Write: ${formatTokens(tot.cacheWrite)}`,
    `Cache Hit Rate : ${formatPercent(metrics.cacheHitRate)}`,
    ``,
    `Estimated Cost : ${formatCost(metrics.sessionCost)}`,
  )

  if (metrics.estimatedCacheSavingsUSD > 0) {
    lines.push(`Cache Savings  : ~${formatCost(metrics.estimatedCacheSavingsUSD)}`)
  }

  return lines.join("\n")
}

function SidebarContainer(props: {
  context: PluginContext
  sessionID?: string
}) {
  const { context } = props
  const theme = context.theme

  const [viewState, setViewState] = context.storage.store("view", {
    initial: { collapsed: false },
  })

  const metrics = createMemo<SessionTokenMetrics>(() => {
    const sId = props.sessionID
    const session = sId ? context.data.session.get(sId) : undefined
    const messages = sId ? context.data.session.message.list(sId) ?? [] : []
    const location = context.location ?? context.data.location.default()
    const models = context.data.location.model.list(location) ?? []
    return computeSessionMetrics({ session, messages, models })
  })

  function toggleCollapse() {
    setViewState((draft: { collapsed: boolean }) => {
      draft.collapsed = !draft.collapsed
    }).catch((err: unknown) => {
      console.error("Failed to persist collapse state", err)
    })
  }

  return (
    <UsageSidebar
      metrics={metrics()}
      collapsed={Boolean(viewState.collapsed)}
      onToggle={toggleCollapse}
      theme={theme}
    />
  )
}

function SessionDetailPanel(props: {
  panel: any
  context: PluginContext
}) {
  const { context, panel } = props
  const theme = context.theme

  const metrics = createMemo<SessionTokenMetrics>(() => {
    const sId = panel.sessionID
    const session = sId ? context.data.session.get(sId) : undefined
    const messages = sId ? context.data.session.message.list(sId) ?? [] : []
    const location = context.location ?? context.data.location.default()
    const models = context.data.location.model.list(location) ?? []
    return computeSessionMetrics({ session, messages, models })
  })

  return (
    <box flexDirection="column" gap={1} paddingLeft={2} paddingRight={2} paddingTop={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text.base}>
          <b>Token Usage & Context Analytics</b>
        </text>
        <text fg={theme.text.muted}>Press Esc to close</text>
      </box>
      <BreakdownTable metrics={metrics()} theme={theme} />
    </box>
  )
}

const plugin = Plugin.define({
  id: "opencode-v2-token-usage",
  setup(context) {
    // 1. Sidebar slot: Collapsible Token Usage panel
    const unregisterSidebar = context.ui.slot({
      append: "sidebar.content",
      render: ({ sessionID }) => (
        <SidebarContainer context={context} sessionID={sessionID} />
      ),
    })

    // 2. Session panel slot: Full detailed panel
    const unregisterPanel = context.ui.slot({
      append: "session.panel",
      render: (panel) => (
        <Show when={panel.name === "token-usage.panel"}>
          <SessionDetailPanel panel={panel} context={context} />
        </Show>
      ),
    })

    // 5. Slash commands (/tokens, /usage) & Palette command
    const unregisterKeymap = context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          priority: 10,
          commands: [
            {
              id: "token-usage.show",
              title: "Token Usage: Show Breakdown",
              group: "Token Usage",
              palette: true,
              slash: { name: "tokens", aliases: ["usage", "token-usage"] },
              enabled: () => true,
              suggested: true,
              run: async () => {
                const opened = context.ui.panel.open("token-usage.panel")
                if (!opened) {
                  const location = context.location ?? context.data.location.default()
                  const models = context.data.location.model.list(location) ?? []
                  // Try to find the focused/current session
                  const sessions = context.data.session.list()
                  const currentSession = sessions[0]
                  const messages = currentSession?.id
                    ? context.data.session.message.list(currentSession.id) ?? []
                    : []
                  const metrics = computeSessionMetrics({
                    session: currentSession,
                    messages,
                    models,
                  })

                  await context.ui.dialog.alert({
                    title: "Token Usage Summary",
                    message: buildTextSummary(metrics),
                  })
                }
              },
            },
          ],
        }))
        return null
      },
    })

    return () => {
      unregisterSidebar()
      unregisterPanel()
      unregisterKeymap()
    }
  },
})

export default plugin
