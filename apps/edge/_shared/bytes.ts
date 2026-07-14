/** BYTEA and base64 conversions shared by snapshot Edge Functions. */

export const bytesToByteaHex = (bytes: Uint8Array): string => {
  let hex = "\\x";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
};

export const byteaHexToBytes = (value: string): Uint8Array => {
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  if (hex.length % 2 !== 0) throw new Error("Invalid BYTEA hex value");

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const pair = hex.slice(i * 2, i * 2 + 2);
    if (!/^[0-9a-f]{2}$/i.test(pair)) throw new Error("Invalid BYTEA hex value");
    bytes[i] = Number.parseInt(pair, 16);
  }
  return bytes;
};

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};
