import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const MAX_ORDERBOOK_LIMIT = 150;
export const DEFAULT_ORDERBOOK_LIMIT = 10;
export const MAX_OPEN_ORDERS_LIMIT = 2000;
export const MAX_CANDLES_LIMIT = 500;
export const MAX_MARKET_TRADES_LIMIT = 1000;

/**
 * Valid candle intervals accepted by `/markets/{symbol}/candles`, confirmed
 * against the Poloniex spot market-data docs.
 */
export const CANDLE_INTERVALS = [
  "MINUTE_1",
  "MINUTE_5",
  "MINUTE_10",
  "MINUTE_15",
  "MINUTE_30",
  "HOUR_1",
  "HOUR_2",
  "HOUR_4",
  "HOUR_6",
  "HOUR_12",
  "DAY_1",
  "DAY_3",
  "WEEK_1",
  "MONTH_1",
] as const;

/** Normalize a symbol argument, e.g. " btc_usdt " -> "BTC_USDT". */
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/** Normalize a currency argument, e.g. " usdt " -> "USDT". */
export function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

/**
 * Run a tool operation and wrap the outcome in a CallToolResult. Errors become
 * `isError` text results rather than protocol-level failures, so the client
 * sees a clean message.
 */
export async function toToolResult(
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
