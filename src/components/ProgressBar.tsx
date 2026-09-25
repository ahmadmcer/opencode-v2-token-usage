import { renderProgressBar } from "../calculator.js"
import type { SaturationLevel } from "../types.js"

export interface ProgressBarProps {
  percent: number
  width?: number
  saturation: SaturationLevel
  theme: any
}

export function ProgressBar(props: ProgressBarProps) {
  const fgColor = () => {
    switch (props.saturation) {
      case "critical":
        return props.theme.text.feedback?.error?.base ?? "red"
      case "warning":
        return props.theme.text.feedback?.warning?.base ?? "yellow"
      case "normal":
      default:
        return props.theme.text.feedback?.success?.base ?? props.theme.text.base
    }
  }

  return (
    <text fg={fgColor()}>
      {renderProgressBar(props.percent, props.width ?? 14)}
    </text>
  )
}
