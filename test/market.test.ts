import { describe, it, expect, vi, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server";
import { loadConfig } from "../src/config";

type TextContent = Array<{ type: string; text: string }>;

/** Spin up an in-memory client connected to the MCP server under test. */
async function connect(env: NodeJS.ProcessEnv = {}): Promise<Client> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const server = createServer(loadConfig(env));
  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);

  return client;
}

/** Stub fetch with a 200 JSON response and return the mock for URL assertions. */
function stubFetch(body: unknown = {}): ReturnType<typeof vi.fn> {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The URL the tool caused fetch to request. */
function requestedUrl(fetchMock: ReturnType<typeof vi.fn>): URL {
  return fetchMock.mock.calls[0]?.[0] as URL;
}

describe("public market & reference tools", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get_ticker without a symbol fetches all tickers", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect();

    const result = await client.callTool({ name: "get_ticker", arguments: {} });

    expect(result.isError).toBeFalsy();
    expect(requestedUrl(fetchMock).pathname).toBe("/markets/ticker24h");
  });

  it("get_ticker with a symbol normalizes and targets the single market", async () => {
    const fetchMock = stubFetch({ symbol: "BTC_USDT" });
    const client = await connect();

    await client.callTool({
      name: "get_ticker",
      arguments: { symbol: "btc_usdt" },
    });

    expect(requestedUrl(fetchMock).pathname).toBe(
      "/markets/BTC_USDT/ticker24h",
    );
  });

  it("get_symbols returns all markets by default", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect();

    await client.callTool({ name: "get_symbols", arguments: {} });

    expect(requestedUrl(fetchMock).pathname).toBe("/markets");
  });

  it("get_symbols targets a single normalized symbol", async () => {
    const fetchMock = stubFetch({});
    const client = await connect();

    await client.callTool({
      name: "get_symbols",
      arguments: { symbol: "btc_usdt" },
    });

    expect(requestedUrl(fetchMock).pathname).toBe("/markets/BTC_USDT");
  });

  it("get_currencies returns all currencies by default", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect();

    await client.callTool({ name: "get_currencies", arguments: {} });

    expect(requestedUrl(fetchMock).pathname).toBe("/currencies");
  });

  it("get_currencies targets a single normalized currency", async () => {
    const fetchMock = stubFetch({});
    const client = await connect();

    await client.callTool({
      name: "get_currencies",
      arguments: { currency: "usdt" },
    });

    expect(requestedUrl(fetchMock).pathname).toBe("/currencies/USDT");
  });

  it("get_currencies forwards includeMultiChainCurrencies", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect();

    await client.callTool({
      name: "get_currencies",
      arguments: { includeMultiChainCurrencies: true },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/currencies");
    expect(url.searchParams.get("includeMultiChainCurrencies")).toBe("true");
  });

  it("get_currencies uses the v2 endpoint when v2 is set", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect();

    await client.callTool({
      name: "get_currencies",
      arguments: { v2: true, currency: "usdt" },
    });

    expect(requestedUrl(fetchMock).pathname).toBe("/v2/currencies/USDT");
  });

  it("get_timestamp targets the timestamp endpoint", async () => {
    const fetchMock = stubFetch({ serverTime: 1 });
    const client = await connect();

    await client.callTool({ name: "get_timestamp", arguments: {} });

    expect(requestedUrl(fetchMock).pathname).toBe("/timestamp");
  });

  it("get_price returns all prices by default", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect();

    await client.callTool({ name: "get_price", arguments: {} });

    expect(requestedUrl(fetchMock).pathname).toBe("/markets/price");
  });

  it("get_price targets a single normalized symbol", async () => {
    const fetchMock = stubFetch({});
    const client = await connect();

    await client.callTool({
      name: "get_price",
      arguments: { symbol: "btc_usdt" },
    });

    expect(requestedUrl(fetchMock).pathname).toBe("/markets/BTC_USDT/price");
  });

  it("get_mark_price targets a single normalized symbol", async () => {
    const fetchMock = stubFetch({});
    const client = await connect();

    await client.callTool({
      name: "get_mark_price",
      arguments: { symbol: "btc_usdt" },
    });

    expect(requestedUrl(fetchMock).pathname).toBe(
      "/markets/BTC_USDT/markPrice",
    );
  });

  it("get_mark_price_components targets the components endpoint", async () => {
    const fetchMock = stubFetch({});
    const client = await connect();

    await client.callTool({
      name: "get_mark_price_components",
      arguments: { symbol: "btc_usdt" },
    });

    expect(requestedUrl(fetchMock).pathname).toBe(
      "/markets/BTC_USDT/markPriceComponents",
    );
  });

  it("get_candles forwards interval and pagination params", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect();

    await client.callTool({
      name: "get_candles",
      arguments: {
        symbol: "btc_usdt",
        interval: "HOUR_1",
        limit: 200,
        startTime: 1000,
        endTime: 2000,
      },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/markets/BTC_USDT/candles");
    expect(url.searchParams.get("interval")).toBe("HOUR_1");
    expect(url.searchParams.get("limit")).toBe("200");
    expect(url.searchParams.get("startTime")).toBe("1000");
    expect(url.searchParams.get("endTime")).toBe("2000");
  });

  it("get_candles rejects an unknown interval", async () => {
    const client = await connect();

    const result = await client.callTool({
      name: "get_candles",
      arguments: { symbol: "BTC_USDT", interval: "MINUTE_2" },
    });

    expect(result.isError).toBe(true);
  });

  it("get_market_trades forwards the limit", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect();

    await client.callTool({
      name: "get_market_trades",
      arguments: { symbol: "btc_usdt", limit: 25 },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/markets/BTC_USDT/trades");
    expect(url.searchParams.get("limit")).toBe("25");
  });

  it("get_collateral_info returns all currencies by default", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect();

    await client.callTool({ name: "get_collateral_info", arguments: {} });

    expect(requestedUrl(fetchMock).pathname).toBe("/markets/collateralInfo");
  });

  it("get_collateral_info targets a single normalized currency", async () => {
    const fetchMock = stubFetch({});
    const client = await connect();

    await client.callTool({
      name: "get_collateral_info",
      arguments: { currency: "btc" },
    });

    expect(requestedUrl(fetchMock).pathname).toBe(
      "/markets/BTC/collateralInfo",
    );
  });

  it("get_borrow_rates_info targets the borrow rates endpoint", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect();

    const result = await client.callTool({
      name: "get_borrow_rates_info",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as TextContent;
    expect(content[0]?.text).toBeDefined();
    expect(requestedUrl(fetchMock).pathname).toBe("/markets/borrowRatesInfo");
  });
});
