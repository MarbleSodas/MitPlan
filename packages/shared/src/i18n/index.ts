/**
 * Stub i18n entry point. Real implementation in v1.1+. See architecture §8.2.
 */
export const t = (key: string, params?: Record<string, string | number>): string => {
  if (!params) return key;
  return key.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
};
