import type { User } from '@supabase/supabase-js';

export interface AppAuthProvider {
  providerId: 'password' | 'google.com' | string;
}

export interface AppUser extends User {
  uid: string;
  displayName: string | null;
  providerData: AppAuthProvider[];
}

const normalizeProvider = (provider: string): string => {
  if (provider === 'email') return 'password';
  if (provider === 'google') return 'google.com';
  return provider;
};

export const toAppUser = (user: User | null): AppUser | null => {
  if (!user) return null;

  const providers = new Set<string>();
  (user.app_metadata?.providers || []).forEach((provider: string) => {
    providers.add(normalizeProvider(provider));
  });
  (user.identities || []).forEach((identity) => {
    if (identity.provider) providers.add(normalizeProvider(identity.provider));
  });
  if (providers.size === 0 && user.email) providers.add('password');

  const displayName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    null;

  return Object.assign(user, {
    uid: user.id,
    displayName,
    providerData: Array.from(providers, (providerId) => ({ providerId })),
  });
};
