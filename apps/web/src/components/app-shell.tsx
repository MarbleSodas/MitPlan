/**
 * AppShell. The persistent chrome around the route content.
 * Architecture §15.1, §14.6.7 Guardrail 2 (reconnecting toast slot).
 */
import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useSession } from '../lib/supabase.js';

export const AppShell = ({ children }: { children: ReactNode }) => {
  const session = useSession();
  const location = useLocation();
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/learn" className="app-title">
          XIVMitPlan
        </Link>
        <nav className="app-nav">
          <Link to="/learn" className={location.pathname.startsWith('/learn') ? 'active' : ''}>
            Learn
          </Link>
          <Link to="/plan" className={location.pathname.startsWith('/plan') ? 'active' : ''}>
            Plans
          </Link>
        </nav>
        <div className="app-account">
          {session.loading ? (
            <span>…</span>
          ) : session.user ? (
            <span title={session.user.email ?? ''}>{session.user.displayName ?? 'user'}</span>
          ) : (
            <Link to="/login">Sign in</Link>
          )}
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};
