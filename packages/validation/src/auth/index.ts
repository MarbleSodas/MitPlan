import { z } from 'zod';

/**
 * Sign-in intent. The three-provider matrix from §7.7.1.
 * - `discord` | `google` → OAuth flow
 * - `email` → email + password (tertiary)
 * - `magic_link` → email OTP (tertiary alternative)
 */
export const SignInIntent = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('discord'), next: z.string().optional() }),
  z.object({ provider: z.literal('google'), next: z.string().optional() }),
  z.object({
    provider: z.literal('email'),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    next: z.string().optional(),
  }),
  z.object({
    provider: z.literal('magic_link'),
    email: z.string().email(),
    next: z.string().optional(),
  }),
]);
export type SignInIntent = z.infer<typeof SignInIntent>;

/** Profile row (§17.5). Denormalized cache of `auth.identities`. */
export const Profile = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(64),
  discordId: z.string().nullable(),
  googleId: z.string().nullable(),
  email: z.string().email().nullable(),
  emailVerifiedAt: z.string().datetime().nullable(),
  mitplanV1ClaimDone: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Profile = z.infer<typeof Profile>;

/** Account-link candidate lookup. The merge is a separate transaction. */
export const AccountLinkEligibleRequest = z.object({
  currentUserId: z.string().uuid(),
  email: z.string().email(),
  provider: z.enum(['discord', 'google', 'email', 'magic_link']),
});
export type AccountLinkEligibleRequest = z.infer<typeof AccountLinkEligibleRequest>;

export const AccountLinkEligibleResponse = z.object({
  candidateUserId: z.string().uuid().nullable(),
});
export type AccountLinkEligibleResponse = z.infer<typeof AccountLinkEligibleResponse>;

/** Share-link token claims (§7.7.5). */
export const ShareTokenClaims = z.object({
  sub: z.string().uuid(),
  plan_id: z.string().uuid(),
  plan_access: z.enum(['read', 'edit']),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
});
export type ShareTokenClaims = z.infer<typeof ShareTokenClaims>;
