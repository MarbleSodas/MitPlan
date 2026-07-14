import {
  base64ToBytes,
  byteaHexToBytes,
  bytesToBase64,
  bytesToByteaHex,
} from './bytes.ts';

const assertBytesEqual = (actual: Uint8Array, expected: Uint8Array): void => {
  if (actual.length !== expected.length || actual.some((byte, i) => byte !== expected[i])) {
    throw new Error(`Expected [${expected}] but received [${actual}]`);
  }
};

Deno.test('round-trips BYTEA and base64 values', () => {
  const original = new Uint8Array([0, 1, 15, 16, 127, 128, 255]);
  const hex = bytesToByteaHex(original);

  if (hex !== '\\x00010f107f80ff') throw new Error(`Unexpected BYTEA value: ${hex}`);
  assertBytesEqual(byteaHexToBytes(hex), original);
  assertBytesEqual(base64ToBytes(bytesToBase64(original)), original);
});

Deno.test('rejects malformed BYTEA hex values', () => {
  for (const value of ['0', '\\x0g']) {
    let rejected = false;
    try {
      byteaHexToBytes(value);
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error(`Expected BYTEA value to be rejected: ${value}`);
  }
});
