import crypto from "node:crypto";

/**
 * Poloniex (api.poloniex.com) request signing.
 *
 * Requests are signed with HMAC-SHA256 and the digest is base64-encoded. The
 * signature payload is:
 *
 *     METHOD + "\n" + requestPath + "\n" + <params sorted by key, url-encoded>
 *
 * where the param set always includes `signTimestamp` (ms). Required headers:
 * `key`, `signature`, `signTimestamp`.
 */

export interface AuthHeaders {
  key: string;
  signature: string;
  signTimestamp: string;
  "Content-Type": string;
  [header: string]: string;
}

/** Compose the deterministic signature payload. */
export function buildSignaturePayload(
  method: string,
  path: string,
  params: Record<string, string | number>,
): string {
  const encoded = Object.keys(params)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(String(params[key]))}`)
    .join("&");
  return `${method}\n${path}\n${encoded}`;
}

/** HMAC-SHA256 sign a payload with the API secret, base64-encoded. */
export function signPayload(apiSecret: string, payload: string): string {
  return crypto
    .createHmac("sha256", apiSecret)
    .update(payload)
    .digest("base64");
}

export interface BuildAuthHeadersOptions {
  apiKey: string;
  apiSecret: string;
  method: string;
  path: string;
  query?: Record<string, string | number>;
  /** Injectable clock for deterministic testing. Defaults to `Date.now`. */
  now?: () => number;
}

/** Build the full set of authentication headers for a signed request. */
export function buildAuthHeaders(
  options: BuildAuthHeadersOptions,
): AuthHeaders {
  const {
    apiKey,
    apiSecret,
    method,
    path,
    query = {},
    now = Date.now,
  } = options;

  const signTimestamp = String(now());
  const params = { ...query, signTimestamp };
  const payload = buildSignaturePayload(method, path, params);

  return {
    key: apiKey,
    signature: signPayload(apiSecret, payload),
    signTimestamp,
    "Content-Type": "application/json",
  };
}
