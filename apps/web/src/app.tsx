/**
 * App shell. The router. Architecture §15.1, §15.4.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppShell } from './components/app-shell.js';
import { LearnIndex } from './routes/learn.index.js';
import { LearnEncounter } from './routes/learn.$encounterId.js';
import { PlanIndex } from './routes/plan.index.js';
import { PlanEditor } from './routes/plan.$planId.js';
import { AuthCallback } from './routes/auth.callback.js';
import { LoginPage } from './routes/login.js';
import { ReconnectingToast } from './components/reconnecting-toast.js';

export const App = () => (
  <BrowserRouter>
    <AppShell>
      <ReconnectingToast />
      <Routes>
        <Route path="/" element={<Navigate to="/learn" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/learn" element={<LearnIndex />} />
        <Route path="/learn/:encounterId" element={<LearnEncounter />} />
        <Route path="/plan" element={<PlanIndex />} />
        <Route path="/plan/:planId" element={<PlanEditor />} />
        <Route path="*" element={<Navigate to="/learn" replace />} />
      </Routes>
    </AppShell>
  </BrowserRouter>
);
