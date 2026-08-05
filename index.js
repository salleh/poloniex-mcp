#!/usr/bin/env node
/**
 * Poloniex MCP Server
 * -------------------
 * A local Model Context Protocol server (stdio transport) that exposes the
 * Poloniex spot exchange to any MCP client (e.g. Claude Desktop).
 *
 * Module system: ES Modules (ESM). The @modelcontextprotocol/sdk ships as ESM,
 * so package.json declares "type": "module" and we use `import`.
 *
 * Tools:
 *   - get_ticker    (public)        24h ticker for a symbol
 *   - get_orderbook (public)        order book depth for a symbol
 *   - get_balances  (authenticated) account balances, HMAC-signed
 *
 * Node 24+ provides global `fetch` and `AbortSignal.timeout`, and `node:crypto`
 * for HMAC signing — no third-party HTTP or crypto libraries required.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import crypto from "node:crypto";

// --- Configuration ---------------------------------------------------------

const POLONIEX_BASE_URL = "https://api.poloniex.com";
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_ORDERBOOK_LIMIT = 10;

/**
 * Read credentials lazily so the server can still start (and serve public
 * tools) even when keys are absent. Only get_balances requires them.
 */
function getCredentials() {
  const apiKey = process.env.POLONIEX_API_KEY;
  const apiSecret = process.env.POLONIEX_API_SECRET;
  return { apiKey, apiSecret };
}

// --- HTTP helper -----------------------------------------------------------

/**
 * Perform an HTTP request against Poloniex with a hard timeout and uniform
 * error surface. Never throws a raw network/JSON error to the caller — always
 * an McpError with a clean message.
 *
 * @param {string} method   HTTP method
 * @param {string} path     Request path beginning with "/"
 * @param {object} [opts]
 * @param {Record<string,string|number>} [opts.query]   Query params
 * @param {Record<string,string>}        [opts.headers] Extra headers
 * @returns {Promise<any>} Parsed JSON response body
 */
async function poloniexRequest(method, path, opts = {}) {
  const { query, headers = {} } = opts;

  const url = new URL(POLONIEX_BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    // Network-level failures: DNS, connection refused, timeout abort, etc.
    if (err?.name === "TimeoutError") {
      throw new McpError(
        ErrorCode.InternalError,
        `Poloniex request timed out after ${REQUEST_TIMEOUT_MS} ms: ${method} ${path}`,
      );
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Network error contacting Poloniex: ${err?.message ?? String(err)}`,
    );
  }

  const rawBody = await response.text();
  let body;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Non-JSON response (e.g. an HTML error page from a proxy).
    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `Poloniex returned HTTP ${response.status}: ${rawBody.slice(0, 300)}`,
      );
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Poloniex returned a non-JSON response: ${rawBody.slice(0, 300)}`,
    );
  }

  if (!response.ok) {
    // Poloniex error bodies look like { code, message }.
    const detail =
      body && typeof body === "object"
        ? body.message ?? body.msg ?? JSON.stringify(body)
        : String(body);
    throw new McpError(
      ErrorCode.InternalError,
      `Poloniex API error (HTTP ${response.status}): ${detail}`,
    );
  }

  return body;
}

// --- Authentication --------------------------------------------------------

/**
 * Build the Poloniex authentication headers.
 *
 * Poloniex (api.poloniex.com) signs requests with HMAC-SHA256 and base64-encodes
 * the digest — NOT SHA512. The signature payload is:
 *
 *     METHOD + "\n" + requestPath + "\n" + <sorted, url-encoded params>
 *
 * where the param set always includes `signTimestamp` (ms). For a GET the
 * params are the query string params plus signTimestamp, sorted alphabetically
 * by key. Required headers: key, signature, signTimestamp.
 *
 * @param {string} method
 * @param {string} path
 * @param {Record<string,string|number>} [query]
 * @returns {Record<string,string>} headers to attach to the request
 */
