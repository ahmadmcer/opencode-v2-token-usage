import { Show } from "solid-js"
import { formatCost, formatPercent, formatTokens } from "../calculator.js"
import type { SessionTokenMetrics } from "../types.js"
import { ProgressBar } from "./ProgressBar.js"

export interface BreakdownTableProps {
  metrics: SessionTokenMetrics
  theme: any
}

export function BreakdownTable(props: BreakdownTableProps) {
  const { theme } = props
  const cw = () => props.metrics.contextWindow
  const tot = () => props.metrics.sessionTotal
  const last = () => props.metrics.lastTurn

  return (
    <box flexDirection="column" gap={0}>
      {/* Model & Saturation Bar */}
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text.base}>Model</text>
        <text fg={theme.text.muted}>{props.metrics.modelId}</text>
      </box>

      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text.base}>Context Window</text>
        <ProgressBar
          percent={cw().usedPercent}
          saturation={cw().saturation}
          theme={theme}
          width={12}
        />
      </box>

      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text.muted}> Usage</text>
        <text fg={theme.text.muted}>
          {formatTokens(cw().currentTokens)} / {formatTokens(cw().limitTokens)} ({formatPercent(cw().usedPercent)})
        </text>
      </box>

      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text.muted}> Remaining</text>
        <text fg={theme.text.muted}>
          {formatTokens(cw().remainingTokens)} tokens
        </text>
      </box>

      {/* Divider / Section: Session Tokens */}
      <box flexDirection="row" justifyContent="space-between" paddingTop={0}>
        <text fg={theme.text.base}><b>Session Tokens</b></text>
        <text fg={theme.text.base}>{formatTokens(tot().total)}</text>
      </box>

      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text.muted}> Input</text>
        <text fg={theme.text.muted}>{formatTokens(tot().input)}</text>
      </box>

      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text.muted}> Output</text>
        <text fg={theme.text.muted}>{formatTokens(tot().output)}</text>
      </box>

      <Show when={tot().reasoning > 0}>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.text.muted}> Reasoning</text>
          <text fg={theme.text.muted}>{formatTokens(tot().reasoning)}</text>
        </box>
      </Show>

      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text.muted}> Cache Read (hit)</text>
        <text fg={theme.text.muted}>{formatTokens(tot().cacheRead)}</text>
      </box>

      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text.muted}> Cache Write</text>
        <text fg={theme.text.muted}>{formatTokens(tot().cacheWrite)}</text>
      </box>

      <Show when={tot().cacheRead > 0}>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.text.muted}> Cache Hit Rate</text>
          <text fg={theme.text.feedback?.success?.base ?? theme.text.muted}>
            {formatPercent(props.metrics.cacheHitRate)}
          </text>
        </box>
      </Show>

      {/* Cost & Savings */}
      <box flexDirection="row" justifyContent="space-between" paddingTop={0}>
        <text fg={theme.text.base}><b>Estimated Cost</b></text>
        <text fg={theme.text.base}><b>{formatCost(props.metrics.sessionCost)}</b></text>
      </box>

      <Show when={props.metrics.estimatedCacheSavingsUSD > 0}>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.text.muted}> Cache Savings</text>
          <text fg={theme.text.feedback?.success?.base ?? theme.text.muted}>
            ~{formatCost(props.metrics.estimatedCacheSavingsUSD)}
          </text>
        </box>
      </Show>

      {/* Last Turn Breakdown */}
      <Show when={last()}>
        {(lt) => (
          <box flexDirection="column" gap={0} paddingTop={0}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.text.base}><b>Last Turn</b> (#{lt().turnIndex})</text>
              <text fg={theme.text.muted}>{formatCost(lt().cost)}</text>
            </box>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme.text.muted}> Prompt / Out</text>
              <text fg={theme.text.muted}>
                {formatTokens(lt().input)} / {formatTokens(lt().output)}
              </text>
            </box>
          </box>
        )}
      </Show>
    </box>
  )
}
