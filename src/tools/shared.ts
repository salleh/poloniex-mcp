import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const MAX_ORDERBOOK_LIMIT = 150;
export const DEFAULT_ORDERBOOK_LIMIT = 10;
export const MAX_OPEN_ORDERS_LIMIT = 2000;

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
