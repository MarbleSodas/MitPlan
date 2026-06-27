/**
 * Supabase JWT verification on the server side. Mirror of the realtime
 * DO's verifySupabaseJwt. Architecture §7.7.5.
 */
import type { Env } from '../env.js';

export interface VerifiedClaims {
  sub: string;
  email?: string;
  aud: string;
  role: string;
  exp: number;
  iat: number;
  session_id?: string;
  plan_id?: string;
  plan_access?: 'read' | 'edit';
}

export const verifySupabaseJwt = async (
  token: string,
  env: Env,
): Promise<VerifiedClaims | null> => {
  if (!token || !env.SUPABASE_JWT_SECRET) return null;
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  const ok = await verifyHS256(headerB64, payloadB64, signatureB64, env.SUPABASE_JWT_SECRET);
  if (!ok) return null;

  let claims: VerifiedClaims;
  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as Record<string, unknown>;
    claims = payload as unknown as VerifiedClaims;
  } catch {
    return null;
  }
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return null;
  if (claims.aud !== 'authenticated') return null;
  if (typeof claims.sub !== 'string') return null;
  return claims;
};

const verifyHS256 = async (
  headerB64: string,
  payloadB64: string,
  signatureB64: string,
  secret: string,
): Promise<boolean> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const signature = base64UrlToBytes(signatureB64);
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  return crypto.subtle.verify('HMAC', key, signature, data);
};

const base64UrlDecode = (s: string): string => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
};

const base64UrlToBytes = (s: string): Uint8Array => {
  const binary = base64UrlDecode(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};
