/**
 * App entry. React 19 + React Router 7 (file-based routes, manually
 * configured in `src/routes.tsx` for now; the file-based route
 * convention in architecture §15.4 is wired in Phase 1+).
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app.js';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html');
}
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
