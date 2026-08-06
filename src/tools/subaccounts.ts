import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PoloniexClient } from "../poloniex/client.js";
import {
  toToolResult,
  normalizeCurrency,
  buildSubaccountTransferQuery,
  ACCOUNT_TYPES,
  MAX_SUBACCOUNT_TRANSFER_LIMIT,
} from "./shared.js";

const AUTH_NOTE =
  "Requires POLONIEX_API_KEY and POLONIEX_API_SECRET in the environment.";

const PRIMARY_NOTE = "Only functional for a primary account.";

/** Zod schema for a SPOT/FUTURES account-type filter. */
const accountTypeSchema = z
  .enum(ACCOUNT_TYPES)
  .optional()
  .describe("Account type filter: SPOT or FUTURES.");

/** Register authenticated subaccount read tools. Require API credentials. */
export function registerSubaccountsTools(
  server: McpServer,
  client: PoloniexClient,
): void {
  server.registerTool(
    "get_subaccounts",
    {
      title: "Get Subaccounts",
      description:
        "Fetch all accounts within the caller's account group (primary and " +
        "subaccounts). " +
        PRIMARY_NOTE +
        " " +
        AUTH_NOTE,
      inputSchema: {},
    },
    async () => toToolResult(() => client.signedGet("/subaccounts")),
  );

  server.registerTool(
    "get_subaccount_balances",
    {
      title: "Get Subaccount Balances",
      description:
        "Fetch balances by currency and account type (SPOT and FUTURES) for " +
        "each account in the account group. " +
        PRIMARY_NOTE +
        " " +
        AUTH_NOTE,
      inputSchema: {},
    },
    async () => toToolResult(() => client.signedGet("/subaccounts/balances")),
  );

  server.registerTool(
    "get_subaccount_transfer_records",
    {
      title: "Get Subaccount Transfer Records",
      description:
        "Fetch transfer records among accounts in the account group, with " +
        "optional filters. Max interval between startTime and endTime is 6 " +
        "months; without them, the last 7 days are returned. " +
        AUTH_NOTE,
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_SUBACCOUNT_TRANSFER_LIMIT)
          .optional()
          .describe("Number of records to return (default 100, max 1000)."),
        from: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Transfer id to start the query from (default 0)."),
        direction: z
          .enum(["PRE", "NEXT"])
          .optional()
          .describe("Pagination direction relative to `from` (default NEXT)."),
        currency: z
          .string()
          .optional()
          .describe('Filter by currency, e.g. "USDT". Omit for all.'),
        fromAccountId: z
          .string()
          .optional()
          .describe("External UID of the source account."),
        fromAccountType: accountTypeSchema,
        toAccountId: z
          .string()
          .optional()
          .describe("External UID of the destination account."),
        toAccountType: accountTypeSchema,
        startTime: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Start time in epoch milliseconds."),
        endTime: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("End time in epoch milliseconds."),
      },
    },
    async ({
      limit,
      from,
      direction,
      currency,
      fromAccountId,
      fromAccountType,
      toAccountId,
      toAccountType,
      startTime,
      endTime,
    }) =>
      toToolResult(() =>
        client.signedGet(
          "/subaccounts/transfer",
          buildSubaccountTransferQuery({
            limit,
            from,
            direction,
            currency: currency ? normalizeCurrency(currency) : undefined,
            fromAccountId,
            fromAccountType,
            toAccountId,
            toAccountType,
            startTime,
            endTime,
          }),
        ),
      ),
  );
}
