# MitPlan E2E Test Suite

This directory contains comprehensive end-to-end tests for the MitPlan application using Playwright.

## Overview

The test suite covers all major features of MitPlan:

- **Authentication flows** - Login, registration, password reset, profile management
- **Job selection** - FFXIV job card selection and mitigation ability updates
- **Boss actions** - Timeline display, action selection, health bar calculations
- **Mitigation assignment** - Drag-and-drop assignment with tank selection
- **Tank system** - Dual-tank support with MT/OT positioning
- **Plan persistence** - Save/load plans with Firestore integration
- **Plan sharing** - Real-time collaboration and sharing features
- **Import/export** - Plan data import/export functionality
- **Mobile responsiveness** - Touch interactions and responsive design
- **Error handling** - Network failures, validation errors, edge cases

## Test Structure

```
tests/
├── e2e/                    # End-to-end test files
│   ├── auth.spec.js
│   ├── job-selection.spec.js
│   ├── boss-actions.spec.js
│   ├── mitigation-assignment.spec.js
│   ├── tank-system.spec.js
│   ├── plan-persistence.spec.js
│   ├── plan-sharing.spec.js
│   ├── import-export.spec.js
│   ├── mobile-responsive.spec.js
│   └── error-handling.spec.js
├── page-objects/           # Page Object Model classes
│   ├── AuthPage.js
│   ├── JobSelectorPage.js
│   ├── BossTimelinePage.js
│   ├── MitigationPage.js
│   ├── PlanManagementPage.js
│   └── CollaborationPage.js
├── utils/                  # Test utilities and helpers
│   ├── global-setup.js
│   ├── global-teardown.js
│   ├── test-data.js
│   ├── helpers.js
│   └── firebase-mock.js
└── README.md              # This file
```

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   bun install
   ```

2. Install Playwright browsers:
   ```bash
   bun run test:install
   ```

3. Start the development server:
   ```bash
   bun run dev
   ```

### Test Commands

```bash
# Run all tests
bun run test

# Run tests with browser UI
bun run test:headed

# Run tests with Playwright UI
bun run test:ui

# Debug tests
bun run test:debug

# Run specific test suites
bun run test:auth          # Authentication tests
bun run test:jobs          # Job selection tests
bun run test:boss          # Boss action tests
bun run test:mitigation    # Mitigation assignment tests
bun run test:tanks         # Tank system tests
bun run test:persistence   # Plan persistence tests
bun run test:sharing       # Plan sharing tests
bun run test:import-export # Import/export tests
bun run test:mobile        # Mobile responsiveness tests
bun run test:errors        # Error handling tests

# View test reports
bun run test:report

# Run tests for CI
bun run test:ci
```

### Browser Support

Tests run on multiple browsers:
- **Chromium** (Chrome/Edge)
- **Firefox**
- **WebKit** (Safari)
- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)

## Test Data

Test data is defined in `utils/test-data.js` and includes:

- **Test users** - Valid/invalid user credentials
- **FFXIV jobs** - Tank, healer, and DPS job definitions
- **Boss data** - Boss actions and timeline information
- **Mitigation abilities** - Ability definitions with cooldowns
- **Test plans** - Sample plan configurations
- **Collaboration data** - Multi-user scenarios

## Page Object Model

Tests use the Page Object Model pattern for maintainability:

- **AuthPage** - Authentication flows and user management
- **JobSelectorPage** - Job selection and tank positioning
- **BossTimelinePage** - Boss selection and timeline interaction
- **MitigationPage** - Mitigation assignment and cooldown tracking
- **PlanManagementPage** - Plan save/load/share operations
- **CollaborationPage** - Real-time collaboration features

## Mocking and Test Environment

### Firebase Mocking

Tests use Firebase mocking utilities in `utils/firebase-mock.js`:

- Mock authentication responses
- Mock Firestore operations
- Mock Realtime Database collaboration
- Simulate network failures
- Test error scenarios

### Test Environment Setup

- Global setup ensures application is ready
- Firebase emulators for isolated testing
- Mock data for consistent test scenarios
- Network condition simulation

## Test Categories

### Positive Tests
- Happy path scenarios
- Expected user workflows
- Feature functionality verification

### Negative Tests
- Invalid input handling
- Error condition responses
- Edge case behavior

### Performance Tests
- Load time assertions
- Response time validation
- Memory usage monitoring

### Accessibility Tests
- Keyboard navigation
- Screen reader compatibility
- ARIA label verification

## Debugging Tests

### Debug Mode
```bash
bun run test:debug
```

### Screenshots and Videos
- Automatic screenshots on failure
- Video recording for failed tests
- Trace files for detailed debugging

### Console Logs
- Browser console messages captured
- Network request/response logging
- Custom debug output

## CI/CD Integration

### GitHub Actions
Tests are configured for GitHub Actions with:
- Matrix testing across browsers
- Parallel test execution
- Artifact collection
- Test result reporting

### Test Reports
- HTML reports with screenshots
- JUnit XML for CI integration
- JSON results for processing

## Best Practices

### Writing Tests
1. Use descriptive test names
2. Follow AAA pattern (Arrange, Act, Assert)
3. Keep tests independent and isolated
4. Use page objects for reusability
5. Include both positive and negative cases

### Maintenance
1. Update test data when features change
2. Keep page objects synchronized with UI
3. Review and update selectors regularly
4. Monitor test execution times
5. Clean up test artifacts

### Performance
1. Use efficient selectors
2. Minimize wait times
3. Parallel test execution
4. Resource cleanup
5. Optimize test data

## Troubleshooting

### Common Issues

**Tests failing locally:**
- Ensure dev server is running on port 5173
- Check browser installation
- Verify test data is current

**Flaky tests:**
- Add appropriate wait conditions
- Check for race conditions
- Verify element stability

**Performance issues:**
- Reduce test parallelism
- Optimize selectors
- Check resource usage

### Getting Help

1. Check test logs and screenshots
2. Run tests in headed mode for debugging
3. Use Playwright UI for interactive debugging
4. Review page object implementations
5. Verify test data and mocks

## Contributing

When adding new tests:

1. Follow existing patterns and structure
2. Add appropriate page object methods
3. Include test data in `test-data.js`
4. Write both positive and negative cases
5. Update documentation as needed

For more information about Playwright, visit: https://playwright.dev/
