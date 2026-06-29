/**
 * AppShell. The persistent chrome around the route content.
 * Architecture §15.1, §14.6.7 Guardrail 2 (reconnecting toast slot).
 *
 * Caffeine-styled top-bar header: logo + Plans nav + theme toggle + user chip.
 * The body below is whatever the route renders.
 */
import { Link, useLocation } from 'react-router';
import { LogOut, User as UserIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { useSession, supabase } from '../lib/supabase.js';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Logo } from './logo.js';
import { ThemeToggle } from './theme-toggle.js';
import { cn } from '@/lib/utils';

export const AppShell = ({ children }: { children: ReactNode }) => {
  const session = useSession();
  const location = useLocation();
  const initials =
    session.user?.displayName?.slice(0, 2).toUpperCase() ??
    session.user?.email?.slice(0, 2).toUpperCase() ??
    'AN';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-6 border-b bg-card/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <Link to="/plan" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo className="text-primary" />
          <span className="text-base">XIVMitPlan</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            to="/plan"
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              location.pathname.startsWith('/plan') && 'bg-muted text-foreground',
            )}
          >
            Plans
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {session.loading ? (
            <div
              className="size-8 animate-pulse rounded-full bg-muted"
              aria-label="Loading session"
            />
          ) : session.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  aria-label="Account menu"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="text-sm font-medium">
                    {session.user.displayName ?? 'Signed in'}
                  </span>
                  <span className="text-xs text-muted-foreground">{session.user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await supabase.auth.signOut();
                  }}
                >
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link to="/login">
                <UserIcon /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
};