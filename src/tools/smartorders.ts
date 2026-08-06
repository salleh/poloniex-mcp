import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient, Query } from "../poloniex/client.js";
import {
  toToolResult,
  normalizeSymbol,
  buildOrderHistoryQuery,
  resolveOrderPath,
  MAX_OPEN_ORDERS_LIMIT,
} from "./shared.js";
import { orderHistoryInputSchema } from "./orders.js";

const AUTH_NOTE =
  "Requires POLONIEX_API_KEY and POLONIEX_API_SECRET in the environment.";

/** Register authenticated smart-order read tools. Require API credentials. */
export function registerSmartOrdersTools(
  server: McpServer,
  client: PoloniexClient,
): void {
  server.registerTool(
    "get_smart_open_orders",
    {
      title: "Get Open Smart Orders",
      description:
        "Fetch active (pending) smart orders (stop / stop-limit) for the " +
        "account. " +
        AUTH_NOTE,
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
          .describe("Smart order id to start the query from (default 0)."),
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
          .describe("Number of smart orders to return."),
      },
    },
    async ({ symbol, side, from, direction, limit }) =>
      toToolResult(() => {
        const query: Query = {};
        if (symbol) query.symbol = normalizeSymbol(symbol);
        if (side) query.side = side;
        if (from !== undefined) query.from = from;
        if (direction) query.direction = direction;
        if (limit !== undefined) query.limit = limit;
        return client.signedGet("/smartorders", query);
      }),
  );

  server.registerTool(
    "get_smart_order",
    {
      title: "Get Smart Order",
      description:
        "Fetch a single smart order by its order id or client order id " +
        "(provide exactly one). " +
        AUTH_NOTE,
      inputSchema: {
        id: z.string().min(1).optional().describe("The smart order id."),
        clientOrderId: z
          .string()
          .min(1)
          .optional()
          .describe("The client-specified order id (looked up as cid:...)."),
      },
    },
    async ({ id, clientOrderId }) =>
      toToolResult(() =>
        client.signedGet(resolveOrderPath("/smartorders", id, clientOrderId)),
      ),
  );

  server.registerTool(
    "get_smart_orders_history",
    {
      title: "Get Smart Orders History",
      description:
        "Fetch historical (triggered/canceled) smart orders with optional " +
        "filters. " +
        AUTH_NOTE,
      inputSchema: orderHistoryInputSchema,
    },
    async (args) =>
      toToolResult(() =>
        client.signedGet(
          "/smartorders/history",
          buildOrderHistoryQuery({
            ...args,
            symbol: args.symbol ? normalizeSymbol(args.symbol) : undefined,
          }),
        ),
      ),
  );
}
