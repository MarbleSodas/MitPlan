import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/global.css'
import App from './App.jsx'

// Function to apply theme based on user preference or system setting
const applyTheme = () => {
  const savedTheme = localStorage.getItem('darkMode');
  if (savedTheme !== null) {
    document.documentElement.setAttribute('data-theme', savedTheme === 'true' ? 'dark' : 'light');
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

// Apply theme immediately
applyTheme();

// Listen for theme changes in localStorage
window.addEventListener('storage', (event) => {
  if (event.key === 'darkMode') {
    applyTheme();
  }
});

// Create root and render app
const container = document.getElementById('root')
const root = createRoot(container)

// Add error handling for the root
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error)
})

// Render the app
root.render(
  <StrictMode>
    <App />
  </StrictMode>
)
