# poloniex-mcp

A local [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that
exposes the [Poloniex](https://poloniex.com) spot exchange to any MCP client
(e.g. Claude Desktop). Built in **TypeScript** on the official
`@modelcontextprotocol/sdk` high-level `McpServer` API, communicating over
**stdio**.

## Tools

All **35** tools are read-only (`GET` endpoints) — this server never places,
modifies, or cancels orders. Paths and parameters are validated against the
official Poloniex [Python](https://github.com/poloniex/polo-sdk-python) and
[Java](https://github.com/poloniex/polo-sdk-java) SDKs and the REST docs.

Public tools need no credentials; authenticated tools require a Poloniex API key
and secret (see [Credentials](#credentials)).

### Public — market data

| Tool                        | Endpoint                                | Description                                                |
| --------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| `get_ticker`                | `/markets/{symbol}/ticker24h`           | 24h ticker (last, high, low, volume). Omit symbol for all. |
| `get_orderbook`             | `/markets/{symbol}/orderBook`           | Order book depth (bids/asks); `limit`, `scale`.            |
| `get_price`                 | `/markets/{symbol}/price`               | Latest trade price. Omit symbol for all.                   |
| `get_mark_price`            | `/markets/{symbol}/markPrice`           | Current mark price. Omit symbol for all.                   |
| `get_mark_price_components` | `/markets/{symbol}/markPriceComponents` | Components used to derive a symbol's mark price.           |
| `get_candles`               | `/markets/{symbol}/candles`             | OHLC candles; `interval` (required), `limit`, time window. |
| `get_market_trades`         | `/markets/{symbol}/trades`              | Recent public trades; `limit`.                             |
| `get_collateral_info`       | `/markets/{currency}/collateralInfo`    | Margin collateral info. Omit currency for all.             |
| `get_borrow_rates_info`     | `/markets/borrowRatesInfo`              | Borrow rates for all tiers and currencies.                 |

### Public — reference data

| Tool             | Endpoint            | Description                                                             |
| ---------------- | ------------------- | ----------------------------------------------------------------------- |
| `get_symbols`    | `/markets/{symbol}` | Trading symbols and trade-limit info. Omit symbol for all.              |
| `get_currencies` | `/currencies`       | Supported currencies and networks; `v2`, `includeMultiChainCurrencies`. |
| `get_timestamp`  | `/timestamp`        | Current Poloniex server time.                                           |

### Authenticated — account

| Tool                   | Endpoint                     | Description                                             |
| ---------------------- | ---------------------------- | ------------------------------------------------------- |
| `get_balances`         | `/accounts/balances`         | Account balances; `accountType`.                        |
| `get_account_info`     | `/accounts`                  | Ids, types, and state for all of the caller's accounts. |
| `get_account_activity` | `/accounts/activity`         | Airdrops, rebates, staking, adjustments; rich filters.  |
| `get_fee_info`         | `/feeinfo`                   | Trading fee rates and related fee info.                 |
| `get_interest_history` | `/accounts/interest/history` | Margin/lending interest history.                        |
| `get_transfer_records` | `/accounts/transfer`         | Transfers between the caller's accounts.                |

### Authenticated — wallets

| Tool                    | Endpoint             | Description                                                     |
| ----------------------- | -------------------- | --------------------------------------------------------------- |
| `get_deposit_addresses` | `/wallets/addresses` | Deposit addresses. Omit currency for all.                       |
| `get_wallet_activity`   | `/wallets/activity`  | Deposit/withdrawal/adjustment activity; `start`+`end` required. |

### Authenticated — orders

| Tool                     | Endpoint                   | Description                                              |
| ------------------------ | -------------------------- | -------------------------------------------------------- |
| `get_open_orders`        | `/orders`                  | Active (open) orders, with optional filters.             |
| `get_order`              | `/orders/{id}`             | A single order by order id or client order id (`cid:`).  |
| `get_orders_history`     | `/orders/history`          | Historical (closed/canceled) orders, with filters.       |
| `get_order_trades`       | `/orders/{id}/trades`      | Trades that filled a specific order (order id only).     |
| `get_trade_history`      | `/trades`                  | Account trade history across orders; `symbols`, filters. |
| `get_kill_switch_status` | `/orders/killSwitchStatus` | Current status of the account's order kill switch.       |

### Authenticated — smart orders

| Tool                       | Endpoint               | Description                                                 |
| -------------------------- | ---------------------- | ----------------------------------------------------------- |
| `get_smart_open_orders`    | `/smartorders`         | Active (pending) smart orders (stop / stop-limit).          |
| `get_smart_order`          | `/smartorders/{id}`    | A single smart order by order id or client order id.        |
| `get_smart_orders_history` | `/smartorders/history` | Historical (triggered/canceled) smart orders, with filters. |

### Authenticated — margin

| Tool                 | Endpoint                | Description                                             |
| -------------------- | ----------------------- | ------------------------------------------------------- |
| `get_account_margin` | `/margin/accountMargin` | Margin info (equity, margin balance, available margin). |
| `get_borrow_status`  | `/margin/borrowStatus`  | Borrow status per currency. Omit currency for all.      |
| `get_max_size`       | `/margin/maxSize`       | Max/available buy/sell size for a `symbol`.             |

### Authenticated — subaccounts

| Tool                              | Endpoint                | Description                                                 |
| --------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `get_subaccounts`                 | `/subaccounts`          | Accounts within the caller's account group.                 |
| `get_subaccount_balances`         | `/subaccounts/balances` | Balances by currency and account type per account.          |
| `get_subaccount_transfer_records` | `/subaccounts/transfer` | Transfer records among accounts in the group, with filters. |

Symbols use Poloniex format, e.g. `BTC_USDT` (input is normalized, so
`btc_usdt` also works). Subaccount and primary-only endpoints require the
appropriate account permissions on your API key.

## Requirements

- **Node.js 24+** (uses global `fetch`, `AbortSignal.timeout`, and `node:crypto`).

## Project structure

```
src/
  index.ts            # entry point: loads config, starts stdio transport
  server.ts           # builds the McpServer and registers tools
  config.ts           # env configuration, validated with Zod
  tools/
    index.ts          # registerTools(): wires per-domain tool groups
    shared.ts         # shared helpers (result wrapping, normalization, query builders)
    market.ts         # public market-data tools
    reference.ts      # public reference-data tools (symbols, currencies, timestamp)
    account.ts        # authenticated account tools
    wallets.ts        # authenticated wallet read tools
    orders.ts         # authenticated order read tools
    smartorders.ts    # authenticated smart-order read tools
    margin.ts         # authenticated margin read tools
    subaccounts.ts    # authenticated subaccount read tools
  poloniex/
    client.ts         # typed HTTP client (timeout + error handling)
    auth.ts           # HMAC-SHA256 request signing
test/
  unit.test.ts        # auth signing + HTTP client unit tests
  server.test.ts      # in-memory MCP integration tests
  market.test.ts      # public market/reference tool tests
  account.test.ts     # account & wallet tool tests
  orders.test.ts      # order & smart-order tool tests
  margin.test.ts      # margin & subaccount tool tests
```

## Install & build

```bash
npm install
npm run build
```

## Scripts

| Script                  | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `npm run build`         | Compile TypeScript to `dist/`.             |
| `npm start`             | Run the compiled server (`dist/index.js`). |
| `npm run dev`           | Run the server from source via `tsx`.      |
| `npm test`              | Run the Vitest suite.                      |
| `npm run test:coverage` | Run tests with a coverage report.          |
| `npm run typecheck`     | Type-check without emitting.               |
| `npm run format`        | Format the codebase with Prettier.         |

## Credentials

The public market- and reference-data tools need no credentials. For the
authenticated tools (account, wallets, orders, smart orders, margin, and
subaccounts), set your Poloniex API key and secret:

- `POLONIEX_API_KEY`
- `POLONIEX_API_SECRET`

Optional overrides: `POLONIEX_BASE_URL` (default `https://api.poloniex.com`),
`POLONIEX_TIMEOUT_MS` (default `10000`). Copy `.env.example` to `.env` for local
development.

Requests are signed with **HMAC-SHA256** (base64), per the Poloniex
`api.poloniex.com` REST specification, using the `key` / `signature` /
`signTimestamp` headers.

> **Security:** never commit your API key/secret. Keep them in the MCP client's
> `env` block (below) or a git-ignored `.env`. A read-only API key is
> recommended since this server never places trades.

## Use with Claude Desktop

Build first (`npm run build`), then add the following to
`claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`) and
restart Claude Desktop:

```json
{
  "mcpServers": {
    "poloniex": {
      "command": "node",
      "args": ["/absolute/path/to/poloniex-mcp/dist/index.js"],
      "env": {
        "POLONIEX_API_KEY": "your-api-key-here",
        "POLONIEX_API_SECRET": "your-api-secret-here"
      }
    }
  }
}
```

Omit the `env` block if you only want the public tools.

## Versioning

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(`MAJOR.MINOR.PATCH`), starting at **0.1.0**. While on `0.x`, the API is
considered unstable and minor versions may include breaking changes.

- **PATCH** — backwards-compatible bug fixes.
- **MINOR** — backwards-compatible functionality (e.g. a new tool).
- **MAJOR** — incompatible changes (reserved for `1.0.0` and beyond).

Record every change in [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]`, then on
release bump the version with `npm version <patch|minor|major>` (which updates
`package.json` and creates a `vX.Y.Z` git tag) and move the notes under the new
version heading.

## License

[MIT](LICENSE) © Sallehuddin Abdul Latif
