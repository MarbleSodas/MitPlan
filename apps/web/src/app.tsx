/**
 * App shell. The router. Architecture §15.1, §15.4.
 *
 * Provider order (outer → inner):
 *   1. ThemeProvider — sets `.dark` on <html> via next-themes
 *   2. TooltipProvider — required by shadcn tooltip
 *   3. AppToaster — Sonner viewport for the reconnect toast + any future toasts
 *   4. AppShell — top-bar chrome around the route content
 *   5. Routes — the actual page content
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ThemeProvider } from './components/theme-provider.js';
import { AppToaster } from './components/toaster.js';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from './components/app-shell.js';
import { LandingPage } from './routes/landing.js';
import { PlanIndex } from './routes/plan.index.js';
import { PlanEditor } from './routes/plan.$planId.js';
import { PlanTimelineEditor } from './routes/plan.$planId.timeline.js';
import { AuthCallback } from './routes/auth.callback.js';
import { LoginPage } from './routes/login.js';
import { DataPolicyPage } from './routes/data-policy.js';
import { TimelineIndex } from './routes/timeline.index.js';
import { RequireAuth } from './components/require-auth.js';

export const App = () => (
  <ThemeProvider>
    <TooltipProvider>
      <BrowserRouter>
        <AppShell>
          <AppToaster />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/plan"
              element={
                <RequireAuth>
                  <PlanIndex />
                </RequireAuth>
              }
            />
            <Route
              path="/timeline"
              element={
                <RequireAuth>
                  <TimelineIndex />
                </RequireAuth>
              }
            />
            <Route
              path="/timeline/browse"
              element={
                <RequireAuth>
                  <TimelineIndex />
                </RequireAuth>
              }
            />
            <Route
              path="/plan/:planId"
              element={
                <RequireAuth>
                  <PlanEditor />
                </RequireAuth>
              }
            />
            <Route
              path="/plan/:planId/timeline"
              element={
                <RequireAuth>
                  <PlanTimelineEditor />
                </RequireAuth>
              }
            />
            <Route path="/data-policy" element={<DataPolicyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);
