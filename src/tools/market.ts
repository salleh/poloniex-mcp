import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient, Query } from "../poloniex/client.js";
import {
  toToolResult,
  normalizeSymbol,
  normalizeCurrency,
  MAX_ORDERBOOK_LIMIT,
  DEFAULT_ORDERBOOK_LIMIT,
  MAX_CANDLES_LIMIT,
  MAX_MARKET_TRADES_LIMIT,
  CANDLE_INTERVALS,
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
        "Fetch 24h ticker data (last price, high, low, volume). Omit `symbol` " +
        "for every symbol, or pass one for a single market. Public — no " +
        "credentials required.",
      inputSchema: {
        symbol: z
          .string()
          .optional()
          .describe(
            'Trading pair, e.g. "BTC_USDT". Omit to return all tickers.',
          ),
      },
    },
    async ({ symbol }) =>
      toToolResult(() =>
        symbol
          ? client.getTicker24h(normalizeSymbol(symbol))
          : client.get("/markets/ticker24h"),
      ),
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
    "get_price",
    {
      title: "Get Price",
      description:
        "Fetch the latest trade price. Omit `symbol` for every symbol, or pass " +
        "one for a single market. Public — no credentials required.",
      inputSchema: {
        symbol: z
          .string()
          .optional()
          .describe('Trading pair, e.g. "BTC_USDT". Omit to return all.'),
      },
    },
    async ({ symbol }) =>
      toToolResult(() =>
        client.get(
          symbol
            ? `/markets/${normalizeSymbol(symbol)}/price`
            : "/markets/price",
        ),
      ),
  );

  server.registerTool(
    "get_mark_price",
    {
      title: "Get Mark Price",
      description:
        "Fetch the current mark price. Omit `symbol` for every symbol, or pass " +
        "one for a single market. Public — no credentials required.",
      inputSchema: {
        symbol: z
          .string()
          .optional()
          .describe('Trading pair, e.g. "BTC_USDT". Omit to return all.'),
      },
    },
    async ({ symbol }) =>
      toToolResult(() =>
        client.get(
          symbol
            ? `/markets/${normalizeSymbol(symbol)}/markPrice`
            : "/markets/markPrice",
        ),
      ),
  );

  server.registerTool(
    "get_mark_price_components",
    {
      title: "Get Mark Price Components",
      description:
        "Fetch the components used to derive a symbol's mark price. Public — no " +
        "credentials required.",
      inputSchema: {
        symbol: z
          .string()
          .min(1)
          .describe('Trading pair in Poloniex format, e.g. "BTC_USDT".'),
      },
    },
    async ({ symbol }) =>
      toToolResult(() =>
        client.get(`/markets/${normalizeSymbol(symbol)}/markPriceComponents`),
      ),
  );

  server.registerTool(
    "get_candles",
    {
      title: "Get Candles",
      description:
        "Fetch OHLC candlestick data for a symbol at a given interval. Public — " +
        "no credentials required.",
      inputSchema: {
        symbol: z
          .string()
          .min(1)
          .describe('Trading pair in Poloniex format, e.g. "BTC_USDT".'),
        interval: z
          .enum(CANDLE_INTERVALS)
          .describe("Candle interval, e.g. MINUTE_1, HOUR_1, DAY_1."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_CANDLES_LIMIT)
          .optional()
          .describe("Number of candles to return (default 100, max 500)."),
        startTime: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Start time filter in epoch milliseconds."),
        endTime: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("End time filter in epoch milliseconds."),
      },
    },
    async ({ symbol, interval, limit, startTime, endTime }) =>
      toToolResult(() => {
        const query: Query = { interval };
        if (limit !== undefined) query.limit = limit;
        if (startTime !== undefined) query.startTime = startTime;
        if (endTime !== undefined) query.endTime = endTime;
        return client.get(`/markets/${normalizeSymbol(symbol)}/candles`, query);
      }),
  );

  server.registerTool(
    "get_market_trades",
    {
      title: "Get Market Trades",
      description:
        "Fetch recent public trades for a symbol. Public — no credentials " +
        "required.",
      inputSchema: {
        symbol: z
          .string()
          .min(1)
          .describe('Trading pair in Poloniex format, e.g. "BTC_USDT".'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_MARKET_TRADES_LIMIT)
          .optional()
          .describe("Number of trades to return (default 500, max 1000)."),
      },
    },
    async ({ symbol, limit }) =>
      toToolResult(() => {
        const query: Query = {};
        if (limit !== undefined) query.limit = limit;
        return client.get(`/markets/${normalizeSymbol(symbol)}/trades`, query);
      }),
  );

  server.registerTool(
    "get_collateral_info",
    {
      title: "Get Collateral Info",
      description:
        "Fetch margin collateral information. Omit `currency` for all " +
        "currencies, or pass one for a single currency. Public — no " +
        "credentials required.",
      inputSchema: {
        currency: z
          .string()
          .optional()
          .describe('Currency code, e.g. "BTC". Omit to return all.'),
      },
    },
    async ({ currency }) =>
      toToolResult(() =>
        client.get(
          currency
            ? `/markets/${normalizeCurrency(currency)}/collateralInfo`
            : "/markets/collateralInfo",
        ),
      ),
  );

  server.registerTool(
    "get_borrow_rates_info",
    {
      title: "Get Borrow Rates Info",
      description:
        "Fetch borrow rates for all tiers and currencies. Public — no " +
        "credentials required.",
      inputSchema: {},
    },
    async () => toToolResult(() => client.get("/markets/borrowRatesInfo")),
  );
}
