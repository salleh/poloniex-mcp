# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-08-06

### Added

- Public reference-data tools: `get_symbols` (`/markets`, `/markets/{symbol}`),
  `get_currencies` (`/currencies`, `/v2/currencies` via a `v2` flag), and
  `get_timestamp` (`/timestamp`).
- Public market-data tools: `get_price`, `get_mark_price`,
  `get_mark_price_components`, `get_candles` (interval enum, bounded `limit`,
  `startTime`/`endTime`), `get_market_trades`, `get_collateral_info`, and
  `get_borrow_rates_info`.

### Changed

- `get_ticker` now accepts an optional `symbol`: omit it for every symbol
  (`/markets/ticker24h`) or pass one for a single market. Existing single-symbol
  calls are unaffected.

## [0.2.0] - 2026-08-05

### Added

- `get_open_orders` tool (authenticated): fetch active orders via
  `GET /orders`, with optional `symbol`, `side`, `from`, `direction`, and
  `limit` filters.

## [0.1.0] - 2026-08-05

### Added

- TypeScript MCP server built on the official `@modelcontextprotocol/sdk`
  high-level `McpServer` API with stdio transport.
- `get_ticker` tool (public): 24h ticker for a spot symbol.
- `get_orderbook` tool (public): order book depth for a spot symbol.
- `get_balances` tool (authenticated): account balances signed with
  HMAC-SHA256, per the Poloniex REST specification.
- Zod-validated tool inputs and environment configuration.
- `dotenv` support for local development via `.env`.
- Vitest test suite: unit tests (auth signing, HTTP client) plus in-memory MCP
  integration tests, with coverage support.
- Project tooling: strict TypeScript build, Prettier, and npm scripts
  (`build`, `dev`, `start`, `test`, `typecheck`, `format`).

[Unreleased]: https://github.com/salleh/poloniex-mcp/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/salleh/poloniex-mcp/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/salleh/poloniex-mcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/salleh/poloniex-mcp/releases/tag/v0.1.0
