import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Query } from "../poloniex/client.js";

export const MAX_ORDERBOOK_LIMIT = 150;
export const DEFAULT_ORDERBOOK_LIMIT = 10;
export const MAX_OPEN_ORDERS_LIMIT = 2000;
export const MAX_ACCOUNT_ACTIVITY_LIMIT = 1000;
export const MAX_INTEREST_HISTORY_LIMIT = 100;
export const MAX_TRANSFER_RECORDS_LIMIT = 1000;
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

/**
 * Valid `activityType` codes for `/accounts/activity`, confirmed against the
 * Poloniex accounts docs. 200 = ALL, 201 = AIRDROP, 202 = COMMISSION_REBATE,
 * 203 = STAKING, 204 = REFERRAL_REBATE, 205 = SWAP, 104 = CREDIT_ADJUSTMENT,
 * 105 = DEBIT_ADJUSTMENT, 199 = OTHER.
 */
export const ACCOUNT_ACTIVITY_TYPES = [
  200, 201, 202, 203, 204, 205, 104, 105, 199,
] as const;

/** Fields shared by the paginated authenticated activity/history endpoints. */
export interface ActivityQueryInput {
  limit?: number;
  from?: number;
  direction?: string;
  startTime?: number;
  endTime?: number;
  currency?: string;
  activityType?: number;
}

/**
 * Build a query for the paginated activity/history endpoints, including only
 * the fields the caller supplied so no empty params are sent or signed.
 */
export function buildActivityQuery(input: ActivityQueryInput): Query {
  const query: Query = {};
  if (input.limit !== undefined) query.limit = input.limit;
  if (input.from !== undefined) query.from = input.from;
  if (input.direction) query.direction = input.direction;
  if (input.startTime !== undefined) query.startTime = input.startTime;
  if (input.endTime !== undefined) query.endTime = input.endTime;
  if (input.currency) query.currency = input.currency;
  if (input.activityType !== undefined) query.activityType = input.activityType;
  return query;
}

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
