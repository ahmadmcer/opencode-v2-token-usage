import { formatCost, formatPercent, formatTokens } from "../calculator.js"
import type { SessionTokenMetrics } from "../types.js"

export interface StatusBadgeProps {
  metrics: SessionTokenMetrics
  theme: any
  onClick?: () => void
}

export function StatusBadge(props: StatusBadgeProps) {
  const { theme } = props
  const cw = () => props.metrics.contextWindow
  const cost = () => props.metrics.sessionCost

  const saturationColor = () => {
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
    <box
      flexDirection="row"
      gap={1}
      onMouseUp={props.onClick}
    >
      <text fg={saturationColor()}>
        ⚡ {formatTokens(cw().currentTokens)}/{formatTokens(cw().limitTokens)} ({formatPercent(cw().usedPercent)})
      </text>
      <text fg={theme.text.muted}>•</text>
      <text fg={theme.text.base}>
        {formatCost(cost())}
      </text>
    </box>
  )
}
