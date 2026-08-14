'use client';

import NextLink from 'next/link';
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';
import { useCallback, useEffect, type ComponentProps, type ReactNode } from 'react';

type NavigateOptions = { replace?: boolean };

export const useNavigate = () => {
  const router = useRouter();
  return useCallback((destination: string | number, options: NavigateOptions = {}) => {
    if (typeof destination === 'number') {
      if (destination < 0) router.back();
      else router.forward();
      return;
    }
    if (options.replace) router.replace(destination);
    else router.push(destination);
  }, [router]);
};

export const useParams = <T extends Record<string, string | undefined> = Record<string, string | undefined>>() => {
  const nextParams = useNextParams();
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const derived: Record<string, string | undefined> = {};

  if (segments[0] === 'plan') {
    if (segments[1] === 'view') derived.viewToken = segments[2];
    else if (segments[1] === 'invite') derived.token = segments[2];
    else if (segments[1] === 'create-from-timeline') derived.timelineId = segments[2];
    else if (segments[1] === 'edit' || segments[1] === 'shared') derived.planId = segments[2];
    else derived.planId = segments[1];
  }
  if (segments[0] === 'planner') derived.planId = segments[1];
  if (segments[0] === 'timeline' && ['edit', 'view', 'shared'].includes(segments[1] || '')) {
    derived.timelineId = segments[2];
  }

  return { ...nextParams, ...derived } as T;
};

export const useSearchParams = () => {
  const params = useNextSearchParams();
  const setSearchParams = (next: URLSearchParams | Record<string, string>) => {
    const query = next instanceof URLSearchParams ? next : new URLSearchParams(next);
    window.history.pushState(null, '', `${window.location.pathname}?${query.toString()}`);
  };
  return [params, setSearchParams] as const;
};

export const useLocation = () => {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  const search = searchParams.toString();
  return { pathname, search: search ? `?${search}` : '' };
};

export const Navigate = ({ to, replace = false }: { to: string; replace?: boolean }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, replace, to]);
  return null;
};

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & {
  to: string;
  children: ReactNode;
};

export const Link = ({ to, children, ...props }: LinkProps) => (
  <NextLink href={to} {...props}>{children}</NextLink>
);
