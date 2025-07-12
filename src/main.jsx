import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App.jsx';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Create root and render app
const container = document.getElementById('root')
const root = createRoot(container)

// Add error handling for the root
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error)
})

// Render the app
root.render(
  <React.StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
)
