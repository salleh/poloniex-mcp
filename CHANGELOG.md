# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-08-06

First stable release. Completes read-only coverage of **all 35 Poloniex Spot
REST `GET` endpoints** — public market and reference data, plus authenticated
account, wallets, orders, smart orders, margin, and subaccounts. Every tool's
path and parameters are validated against the official Poloniex Python and Java
SDKs and the REST docs. This server is read-only by design: it never places,
modifies, or cancels orders.

Beyond the `1.0.0` milestone the public API is considered stable and follows
Semantic Versioning; breaking changes will bump the MAJOR version.

## [0.7.1] - 2026-08-06

### Changed

- README now documents all 35 tools, grouped by domain (public market/reference
  and authenticated account/wallets/orders/smart orders/margin/subaccounts) with
  each tool's endpoint, and refreshes the project-structure tree.

## [0.7.0] - 2026-08-06

### Added

- `get_open_orders` now accepts an optional `accountType` filter, matching the
  official SDKs and the existing `get_orders_history` tool.

### Fixed

- `get_wallet_activity` now accepts `adjustments` as an `activityType` (in
  addition to `deposits` and `withdrawals`); all three are documented as valid
  by the official Poloniex Python and Java SDKs. The value was previously
  unreachable.

## [0.6.0] - 2026-08-06

### Added

- Authenticated margin tools: `get_account_margin` (`/margin/accountMargin`),
  `get_borrow_status` (`/margin/borrowStatus`), and `get_max_size`
  (`/margin/maxSize`).
- Authenticated subaccount tools: `get_subaccounts` (`/subaccounts`),
  `get_subaccount_balances` (`/subaccounts/balances`), and
  `get_subaccount_transfer_records` (`/subaccounts/transfer`, with pagination,
  currency, time-window, and from/to account filters).

  This completes read-only coverage of all 35 Poloniex Spot REST GET endpoints.
  Paths and parameters cross-checked against the official Poloniex Java SDK
  (margin path constants and query signatures) and the REST docs.

## [0.5.0] - 2026-08-06

### Added

- Authenticated order tools: `get_order` (`/orders/{id}` or client order id via
  `cid:`), `get_orders_history` (`/orders/history`), `get_order_trades`
  (`/orders/{id}/trades`), `get_trade_history` (`/trades`), and
  `get_kill_switch_status` (`/orders/killSwitchStatus`).
- Authenticated smart-order tools: `get_smart_open_orders` (`/smartorders`),
  `get_smart_order` (`/smartorders/{id}` or `cid:`), and
  `get_smart_orders_history` (`/smartorders/history`).

  Paths and parameters cross-checked against the official Poloniex Python and
  Java SDKs (`cid:` lookup and the canonical `/trades` path).

## [0.4.0] - 2026-08-06

### Added

- Authenticated account tools: `get_account_info` (`/accounts`),
  `get_account_activity` (`/accounts/activity`, with `activityType`, `currency`,
  time-window, and pagination filters), `get_fee_info` (`/feeinfo`),
  `get_interest_history` (`/accounts/interest/history`), and
  `get_transfer_records` (`/accounts/transfer`).
- Authenticated wallet tools: `get_deposit_addresses` (`/wallets/addresses`)
  and `get_wallet_activity` (`/wallets/activity`, with required `start`/`end`
  window and optional deposits/withdrawals filter).

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

[Unreleased]: https://github.com/salleh/poloniex-mcp/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/salleh/poloniex-mcp/compare/v0.7.1...v1.0.0
[0.7.1]: https://github.com/salleh/poloniex-mcp/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/salleh/poloniex-mcp/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/salleh/poloniex-mcp/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/salleh/poloniex-mcp/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/salleh/poloniex-mcp/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/salleh/poloniex-mcp/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/salleh/poloniex-mcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/salleh/poloniex-mcp/releases/tag/v0.1.0
