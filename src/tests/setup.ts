import { vi } from 'vitest'

// Mock Firebase
vi.mock('../config/firebase', () => ({
  database: {},
  auth: {},
  app: {}
}))

// Mock environment variables
process.env.VITE_FIREBASE_API_KEY = 'test-api-key'
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com'
process.env.VITE_FIREBASE_DATABASE_URL = 'https://test.firebaseio.com'
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project'
process.env.VITE_FIREBASE_STORAGE_BUCKET = 'test.appspot.com'
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = '123456789'
process.env.VITE_FIREBASE_APP_ID = 'test-app-id'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
