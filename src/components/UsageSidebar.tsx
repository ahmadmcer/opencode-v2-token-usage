import { Show } from "solid-js"
import { formatCost } from "../calculator.js"
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
    const pct = cw().usedPercent
    const pctStr =
      pct >= 10 ? `${Math.round(pct)}%` : pct > 0 ? `${pct.toFixed(1)}%` : "0%"
    const cost = formatCost(props.metrics.sessionCost)
    return `(${pctStr} • ${cost})`
  }

  const summaryColor = () => {
    switch (cw().saturation) {
      case "critical":
        return theme.text.feedback?.error?.base ?? "red"
      case "warning":
        return theme.text.feedback?.warning?.base ?? "yellow"
      case "normal":
      default:
        return theme.text.muted
    }
  }

  return (
    <box flexDirection="column" gap={0}>
      {/* Header Row */}
      <box
        flexDirection="row"
        onMouseUp={props.onToggle}
      >
        <text fg={theme.text.base}>
          {props.collapsed ? "▶ " : "▼ "}
          <b>Token Usage</b>
        </text>
        <Show when={props.collapsed}>
          <text fg={summaryColor()}>
            {` ${summaryText()}`}
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
