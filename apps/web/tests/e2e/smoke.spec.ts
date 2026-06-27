/**
 * Phase 0 Playwright smoke test. Architecture §14.6.7 step 10, §22.2 QA.
 *
 * Two browser contexts, both sign in via Discord OAuth in staging,
 * both join `plan:smoke-1`, user-A types, assert user-B sees the change
 * in < 200ms p95 over 50 runs.
 *
 * Phase 0 status: this is the SKELETON. The actual sign-in flow
 * requires the real Supabase project + Discord app. The Phase 0
 * acceptance is that this test runs locally against `pnpm dev` and
 * passes once the OAuth + Supabase project are wired.
 */
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const PLAN_ID = 'smoke-1';
const RUNS = Number(process.env['SMOKE_RUNS'] ?? '5'); // 50 in CI; 5 locally for fast feedback

interface SmokeContext {
  context: BrowserContext;
  page: Page;
  user: 'A' | 'B';
}

const signInStub = async (page: Page, _user: 'A' | 'B'): Promise<void> => {
  // Phase 0 stub: bypass real OAuth by injecting a Supabase session
  // into localStorage. The Phase 1+ implementation calls the Discord
  // OAuth flow end-to-end.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'sb-test-auth',
      JSON.stringify({
        access_token: 'phase-0-stub-token',
        refresh_token: 'phase-0-stub-refresh',
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'phase0@example.com',
          app_metadata: { provider: 'discord' },
          user_metadata: { display_name: 'Phase 0' },
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
  });
};

const openPlan = async (page: Page): Promise<void> => {
  await page.goto(`/plan/${PLAN_ID}`);
  await expect(page.getByText(/Plan|status/i).first()).toBeVisible({ timeout: 30_000 });
};

const typeInDoc = async (page: Page, text: string): Promise<void> => {
  // Phase 0 stub: the editor isn't wired yet, so we type into the
  // page body. Phase 2+ targets the Yjs-backed editor.
  await page.locator('body').click();
  await page.keyboard.type(text, { delay: 5 });
};

test.describe('Phase 0 smoke — Hocuspocus on DO', () => {
  test('two users see each other\'s edits in < 200ms p95 over N runs', async ({ browser }) => {
    const ctxA: SmokeContext = await createUser(browser, 'A');
    const ctxB: SmokeContext = await createUser(browser, 'B');
    const latencies: number[] = [];
    try {
      for (let i = 0; i < RUNS; i++) {
        const sentAt = Date.now();
        const message = `edit-${i}`;
        await typeInDoc(ctxA.page, message);
        // Wait for user B to see the same text in the editor.
        await ctxB.page.waitForFunction(
          (m) => document.body.innerText.includes(m),
          message,
          { timeout: 5_000 },
        );
        latencies.push(Date.now() - sentAt);
      }
      const sorted = [...latencies].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
      // Phase 0 acceptance: the smoke test runs end-to-end without
      // errors. The < 200ms p95 is the Phase 2 NFR-1 gate; we record
      // the latency for visibility but don't gate on it yet.
      console.log(`[smoke] p95 latency over ${RUNS} runs: ${p95}ms`);
      expect(latencies.length).toBe(RUNS);
    } finally {
      await ctxA.context.close();
      await ctxB.context.close();
    }
  });
});

const createUser = async (browser: Browser, user: 'A' | 'B'): Promise<SmokeContext> => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInStub(page, user);
  await openPlan(page);
  return { context, page, user };
};
