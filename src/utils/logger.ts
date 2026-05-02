type LogMethod = 'debug' | 'info' | 'warn' | 'error';

const isDevLoggingEnabled = () => import.meta.env.DEV;

const log = (method: LogMethod, ...args: unknown[]) => {
  if (!isDevLoggingEnabled() && method !== 'error') {
    return;
  }

  console[method](...args);
};

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
};
