# poloniex-mcp

A local [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that
exposes the [Poloniex](https://poloniex.com) spot exchange to any MCP client
(e.g. Claude Desktop). Built in **TypeScript** on the official
`@modelcontextprotocol/sdk` high-level `McpServer` API, communicating over
**stdio**.

## Tools

| Tool            | Auth | Description                                          |
| --------------- | ---- | ---------------------------------------------------- |
| `get_ticker`    | No   | 24h ticker (price, high, low, volume) for a symbol.  |
| `get_orderbook` | No   | Order book depth (bids/asks) for a symbol.           |
| `get_balances`  | Yes  | Account balances, signed with your Poloniex API key. |

Symbols use Poloniex format, e.g. `BTC_USDT` (input is normalized, so
`btc_usdt` also works).

## Requirements

- **Node.js 24+** (uses global `fetch`, `AbortSignal.timeout`, and `node:crypto`).

## Project structure

```
src/
  index.ts            # entry point: loads config, starts stdio transport
  server.ts           # builds the McpServer and registers tools
  config.ts           # env configuration, validated with Zod
  tools.ts            # tool definitions (Zod input schemas + handlers)
  poloniex/
    client.ts         # typed HTTP client (timeout + error handling)
    auth.ts           # HMAC-SHA256 request signing
test/
  unit.test.ts        # auth signing + HTTP client unit tests
  server.test.ts      # in-memory MCP integration tests
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

The public tools (`get_ticker`, `get_orderbook`) need no credentials. For
`get_balances`, set your Poloniex API key and secret:

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
      "args": ["/Users/salleh/repos/poloniex-mcp/dist/index.js"],
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
