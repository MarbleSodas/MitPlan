import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App.jsx';
import { AppProvider } from './contexts';
import { TankSelectionModalProvider } from './contexts/TankSelectionModalContext';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { checkForUpdates } from './utils';

// Create root and render app
const container = document.getElementById('root')
const root = createRoot(container)

// Add error handling for the root
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error)
})

// Check for updates - this will refresh the page if a new version is detected
checkForUpdates()

// Render the app
root.render(
  <React.StrictMode>
    <AppProvider>
      <TankSelectionModalProvider>
        <App />
        <Analytics />
        <SpeedInsights />
      </TankSelectionModalProvider>
    </AppProvider>
  </React.StrictMode>
)
