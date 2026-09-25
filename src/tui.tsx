import { Plugin } from "@opencode/plugin/tui"
import { createMemo } from "solid-js"
import { UsageSidebar } from "./components/UsageSidebar.js"
import { computeSessionMetrics } from "./core.js"
import type { SessionTokenMetrics } from "./types.js"

type PluginContext = Parameters<Parameters<typeof Plugin.define>[0]["setup"]>[0]

function SidebarContainer(props: {
  context: PluginContext
  sessionID?: string
}) {
  const { context } = props
  const theme = context.theme

  const [viewState, setViewState] = context.storage.store("view", {
    initial: { collapsed: false },
  })

  let previousValidMetrics: SessionTokenMetrics | undefined

  const metrics = createMemo<SessionTokenMetrics>(() => {
    const sId = props.sessionID
    const session = sId ? context.data.session.get(sId) : undefined
    const messages = sId ? context.data.session.message.list(sId) ?? [] : []
    const location = context.location ?? context.data.location.default()
    const models = context.data.location.model.list(location) ?? []
    const computed = computeSessionMetrics({ session, messages, models })

    if (
      computed.contextWindow.currentTokens === 0 &&
      previousValidMetrics &&
      previousValidMetrics.sessionID === computed.sessionID &&
      previousValidMetrics.contextWindow.currentTokens > 0
    ) {
      computed.contextWindow = previousValidMetrics.contextWindow
      computed.lastTurn = previousValidMetrics.lastTurn
    }

    if (computed.contextWindow.currentTokens > 0) {
      previousValidMetrics = computed
    }

    return computed
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

const plugin = Plugin.define({
  id: "opencode-v2-token-usage",
  setup(context) {
    // Sidebar slot: Collapsible Token Usage panel
    const unregisterSidebar = context.ui.slot({
      append: "sidebar.content",
      render: ({ sessionID }) => (
        <SidebarContainer context={context} sessionID={sessionID} />
      ),
    })

    return () => {
      unregisterSidebar()
    }
  },
})

export default plugin
