import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient } from "../poloniex/client.js";
import {
  toToolResult,
  normalizeSymbol,
  MAX_OPEN_ORDERS_LIMIT,
} from "./shared.js";

/** Register authenticated order read tools. Require API credentials. */
export function registerOrdersTools(
  server: McpServer,
  client: PoloniexClient,
): void {
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
