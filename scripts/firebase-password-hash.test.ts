import { describe, expect, it } from 'vitest';
import {
  buildFirebaseScryptHash,
  canonicalizeBase64,
  inspectFirebasePasswordUsers,
  validateFirebaseHashConfig,
} from './firebase-password-hash.mjs';

const config = {
  base64_signer_key: 'c2lnbmVyLWtleQ==',
  base64_salt_separator: 'Bw==',
  rounds: 8,
  mem_cost: 14,
};

describe('Firebase password hash migration helpers', () => {
  it('canonicalizes URL-safe Base64 with padding', () => {
    expect(canonicalizeBase64('YWJjZA-_', 'value')).toBe('YWJjZA+/');
    expect(canonicalizeBase64('YWJjZA', 'value')).toBe('YWJjZA==');
  });

  it('builds the Supabase Firebase Scrypt hash format', () => {
    expect(buildFirebaseScryptHash({
      passwordSalt: 'c2FsdA==',
      passwordHash: 'aGFzaA==',
    }, config)).toBe(
      '$fbscrypt$v=1,n=14,r=8,p=1,ss=Bw==,sk=c2lnbmVyLWtleQ==$c2FsdA==$aGFzaA=='
    );
  });

  it('accepts the Firebase CLI export salt field', () => {
    expect(buildFirebaseScryptHash({
      salt: 'c2FsdA==',
      passwordHash: 'aGFzaA==',
    }, config)).toContain('$c2FsdA==$aGFzaA==');
  });

  it('rejects malformed or incomplete hash material', () => {
    expect(() => validateFirebaseHashConfig({ ...config, rounds: 0 })).toThrow(/rounds/);
    expect(() => buildFirebaseScryptHash({ passwordHash: 'aGFzaA==' }, config)).toThrow(/salt/);
    expect(() => canonicalizeBase64('not base64!', 'value')).toThrow(/invalid/);
  });

  it('reports counts without exposing hash material', () => {
    const report = inspectFirebasePasswordUsers([
      { passwordSalt: 'c2FsdA==', passwordHash: 'aGFzaA==' },
      { passwordSalt: '', passwordHash: 'aGFzaA==' },
      { email: 'oauth-only@example.com' },
    ], config);

    expect(report).toEqual({
      passwordUsers: 2,
      validPasswordHashes: 1,
      invalidPasswordHashes: 1,
      passwordHashConfigProvided: true,
    });
  });
});
