import { describe, it, expect, vi, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server";
import { loadConfig } from "../src/config";

type TextContent = Array<{ type: string; text: string }>;

const AUTH_ENV = {
  POLONIEX_API_KEY: "test-key",
  POLONIEX_API_SECRET: "test-secret",
};

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

/** Stub fetch with a 200 JSON response and return the mock for assertions. */
function stubFetch(body: unknown = {}): ReturnType<typeof vi.fn> {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestedUrl(fetchMock: ReturnType<typeof vi.fn>): URL {
  return fetchMock.mock.calls[0]?.[0] as URL;
}

function requestHeaders(
  fetchMock: ReturnType<typeof vi.fn>,
): Record<string, string> {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
  return init.headers as Record<string, string>;
}

describe("authenticated margin tools", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get_account_margin defaults accountType to SPOT and signs the request", async () => {
    const fetchMock = stubFetch({});
    const client = await connect(AUTH_ENV);

    const result = await client.callTool({
      name: "get_account_margin",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/margin/accountMargin");
    expect(url.searchParams.get("accountType")).toBe("SPOT");
    expect(requestHeaders(fetchMock).key).toBe("test-key");
  });

  it("get_account_margin normalizes a supplied accountType", async () => {
    const fetchMock = stubFetch({});
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_account_margin",
      arguments: { accountType: "spot" },
    });

    expect(requestedUrl(fetchMock).searchParams.get("accountType")).toBe(
      "SPOT",
    );
  });

  it("get_account_margin errors without credentials", async () => {
    const client = await connect({});
    const result = await client.callTool({
      name: "get_account_margin",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const content = result.content as TextContent;
    expect(content[0]?.text).toMatch(/Missing credentials/);
  });

  it("get_borrow_status normalizes currency and signs the request", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_borrow_status",
      arguments: { currency: "usdt" },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/margin/borrowStatus");
    expect(url.searchParams.get("currency")).toBe("USDT");
  });

  it("get_borrow_status omits currency when none is given", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({ name: "get_borrow_status", arguments: {} });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/margin/borrowStatus");
    expect(url.searchParams.get("currency")).toBeNull();
  });

  it("get_max_size normalizes the symbol and signs the request", async () => {
    const fetchMock = stubFetch({});
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_max_size",
      arguments: { symbol: "btc_usdt" },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/margin/maxSize");
    expect(url.searchParams.get("symbol")).toBe("BTC_USDT");
  });

  it("get_max_size requires a symbol", async () => {
    const client = await connect(AUTH_ENV);

    const result = await client.callTool({
      name: "get_max_size",
      arguments: {},
    });

    expect(result.isError).toBe(true);
  });
});

describe("authenticated subaccount tools", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get_subaccounts signs a request to /subaccounts", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    const result = await client.callTool({
      name: "get_subaccounts",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    expect(requestedUrl(fetchMock).pathname).toBe("/subaccounts");
    expect(requestHeaders(fetchMock).key).toBe("test-key");
  });

  it("get_subaccount_balances signs a request to /subaccounts/balances", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({ name: "get_subaccount_balances", arguments: {} });

    expect(requestedUrl(fetchMock).pathname).toBe("/subaccounts/balances");
  });

  it("get_subaccount_transfer_records forwards account filters and normalizes currency", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_subaccount_transfer_records",
      arguments: {
        limit: 50,
        from: 10,
        direction: "PRE",
        currency: "usdt",
        fromAccountId: "123",
        fromAccountType: "SPOT",
        toAccountId: "456",
        toAccountType: "FUTURES",
        startTime: 100,
        endTime: 200,
      },
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/subaccounts/transfer");
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("from")).toBe("10");
    expect(url.searchParams.get("direction")).toBe("PRE");
    expect(url.searchParams.get("currency")).toBe("USDT");
    expect(url.searchParams.get("fromAccountId")).toBe("123");
    expect(url.searchParams.get("fromAccountType")).toBe("SPOT");
    expect(url.searchParams.get("toAccountId")).toBe("456");
    expect(url.searchParams.get("toAccountType")).toBe("FUTURES");
    expect(url.searchParams.get("startTime")).toBe("100");
    expect(url.searchParams.get("endTime")).toBe("200");
  });

  it("get_subaccount_transfer_records omits params that were not supplied", async () => {
    const fetchMock = stubFetch([]);
    const client = await connect(AUTH_ENV);

    await client.callTool({
      name: "get_subaccount_transfer_records",
      arguments: {},
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/subaccounts/transfer");
    expect([...url.searchParams.keys()]).toEqual([]);
  });

  it("get_subaccount_transfer_records rejects an unknown account type", async () => {
    const client = await connect(AUTH_ENV);

    const result = await client.callTool({
      name: "get_subaccount_transfer_records",
      arguments: { fromAccountType: "MARGIN" },
    });

    expect(result.isError).toBe(true);
  });
});
