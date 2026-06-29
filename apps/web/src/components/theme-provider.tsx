/**
 * Theme provider. Dark-first default per design decision.
 *
 * Wraps next-themes to apply the `.dark` class on <html>. next-themes
 * persists the choice to localStorage under key `xivmitplan-theme` and
 * respects `prefers-color-scheme` when no stored value exists.
 */
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={false}
    disableTransitionOnChange
    storageKey="xivmitplan-theme"
  >
    {children}
  </NextThemesProvider>
);