function buildAuthHeaders(method, path, query = {}) {
  const { apiKey, apiSecret } = getCredentials();
  if (!apiKey || !apiSecret) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Missing credentials: set POLONIEX_API_KEY and POLONIEX_API_SECRET in the " +
        "environment to use authenticated tools such as get_balances.",
    );
  }

  const signTimestamp = Date.now().toString();

  // Combine caller params with signTimestamp, sort by key, url-encode.
  const params = { ...query, signTimestamp };
  const encoded = Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(String(params[k]))}`)
    .join("&");

  const payload = `${method}\n${path}\n${encoded}`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(payload)
    .digest("base64");

  return {
    key: apiKey,
    signature,
    signTimestamp,
    "Content-Type": "application/json",
  };
}

// --- Tool implementations --------------------------------------------------

/** Normalize + validate a symbol argument like "BTC_USDT". */
function requireSymbol(args) {
  const symbol = args?.symbol;
  if (typeof symbol !== "string" || symbol.trim() === "") {
    throw new McpError(
      ErrorCode.InvalidParams,
      "`symbol` is required and must be a non-empty string, e.g. \"BTC_USDT\".",
    );
  }
  // Poloniex symbols are upper-case with an underscore separator.
  return symbol.trim().toUpperCase();
}

async function getTicker(args) {
  const symbol = requireSymbol(args);
  const data = await poloniexRequest("GET", `/markets/${symbol}/ticker24h`);
  return data;
}

async function getOrderbook(args) {
  const symbol = requireSymbol(args);

  const limit = args?.limit ?? DEFAULT_ORDERBOOK_LIMIT;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "`limit` must be a positive integer when provided.",
    );
  }

  const query = { limit };
  if (args?.scale !== undefined && args?.scale !== null) {
    query.scale = String(args.scale);
  }

  const data = await poloniexRequest("GET", `/markets/${symbol}/orderBook`, {
    query,
  });
  return data;
}

async function getBalances(args) {
  // Optional `accountType`; Poloniex defaults to SPOT.
  const accountType = args?.accountType;
  const query = {};
  if (typeof accountType === "string" && accountType.trim() !== "") {
    query.accountType = accountType.trim().toUpperCase();
  }

  const path = "/accounts/balances";
  const headers = buildAuthHeaders("GET", path, query);
  const data = await poloniexRequest("GET", path, { query, headers });
  return data;
}

// --- Tool registry ---------------------------------------------------------

const TOOLS = [
  {
    name: "get_ticker",
    description:
      "Fetch current 24h ticker data (last price, high, low, volume, etc.) " +
      "for a Poloniex spot symbol. Public — no credentials required.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: 'Trading pair in Poloniex format, e.g. "BTC_USDT".',
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_orderbook",
    description:
      "Fetch order book depth (bids and asks) for a Poloniex spot symbol. " +
      "Public — no credentials required.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: 'Trading pair in Poloniex format, e.g. "BTC_USDT".',
        },
        limit: {
          type: "integer",
          description:
            "Number of price levels per side to return (default 10). " +
            "Poloniex accepts 5, 10, 20, 50, 100, 150.",
          minimum: 1,
        },
        scale: {
          type: "string",
          description:
            "Optional price aggregation scale (tick grouping). Omit for full precision.",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "get_balances",
    description:
      "Fetch authenticated account balances from Poloniex. Requires " +
      "POLONIEX_API_KEY and POLONIEX_API_SECRET in the environment.",
    inputSchema: {
      type: "object",
      properties: {
        accountType: {
          type: "string",
          description:
            'Optional account type, e.g. "SPOT" (default) or "FUTURES".',
        },
      },
    },
  },
];

const TOOL_HANDLERS = {
  get_ticker: getTicker,
  get_orderbook: getOrderbook,
  get_balances: getBalances,
};

// --- Server wiring ---------------------------------------------------------

const server = new Server(
  { name: "poloniex-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = TOOL_HANDLERS[name];

  if (!handler) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  try {
    const result = await handler(args ?? {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    // McpError (validation, credentials, API errors) → surface cleanly to the
    // client as tool output rather than crashing the transport.
    const message =
      err instanceof McpError
        ? err.message
        : `Unexpected error: ${err?.message ?? String(err)}`;
    return {
      isError: true,
      content: [{ type: "text", text: message }],
    };
  }
});

// --- Boot ------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr only — stdout is reserved for the MCP JSON-RPC stream.
  console.error("Poloniex MCP server running on stdio.");
}

main().catch((err) => {
  console.error("Fatal error starting Poloniex MCP server:", err);
  process.exit(1);
});
