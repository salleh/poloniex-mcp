import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { PoloniexClient } from "./poloniex/client.js";

const MAX_ORDERBOOK_LIMIT = 150;
const DEFAULT_ORDERBOOK_LIMIT = 10;
const MAX_OPEN_ORDERS_LIMIT = 2000;

/** Normalize a symbol argument, e.g. " btc_usdt " -> "BTC_USDT". */
function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/**
 * Run a tool operation and wrap the outcome in a CallToolResult. Errors become
 * `isError` text results rather than protocol-level failures, so the client
 * sees a clean message.
 */
async function toToolResult(
  operation: () => Promise<unknown>,
): Promise<CallToolResult> {
  try {
    const data = await operation();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [{ type: "text", text: message }],
    };
  }
}

/** Register all Poloniex tools on the given MCP server. */
export function registerTools(server: McpServer, client: PoloniexClient): void {
  server.registerTool(
    "get_ticker",
    {
      title: "Get Ticker",
      description:
        "Fetch current 24h ticker data (last price, high, low, volume) for a " +
        "Poloniex spot symbol. Public — no credentials required.",
      inputSchema: {
        symbol: z
          .string()
          .min(1)
          .describe('Trading pair in Poloniex format, e.g. "BTC_USDT".'),
      },
    },
    async ({ symbol }) =>
      toToolResult(() => client.getTicker24h(normalizeSymbol(symbol))),
  );

  server.registerTool(
    "get_orderbook",
    {
      title: "Get Order Book",
      description:
        "Fetch order book depth (bids and asks) for a Poloniex spot symbol. " +
        "Public — no credentials required.",
      inputSchema: {
        symbol: z
          .string()
          .min(1)
          .describe('Trading pair in Poloniex format, e.g. "BTC_USDT".'),
        limit: z
          .number()
          .int()
          .positive()
          .max(MAX_ORDERBOOK_LIMIT)
          .default(DEFAULT_ORDERBOOK_LIMIT)
          .describe("Number of price levels per side to return (default 10)."),
        scale: z
          .string()
          .optional()
          .describe("Optional price aggregation scale (tick grouping)."),
      },
    },
    async ({ symbol, limit, scale }) =>
      toToolResult(() =>
        client.getOrderBook(normalizeSymbol(symbol), { limit, scale }),
      ),
  );

  server.registerTool(
    "get_balances",
    {
      title: "Get Balances",
      description:
        "Fetch authenticated account balances from Poloniex. Requires " +
        "POLONIEX_API_KEY and POLONIEX_API_SECRET in the environment.",
      inputSchema: {
        accountType: z
          .string()
          .optional()
          .describe(
            'Optional account type, e.g. "SPOT" (default) or "FUTURES".',
          ),
      },
    },
    async ({ accountType }) =>
      toToolResult(() =>
        client.getBalances({
          accountType: accountType
            ? accountType.trim().toUpperCase()
            : undefined,
        }),
      ),
  );

  server.registerTool(
    "get_open_orders",
    {
      title: "Get Open Orders",
      description:
        "Fetch active (open) orders for the account. Requires " +
        "POLONIEX_API_KEY and POLONIEX_API_SECRET in the environment.",
      inputSchema: {
        symbol: z
          .string()
          .optional()
          .describe('Filter by trading pair, e.g. "BTC_USDT". Omit for all.'),
        side: z
          .enum(["BUY", "SELL"])
          .optional()
          .describe("Filter by order side."),
        from: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Order id to start the query from (default 0)."),
        direction: z
          .enum(["PRE", "NEXT"])
          .optional()
          .describe("Query direction relative to `from`."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_OPEN_ORDERS_LIMIT)
          .optional()
          .describe("Number of orders to return (default 500, max 2000)."),
      },
    },
    async ({ symbol, side, from, direction, limit }) =>
      toToolResult(() =>
        client.getOpenOrders({
          symbol: symbol ? normalizeSymbol(symbol) : undefined,
          side,
          from,
          direction,
          limit,
        }),
      ),
  );
}
