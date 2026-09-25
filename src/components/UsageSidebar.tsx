import { Show } from "solid-js"
import { formatCost, formatPercent, formatTokens } from "../calculator.js"
import type { SessionTokenMetrics } from "../types.js"
import { BreakdownTable } from "./BreakdownTable.js"

export interface UsageSidebarProps {
  metrics: SessionTokenMetrics
  collapsed: boolean
  onToggle: () => void
  theme: any
}

export function UsageSidebar(props: UsageSidebarProps) {
  const { theme } = props
  const cw = () => props.metrics.contextWindow

  function summaryText(): string {
    const cur = formatTokens(cw().currentTokens)
    const lim = formatTokens(cw().limitTokens)
    const pct = formatPercent(cw().usedPercent)
    const cost = formatCost(props.metrics.sessionCost)
    return `(${cur}/${lim} • ${pct} • ${cost})`
  }

  return (
    <box flexDirection="column" gap={0}>
      {/* Header Row */}
      <box
        flexDirection="row"
        gap={1}
        onMouseUp={props.onToggle}
      >
        <text fg={theme.text.base}>{props.collapsed ? "▶" : "▼"}</text>
        <text fg={theme.text.base}>
          <b>Token Usage</b>
        </text>
        <Show when={props.collapsed}>
          <text fg={theme.text.muted}>
            <span style={{ fg: theme.text.muted }}>{` ${summaryText()}`}</span>
          </text>
        </Show>
      </box>

      {/* Expanded Details */}
      <Show when={!props.collapsed}>
        <box flexDirection="column" gap={0} paddingLeft={2} paddingTop={0}>
          <BreakdownTable metrics={props.metrics} theme={theme} />
        </box>
      </Show>
    </box>
  )
}
