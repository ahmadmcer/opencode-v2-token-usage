# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-09-28

### Fixed
- **Flickering while agent is generating**: Prevented context tokens from zeroing out and `Last Turn` from disappearing during active agent turns by filtering for settled assistant turns and maintaining sticky UI state.
- **Collapsed sidebar wrapping & spacing**: Fixed text wrapping on narrow sidebars by streamlining the collapsed header string (`▶ Token Usage (12% • $1.05)`) and ensuring proper whitespace after the arrow.

### Changed
- **Streamlined interface**: Removed the `Token Usage: Show Breakdown` command from the `Ctrl+P` command palette and suggested commands to keep the palette clean and non-intrusive.
- **Removed redundant footer badge**: Dropped the prompt/home footer status slot contributions to avoid duplicating OpenCode's built-in footer counters.

---

## [1.0.0] - 2026-09-25

### Added
- **Initial release** bringing Kilo Code / Kilo CLI Token Usage analytics to OpenCode V2.
- **Context window saturation meter**: Real-time context size vs. model limit with Unicode gauge bar (`[████░░░░░░░░] 24%`) and color-coded threshold alerts (normal, warning, critical).
- **Token consumption breakdown**: Granular tracking for input, output, reasoning tokens, cache reads (hits), cache writes, and cache hit rate percentage.
- **Cost & savings tracking**: Accurate session USD cost and estimated dollar savings from prompt cache hits.
- **Collapsible sidebar widget (`sidebar.content`)**: Interactive panel with persistent collapse state across sessions and reloads.
- **Agent tool (`token_usage`)**: Programmatic tool for agents to query token budget and context saturation in Code Mode or subagent workflows.
- **Chat slash command (`/tokens`)**: Instant token usage summary within session conversations.
