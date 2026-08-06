## poloniex-mcp v1.0.0

First **stable** release of **poloniex-mcp** — a local [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the Poloniex spot exchange to any MCP client (Claude Desktop, etc.) over stdio.

### ✨ Highlights

- **Complete read-only coverage — all 35 Poloniex Spot REST `GET` endpoints** as MCP tools, across 8 domains:
  - **Public — market data (9):** `get_ticker`, `get_orderbook`, `get_price`, `get_mark_price`, `get_mark_price_components`, `get_candles`, `get_market_trades`, `get_collateral_info`, `get_borrow_rates_info`.
  - **Public — reference (3):** `get_symbols`, `get_currencies`, `get_timestamp`.
  - **Account (6):** `get_balances`, `get_account_info`, `get_account_activity`, `get_fee_info`, `get_interest_history`, `get_transfer_records`.
  - **Wallets (2):** `get_deposit_addresses`, `get_wallet_activity`.
  - **Orders (6):** `get_open_orders`, `get_order`, `get_orders_history`, `get_order_trades`, `get_trade_history`, `get_kill_switch_status`.
  - **Smart orders (3):** `get_smart_open_orders`, `get_smart_order`, `get_smart_orders_history`.
  - **Margin (3):** `get_account_margin`, `get_borrow_status`, `get_max_size`.
  - **Subaccounts (3):** `get_subaccounts`, `get_subaccount_balances`, `get_subaccount_transfer_records`.
- **Read-only by design** — this server never places, modifies, or cancels orders; a read-only API key is recommended.
- **Validated against the official SDKs** — every tool's path and parameters cross-checked against the official Poloniex [Python](https://github.com/poloniex/polo-sdk-python) and [Java](https://github.com/poloniex/polo-sdk-java) SDKs and the REST docs.
- **TypeScript, built on the official SDK** — uses the high-level `McpServer` API with **Zod**-validated tool inputs. Symbols are normalized (`btc_usdt` → `BTC_USDT`).
- **Robust error handling** — network failures, a configurable request timeout, non-JSON responses, and missing credentials all surface as clean tool errors instead of crashing the transport.
- **Configurable & documented** — Zod-validated environment config with `dotenv` support and a `.env.example`.
- **Stable API** — beyond `1.0.0` the public API follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html); breaking changes will bump the MAJOR version.

### 📦 Install

```bash
git clone git@github.com:salleh/poloniex-mcp.git
cd poloniex-mcp
npm install
npm run build
```

### 🔌 Use with Claude Desktop

Add to `claude_desktop_config.json`, then restart Claude Desktop:

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

The `env` block is optional — omit it to use only the public tools. A read-only API key is recommended since this server never places trades.

### 🔐 Credentials & signing

Authenticated requests are signed with **HMAC-SHA256** (base64) per the Poloniex `api.poloniex.com` REST spec, via the `key` / `signature` / `signTimestamp` headers. Set `POLONIEX_API_KEY` and `POLONIEX_API_SECRET` in your MCP client's `env` block or a git-ignored `.env`.

### ✅ Quality

- Vitest suite: unit tests (signing + HTTP client) and in-memory MCP integration tests.
- Strict TypeScript build, Prettier formatting, and coverage support.

### 📋 Requirements

- Node.js **24+**

**Full changelog:** [CHANGELOG.md](https://github.com/salleh/poloniex-mcp/blob/v1.0.0/CHANGELOG.md)
