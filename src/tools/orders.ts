import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient, Query } from "../poloniex/client.js";
import {
  toToolResult,
  normalizeSymbol,
  buildOrderHistoryQuery,
  resolveOrderPath,
  MAX_OPEN_ORDERS_LIMIT,
  MAX_TRADE_HISTORY_LIMIT,
} from "./shared.js";

const AUTH_NOTE =
  "Requires POLONIEX_API_KEY and POLONIEX_API_SECRET in the environment.";

const directionSchema = z
  .enum(["PRE", "NEXT"])
  .optional()
  .describe("Pagination direction relative to `from` (default NEXT).");

const timeMsSchema = z.number().int().nonnegative().optional();

/** Input shape shared by the order-history tools (orders and smart orders). */
const orderHistoryInputSchema = {
  accountType: z
    .string()
    .optional()
    .describe('Account type; "SPOT" is the default and only supported value.'),
  hideCancel: z
    .boolean()
    .optional()
    .describe("Exclude canceled orders from the result."),
  type: z
    .enum(["MARKET", "LIMIT", "LIMIT_MAKER"])
    .optional()
    .describe("Filter by order type (default all)."),
  side: z.enum(["BUY", "SELL"]).optional().describe("Filter by side."),
  symbol: z
    .string()
    .optional()
    .describe('Filter by trading pair, e.g. "BTC_USDT". Omit for all.'),
  states: z
    .string()
    .optional()
    .describe(
      "Comma-separated states, e.g. FILLED,CANCELED " +
        "(FAILED, FILLED, CANCELED, PARTIALLY_CANCELED).",
    ),
  direction: directionSchema,
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Max number of records to return (default 100)."),
  from: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Order id to start the query from (default 0)."),
  startTime: timeMsSchema.describe("Start time in epoch milliseconds."),
  endTime: timeMsSchema.describe("End time in epoch milliseconds."),
};

/** Register authenticated order and trade read tools. Require API credentials. */
export function registerOrdersTools(
  server: McpServer,
  client: PoloniexClient,
): void {
  server.registerTool(
    "get_open_orders",
    {
      title: "Get Open Orders",
      description: "Fetch active (open) orders for the account. " + AUTH_NOTE,
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

  server.registerTool(
    "get_order",
    {
      title: "Get Order",
      description:
        "Fetch a single order by its order id or client order id (provide " +
        "exactly one). " +
        AUTH_NOTE,
      inputSchema: {
        id: z.string().min(1).optional().describe("The order id."),
        clientOrderId: z
          .string()
          .min(1)
          .optional()
          .describe("The client-specified order id (looked up as cid:...)."),
      },
    },
    async ({ id, clientOrderId }) =>
      toToolResult(() =>
        client.signedGet(resolveOrderPath("/orders", id, clientOrderId)),
      ),
  );

  server.registerTool(
    "get_orders_history",
    {
      title: "Get Orders History",
      description:
        "Fetch historical (closed/canceled) orders with optional filters. " +
        AUTH_NOTE,
      inputSchema: orderHistoryInputSchema,
    },
    async (args) =>
      toToolResult(() =>
        client.signedGet(
          "/orders/history",
          buildOrderHistoryQuery({
            ...args,
            symbol: args.symbol ? normalizeSymbol(args.symbol) : undefined,
          }),
        ),
      ),
  );

  server.registerTool(
    "get_order_trades",
    {
      title: "Get Order Trades",
      description:
        "Fetch the trades that filled a specific order, by order id. Client " +
        "order id is not supported by this endpoint. " +
        AUTH_NOTE,
      inputSchema: {
        id: z.string().min(1).describe("The order id."),
      },
    },
    async ({ id }) =>
      toToolResult(() => client.signedGet(`/orders/${id}/trades`)),
  );

  server.registerTool(
    "get_trade_history",
    {
      title: "Get Trade History",
      description:
        "Fetch the account's trade history across orders, with optional " +
        "filters. " +
        AUTH_NOTE,
      inputSchema: {
        symbols: z
          .string()
          .optional()
          .describe(
            'One or more symbols, comma-separated, e.g. "BTC_USDT,ETH_USDT". ' +
              "Omit for all.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_TRADE_HISTORY_LIMIT)
          .optional()
          .describe("Number of trades to return (default 500, max 1000)."),
        from: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Page id to start the query from (default 0)."),
        direction: directionSchema,
        startTime: timeMsSchema.describe("Start time in epoch milliseconds."),
        endTime: timeMsSchema.describe("End time in epoch milliseconds."),
      },
    },
    async ({ symbols, limit, from, direction, startTime, endTime }) =>
      toToolResult(() => {
        const query: Query = {};
        if (symbols) query.symbols = symbols.trim().toUpperCase();
        if (limit !== undefined) query.limit = limit;
        if (from !== undefined) query.from = from;
        if (direction) query.direction = direction;
        if (startTime !== undefined) query.startTime = startTime;
        if (endTime !== undefined) query.endTime = endTime;
        return client.signedGet("/trades", query);
      }),
  );

  server.registerTool(
    "get_kill_switch_status",
    {
      title: "Get Kill Switch Status",
      description:
        "Fetch the current status of the account's order kill switch. " +
        AUTH_NOTE,
      inputSchema: {},
    },
    async () =>
      toToolResult(() => client.signedGet("/orders/killSwitchStatus")),
  );
}

export { orderHistoryInputSchema };
