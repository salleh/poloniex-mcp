import type { Config } from "../config.js";
import { buildAuthHeaders } from "./auth.js";

/** Error raised for any Poloniex request failure (network, timeout, or API). */
export class PoloniexError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PoloniexError";
  }
}

export type Query = Record<string, string | number>;

interface RequestOptions {
  query?: Query;
  headers?: Record<string, string>;
}

export interface OrderBookOptions {
  limit: number;
  scale?: string;
}

export interface BalancesOptions {
  accountType?: string;
}

export interface OpenOrdersOptions {
  symbol?: string;
  side?: string;
  from?: number;
  direction?: string;
  limit?: number;
  accountType?: string;
}

/**
 * Thin, typed HTTP client for the Poloniex spot REST API. Every failure is
 * surfaced as a {@link PoloniexError} with a clean, client-safe message.
 */
export class PoloniexClient {
  constructor(private readonly config: Config) {}

  /** Perform a request with a hard timeout and uniform error handling. */
  async request(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<unknown> {
    const { query, headers = {} } = options;

    const url = new URL(this.config.baseUrl + path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: { Accept: "application/json", ...headers },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new PoloniexError(
          `Poloniex request timed out after ${this.config.timeoutMs} ms: ${method} ${path}`,
          { cause: err },
        );
      }
      throw new PoloniexError(
        `Network error contacting Poloniex: ${toMessage(err)}`,
        { cause: err },
      );
    }

    const raw = await response.text();
    let body: unknown = null;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        const snippet = raw.slice(0, 300);
        throw new PoloniexError(
          response.ok
            ? `Poloniex returned a non-JSON response: ${snippet}`
            : `Poloniex returned HTTP ${response.status}: ${snippet}`,
        );
      }
    }

    if (!response.ok) {
      throw new PoloniexError(
        `Poloniex API error (HTTP ${response.status}): ${extractApiMessage(body)}`,
      );
    }

    return body;
  }

  /** Public: 24h ticker for a symbol, e.g. "BTC_USDT". */
  getTicker24h(symbol: string): Promise<unknown> {
    return this.request("GET", `/markets/${symbol}/ticker24h`);
  }

  /** Public: order book depth for a symbol. */
  getOrderBook(symbol: string, options: OrderBookOptions): Promise<unknown> {
    const query: Query = { limit: options.limit };
    if (options.scale) {
      query.scale = options.scale;
    }
    return this.request("GET", `/markets/${symbol}/orderBook`, { query });
  }

  /** Authenticated: account balances. Throws if credentials are missing. */
  async getBalances(options: BalancesOptions = {}): Promise<unknown> {
    const query: Query = {};
    if (options.accountType) {
      query.accountType = options.accountType;
    }
    return this.signedGet("/accounts/balances", query);
  }

  /** Authenticated: active (open) orders. Throws if credentials are missing. */
  async getOpenOrders(options: OpenOrdersOptions = {}): Promise<unknown> {
    const query: Query = {};
    if (options.symbol) query.symbol = options.symbol;
    if (options.side) query.side = options.side;
    if (options.from !== undefined) query.from = options.from;
    if (options.direction) query.direction = options.direction;
    if (options.limit !== undefined) query.limit = options.limit;
    if (options.accountType) query.accountType = options.accountType;
    return this.signedGet("/orders", query);
  }

  /** Public (unauthenticated) GET for market/reference endpoints. */
  get(path: string, query: Query = {}): Promise<unknown> {
    return this.request("GET", path, { query });
  }

  /**
   * Perform an authenticated GET, signing the query. The signed params must
   * exactly match the query that is sent, so both derive from `query`.
   */
  async signedGet(path: string, query: Query = {}): Promise<unknown> {
    const { apiKey, apiSecret } = this.config;
    if (!apiKey || !apiSecret) {
      throw new PoloniexError(
        "Missing credentials: set POLONIEX_API_KEY and POLONIEX_API_SECRET in " +
          "the environment to use authenticated tools such as get_balances and " +
          "get_open_orders.",
      );
    }

    const headers = buildAuthHeaders({
      apiKey,
      apiSecret,
      method: "GET",
      path,
      query,
    });

    return this.request("GET", path, { query, headers });
  }
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function extractApiMessage(body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.msg === "string") return record.msg;
    return JSON.stringify(body);
  }
  return String(body);
}
