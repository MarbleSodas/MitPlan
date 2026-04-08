import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

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

const createStorageMock = () => {
  const storage = new Map<string, string>()

  return {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(String(key), String(value))
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(String(key))
    }),
    clear: vi.fn(() => {
      storage.clear()
    }),
    key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
    get length() {
      return storage.size
    },
  }
}

const resetLocalStorageMock = () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: createStorageMock(),
  })
}

resetLocalStorageMock()

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
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

global.ResizeObserver = MockResizeObserver as typeof ResizeObserver

afterEach(() => {
  cleanup()
  if (typeof globalThis.localStorage?.clear === 'function') {
    globalThis.localStorage.clear()
  }
  resetLocalStorageMock()
})
