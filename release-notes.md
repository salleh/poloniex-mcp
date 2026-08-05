## poloniex-mcp v0.1.0

First release of **poloniex-mcp** — a local [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the Poloniex spot exchange to any MCP client (Claude Desktop, etc.) over stdio.

### ✨ Highlights

- **Three tools** for Poloniex spot markets:
  - `get_ticker` _(public)_ — 24h ticker (price, high, low, volume) for a symbol.
  - `get_orderbook` _(public)_ — order book depth (bids/asks) for a symbol.
  - `get_balances` _(authenticated)_ — account balances, HMAC-SHA256 signed.
- **TypeScript, built on the official SDK** — uses the high-level `McpServer` API with **Zod**-validated tool inputs.
- **Robust error handling** — network failures, a configurable request timeout, non-JSON responses, and missing credentials all surface as clean tool errors instead of crashing the transport.
- **Configurable & documented** — Zod-validated environment config with `dotenv` support and a `.env.example`.

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

**Full changelog:** [CHANGELOG.md](https://github.com/salleh/poloniex-mcp/blob/v0.1.0/CHANGELOG.md)
