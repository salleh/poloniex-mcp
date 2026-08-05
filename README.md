# poloniex-mcp

A local [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that
exposes the [Poloniex](https://poloniex.com) spot exchange to any MCP client
(e.g. Claude Desktop). It communicates over **stdio** and uses the official
`@modelcontextprotocol/sdk`.

## Tools

| Tool            | Auth | Description                                              |
| --------------- | ---- | ------------------------------------------------------- |
| `get_ticker`    | No   | 24h ticker (price, high, low, volume) for a symbol.     |
| `get_orderbook` | No   | Order book depth (bids/asks) for a symbol.              |
| `get_balances`  | Yes  | Account balances, signed with your Poloniex API key.    |

Symbols use Poloniex format, e.g. `BTC_USDT`.

## Requirements

- **Node.js 24+** (uses global `fetch`, `AbortSignal.timeout`, and `node:crypto`).
- The only dependency is `@modelcontextprotocol/sdk`.

## Install

```bash
npm install
```

## Credentials

The public tools (`get_ticker`, `get_orderbook`) need no credentials. For
`get_balances`, set your Poloniex API key and secret in the environment:

- `POLONIEX_API_KEY`
- `POLONIEX_API_SECRET`

Requests are signed with **HMAC-SHA256** (base64), per the Poloniex
`api.poloniex.com` REST specification, using the `key` / `signature` /
`signTimestamp` headers.

> **Security:** never commit your API key/secret. Keep them in the MCP client's
> `env` block (below) or a local `.env` that is git-ignored. A read-only API key
> is recommended since this server never places trades.

## Use with Claude Desktop

Add the following to `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`), then
fully restart Claude Desktop:

```json
{
  "mcpServers": {
    "poloniex": {
      "command": "node",
      "args": ["/Users/salleh/repos/poloniex-mcp/index.js"],
      "env": {
        "POLONIEX_API_KEY": "your-api-key-here",
        "POLONIEX_API_SECRET": "your-api-secret-here"
      }
    }
  }
}
```

Omit the `env` block if you only want the public tools.

## Run standalone

```bash
npm start
```

The server logs to **stderr** (`Poloniex MCP server running on stdio.`) and
reserves stdout for the MCP JSON-RPC stream.

## Error handling

Network failures, a 10s request timeout, non-JSON responses, Poloniex API
errors, and missing credentials are all returned to the client as clean tool
errors rather than crashing the transport.

## License

MIT
