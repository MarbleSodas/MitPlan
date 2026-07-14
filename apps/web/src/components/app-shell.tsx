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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const GitHubMark = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49v-1.88c-2.78.62-3.37-1.22-3.37-1.22-.46-1.2-1.11-1.52-1.11-1.52-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.85.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.05 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.27 9.27 0 0 1 12 6.72c.85 0 1.71.12 2.51.35 1.91-1.33 2.74-1.05 2.74-1.05.56 1.42.21 2.47.11 2.73.64.72 1.03 1.63 1.03 2.75 0 3.92-2.35 4.79-4.58 5.04.36.32.68.94.68 1.9v2.82c0 .27.18.6.69.49A10.23 10.23 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
  </svg>
);

const KoFiMark = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M11.351 2.715c-2.7 0-4.986.025-6.83.26C2.078 3.285 0 5.154 0 8.61c0 3.506.182 6.13 1.585 8.493 1.584 2.701 4.233 4.182 7.662 4.182h.83c4.209 0 6.494-2.234 7.637-4a9.5 9.5 0 0 0 1.091-2.338C21.792 14.688 24 12.22 24 9.208v-.415c0-3.247-2.13-5.507-5.792-5.87-1.558-.156-2.65-.208-6.857-.208m0 1.947c4.208 0 5.09.052 6.571.182 2.624.311 4.13 1.584 4.13 4v.39c0 2.156-1.792 3.844-3.87 3.844h-.935l-.156.649c-.208 1.013-.597 1.818-1.039 2.546-.909 1.428-2.545 3.064-5.922 3.064h-.805c-2.571 0-4.831-.883-6.078-3.195-1.09-2-1.298-4.155-1.298-7.506 0-2.181.857-3.402 3.012-3.714 1.533-.233 3.559-.26 6.39-.26m6.547 2.287c-.416 0-.65.234-.65.546v2.935c0 .311.234.545.65.545 1.324 0 2.051-.754 2.051-2s-.727-2.026-2.052-2.026m-10.39.182c-1.818 0-3.013 1.48-3.013 3.142 0 1.533.858 2.857 1.949 3.897.727.701 1.87 1.429 2.649 1.896a1.47 1.47 0 0 0 1.507 0c.78-.467 1.922-1.195 2.623-1.896 1.117-1.039 1.974-2.364 1.974-3.897 0-1.662-1.247-3.142-3.039-3.142-1.065 0-1.792.545-2.338 1.298-.493-.753-1.246-1.298-2.312-1.298" />
  </svg>
);

const DiscordMark = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>
);

export const AppShell = ({ children }: { children: ReactNode }) => {
  const session = useSession();
  const location = useLocation();
  const initials =
    session.user?.displayName?.slice(0, 2).toUpperCase() ??
    session.user?.email?.slice(0, 2).toUpperCase() ??
    'AN';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:gap-6 sm:px-6">
        <Link
          to={session.user ? '/plan' : '/'}
          className="flex items-center gap-2 font-semibold tracking-tight"
          aria-label="XIVMitPlan home"
        >
          <Logo className="text-primary" aria-hidden />
          <span className="hidden sm:inline text-base">XIVMitPlan</span>
        </Link>
        {session.user && (
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            <Link
              to="/plan"
              className={cn(
                'rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-primary/50 focus-visible:outline-none focus-visible:ring-2',
                location.pathname.startsWith('/plan') && 'bg-muted text-foreground',
              )}
            >
              Plans
            </Link>
            <Link
              to="/timeline"
              className={cn(
                'rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-primary/50 focus-visible:outline-none focus-visible:ring-2',
                location.pathname.startsWith('/timeline') && 'bg-muted text-foreground',
              )}
            >
              Timelines
            </Link>
          </nav>
        )}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 sm:size-9" asChild>
                <a
                  href="https://ko-fi.com/xivmitplan"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Donate on Ko-fi"
                >
                  <KoFiMark />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Donate</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 sm:size-9" asChild>
                <a
                  href="https://discord.gg/xivmitplan"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join the Discord server"
                >
                  <DiscordMark />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Discord</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 sm:size-9" asChild>
                <a
                  href="https://github.com/MarbleSodas/MitPlan"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View the project on GitHub"
                >
                  <GitHubMark />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>GitHub</TooltipContent>
          </Tooltip>
          <ThemeToggle />
          {session.loading ? (
            <div
              className="size-8 animate-pulse rounded-full bg-muted"
              role="status"
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
                  onSelect={async () => {
                    await supabase.auth.signOut();
                  }}
                >
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">
                <UserIcon className="size-4" /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card/40 px-4 py-4 sm:px-6">
        <div className="text-muted-foreground flex flex-col items-start justify-between gap-3 text-xs sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <a
              href="https://ko-fi.com/xivmitplan"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors focus-visible:ring-primary/50 rounded-sm focus-visible:outline-none focus-visible:ring-2"
            >
              Ko-fi
            </a>
            <span aria-hidden>·</span>
            <a
              href="https://discord.gg/xivmitplan"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors focus-visible:ring-primary/50 rounded-sm focus-visible:outline-none focus-visible:ring-2"
            >
              Discord
            </a>
            <span aria-hidden>·</span>
            <a
              href="https://github.com/MarbleSodas/MitPlan"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors focus-visible:ring-primary/50 rounded-sm focus-visible:outline-none focus-visible:ring-2"
            >
              GitHub
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              to="/data-policy"
              className="hover:text-foreground transition-colors focus-visible:ring-primary/50 rounded-sm focus-visible:outline-none focus-visible:ring-2"
            >
              Data policy
            </Link>
            <span aria-hidden>·</span>
            <span>Built for FFXIV raiders. Not affiliated with Square Enix.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
