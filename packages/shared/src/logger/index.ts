/**
 * Logger stub. Real Pino binding lives in the apps. See architecture §7.8.
 * The `shared` package is consumed in the runtime but does not import pino
 * directly to keep the dependency graph small.
 */
import type { Logger as PinoLogger } from 'pino';

export type Logger = PinoLogger;

let _root: Logger | undefined;

/**
 * Set the root logger. Called once from the composition root
 * (`apps/server/src/composition.ts` or `apps/realtime/src/server.ts`).
 */
export const setRootLogger = (l: Logger): void => {
  _root = l;
};

export const logger = (): Logger => {
  if (!_root) {
    // Lazy fallback for early-boot or test environments. In production
    // the composition root sets a real logger before any request arrives.
    return {
      debug: () => undefined,
      info: () => undefined,
      warn: (...args: unknown[]) =>
        console.warn('[xivmitplan:fallback]', ...args),
      error: (...args: unknown[]) =>
        console.error('[xivmitplan:fallback]', ...args),
      fatal: (...args: unknown[]) =>
        console.error('[xivmitplan:fallback]', ...args),
      trace: () => undefined,
      child: () => logger(),
      level: 'silent',
    } as unknown as Logger;
  }
  return _root;
};
