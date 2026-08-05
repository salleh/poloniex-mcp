import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient } from "../poloniex/client.js";
import {
  toToolResult,
  normalizeSymbol,
  MAX_ORDERBOOK_LIMIT,
  DEFAULT_ORDERBOOK_LIMIT,
} from "./shared.js";

/** Register public market-data tools (no credentials required). */
export function registerMarketTools(
  server: McpServer,
  client: PoloniexClient,
): void {
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
}
