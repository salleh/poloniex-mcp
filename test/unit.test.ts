import { describe, it, expect, vi, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  buildSignaturePayload,
  signPayload,
  buildAuthHeaders,
} from "../src/poloniex/auth";
import { PoloniexClient } from "../src/poloniex/client";
import { loadConfig } from "../src/config";

describe("auth", () => {
  it("composes METHOD\\npath\\nparams for a single param", () => {
    const payload = buildSignaturePayload("GET", "/accounts/balances", {
      signTimestamp: "123",
    });
    expect(payload).toBe("GET\n/accounts/balances\nsignTimestamp=123");
  });

  it("sorts params alphabetically by key", () => {
    const payload = buildSignaturePayload("GET", "/accounts/balances", {
      signTimestamp: "123",
      accountType: "SPOT",
    });
    expect(payload).toBe(
      "GET\n/accounts/balances\naccountType=SPOT&signTimestamp=123",
    );
  });

  it("url-encodes param values", () => {
    expect(buildSignaturePayload("GET", "/x", { a: "a b/c" })).toBe(
      "GET\n/x\na=a%20b%2Fc",
    );
  });

  it("signPayload matches an independent HMAC-SHA256 base64 computation", () => {
    const secret = "test-secret";
    const payload = "GET\n/accounts/balances\nsignTimestamp=123";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64");
    expect(signPayload(secret, payload)).toBe(expected);
  });

  it("buildAuthHeaders produces a deterministic signature with an injected clock", () => {
    const headers = buildAuthHeaders({
      apiKey: "test-key",
      apiSecret: "test-secret",
      method: "GET",
      path: "/accounts/balances",
      now: () => 123,
    });

    expect(headers.key).toBe("test-key");
    expect(headers.signTimestamp).toBe("123");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.signature).toBe(
      signPayload("test-secret", "GET\n/accounts/balances\nsignTimestamp=123"),
    );
  });
});

describe("PoloniexClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("getTicker24h requests the correct URL and returns parsed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ symbol: "BTC_USDT", close: "64000" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new PoloniexClient(loadConfig({}));
    const data = (await client.getTicker24h("BTC_USDT")) as {
      symbol: string;
    };

    expect(data.symbol).toBe("BTC_USDT");
    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.toString()).toContain("/markets/BTC_USDT/ticker24h");
  });

  it("surfaces Poloniex API errors as a clean message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ code: 21600, message: "Symbol not found" }),
            { status: 404 },
          ),
        ),
    );

    const client = new PoloniexClient(loadConfig({}));
    await expect(client.getTicker24h("NOPE_USDT")).rejects.toThrow(
      /Symbol not found/,
    );
  });

  it("getBalances rejects when credentials are absent", async () => {
    const client = new PoloniexClient(loadConfig({}));
    await expect(client.getBalances()).rejects.toThrow(/Missing credentials/);
  });

  it("getBalances sends signed auth headers when credentials are present", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new PoloniexClient(
      loadConfig({
        POLONIEX_API_KEY: "test-key",
        POLONIEX_API_SECRET: "test-secret",
      }),
    );
    await client.getBalances();

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.key).toBe("test-key");
    expect(typeof headers.signature).toBe("string");
    expect(headers.signTimestamp).toMatch(/^\d+$/);
  });
});
