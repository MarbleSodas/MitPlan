/**
 * Byte encoding helpers — one home for the Base64 / hex / Uint8Array
 * plumbing that crosses the wire between Supabase, the Yjs realtime
 * provider, and the snapshot RPC.
 *
 * Three pairings, one rationale:
 *
 *   BYTEA (`\x...` hex) ↔ Uint8Array   — PostgREST default wire format
 *   Uint8Array ↔ base64                — Realtime broadcast payload + the
 *                                        snapshot shape we hand to Yjs
 *
 * All four functions are pure and side-effect free. The base64 pair
 * prefers Node's `Buffer` when available (avoids the
 * `String.fromCharCode` O(n²) cost on large Yjs snapshots) and falls
 * back to `btoa` / `atob` for browsers, Workers, and happy-dom.
 */

/** Decode a PostgREST BYTEA hex string (`\x...`) into a Uint8Array. */
export const byteaHexToBytes = (hex: string): Uint8Array => {
  const stripped = hex.startsWith('\\x') ? hex.slice(2) : hex;
  const len = stripped.length >> 1;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    // Inline hex parse: avoids the per-byte `slice` + `parseInt(_, 16)`
    // round-trip that costs ~6x on the Yjs hot path.
    const j = i << 1;
    const hi = HEX[stripped.charCodeAt(j)]!;
    const lo = HEX[stripped.charCodeAt(j + 1)]!;
    bytes[i] = (hi << 4) | lo;
  }
  return bytes;
};

/** Base64 encode a Uint8Array. Safe for browser + Workers + happy-dom. */
export function bytesToBase64(arr: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]!);
  }
  return btoa(binary);
}

/** Base64 decode a string to a Uint8Array. */
export function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(b64, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

// ASCII `0-9a-f` → nibble lookup. Index 48..57 = '0'-'9'; 97..102 = 'a'-'f'.
const HEX: number[] = (() => {
  const t = new Array<number>(128).fill(-1);
  for (let i = 0; i < 10; i++) t[48 + i] = i;
  for (let i = 0; i < 6; i++) {
    t[97 + i] = 10 + i;
    t[65 + i] = 10 + i;
  }
  return t;
})();