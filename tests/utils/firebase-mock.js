/**
 * Firebase mocking utilities for E2E tests
 */

/**
 * Mock Firebase Auth responses
 */
export const mockAuthResponses = {
  loginSuccess: {
    user: {
      uid: 'test-user-123',
      email: 'test@mitplan.dev',
      displayName: 'Test User',
      emailVerified: true
    },
    success: true
  },
  loginFailure: {
    success: false,
    message: 'Invalid email or password'
  },
  registerSuccess: {
    user: {
      uid: 'new-user-456',
      email: 'newuser@mitplan.dev',
      displayName: 'New Test User',
      emailVerified: false
    },
    success: true
  },
  registerFailure: {
    success: false,
    message: 'Email already in use'
  }
};

/**
 * Mock Firestore responses
 */
export const mockFirestoreResponses = {
  savePlanSuccess: {
    success: true,
    planId: 'test-plan-123',
    message: 'Plan saved successfully'
  },
  savePlanFailure: {
    success: false,
    message: 'Failed to save plan'
  },
  loadPlanSuccess: {
    success: true,
    plan: {
      id: 'test-plan-123',
      name: 'Test Plan',
      bossId: 'ketuduke',
      selectedJobs: {},
      assignments: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  loadPlanFailure: {
    success: false,
    message: 'Plan not found'
  }
};

/**
 * Mock Realtime Database responses for collaboration
 */
export const mockRealtimeResponses = {
  joinSessionSuccess: {
    success: true,
    sessionId: 'session-123',
    users: [
      {
        id: 'user-1',
        displayName: 'Test User 1',
        color: '#ff6b6b'
      }
    ]
  },
  sessionUpdate: {
    type: 'plan_update',
    data: {
      assignments: {},
      selectedJobs: {},
      timestamp: Date.now()
    },
    userId: 'user-2'
  }
};

/**
 * Setup Firebase mocks for a page
 */
export async function setupFirebaseMocks(page) {
  await page.addInitScript(() => {
    // Mock Firebase Auth
    window.mockFirebaseAuth = {
      currentUser: null,
      signInWithEmailAndPassword: async (email, password) => {
        if (email === 'test@mitplan.dev' && password === 'TestPassword123!') {
          return { user: { uid: 'test-user-123', email, displayName: 'Test User' } };
        }
        throw new Error('Invalid credentials');
      },
      createUserWithEmailAndPassword: async (email, password) => {
        return { user: { uid: 'new-user-456', email, displayName: 'New User' } };
      },
      signOut: async () => {
        window.mockFirebaseAuth.currentUser = null;
      },
      onAuthStateChanged: (callback) => {
        // Simulate auth state changes
        setTimeout(() => callback(window.mockFirebaseAuth.currentUser), 100);
      }
    };

    // Mock Firestore
    window.mockFirestore = {
      collection: (name) => ({
        doc: (id) => ({
          set: async (data) => ({ success: true }),
          get: async () => ({
            exists: () => true,
            data: () => ({ id, ...data })
          }),
          update: async (data) => ({ success: true }),
          delete: async () => ({ success: true })
        }),
        add: async (data) => ({ id: 'new-doc-id', ...data }),
        where: () => ({
          get: async () => ({
            docs: []
          })
        })
      })
    };

    // Mock Realtime Database
    window.mockRealtimeDB = {
      ref: (path) => ({
        set: async (data) => ({ success: true }),
        update: async (data) => ({ success: true }),
        on: (event, callback) => {
          // Simulate real-time updates
        },
        off: () => {},
        push: async (data) => ({ key: 'new-key' })
      })
    };
  });
}

/**
 * Mock network failures
 */
export async function mockNetworkFailure(page, pattern = '**/*') {
  await page.route(pattern, route => {
    route.abort('failed');
  });
}

/**
 * Mock slow network responses
 */
export async function mockSlowNetwork(page, delay = 3000) {
  await page.route('**/*', async route => {
    await new Promise(resolve => setTimeout(resolve, delay));
    route.continue();
  });
}

/**
 * Mock authentication errors
 */
export async function mockAuthError(page, errorType = 'invalid-credentials') {
  await page.addInitScript((error) => {
    window.__MOCK_AUTH_ERROR__ = error;
  }, errorType);
}

/**
 * Mock plan data corruption
 */
export async function mockCorruptedPlanData(page) {
  await page.addInitScript(() => {
    window.__MOCK_CORRUPTED_DATA__ = true;
  });
}

/**
 * Reset all mocks
 */
export async function resetMocks(page) {
  await page.addInitScript(() => {
    delete window.__MOCK_AUTH_ERROR__;
    delete window.__MOCK_CORRUPTED_DATA__;
    delete window.__TEST_AUTH_STATE__;
  });
}
