/**
 * SDK + API version constants.
 *
 * `API_VERSION` is the date-stamped Scan & Pay API contract this SDK
 * targets. Sent on every outbound request as `Scanpay-Version` so the
 * backend can pin behaviour for older SDKs once the contract evolves.
 * Forward-compat: today the backend logs the header and otherwise
 * ignores it.
 *
 * `SDK_VERSION` mirrors `package.json` and is sent as `X-Scanpay-Sdk`
 * (e.g. `scanandpay-node/0.3.0`) for support correlation.
 */
export const API_VERSION = '2026-05-07';
export const SDK_VERSION = '0.3.1';
export const SDK_USER_AGENT = `scanandpay-node/${SDK_VERSION}`;
