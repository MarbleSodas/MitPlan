# MitPlan Contributing Guide

## Overview
Thank you for your interest in contributing to MitPlan! This guide outlines the standards, processes, and best practices for contributing to the project.

## Getting Started

### Prerequisites
Before contributing, ensure you have:
1. Completed the [Development Setup Guide](./06-development-setup.md)
2. Read the [Architecture Overview](./03-architecture-overview.md)
3. Familiarized yourself with the [Feature Inventory](./01-feature-inventory.md)
4. Reviewed existing issues and pull requests

### First Contribution
1. **Start Small**: Look for issues labeled `good first issue` or `help wanted`
2. **Ask Questions**: Use GitHub Discussions or Discord for clarification
3. **Follow Standards**: Adhere to the coding standards outlined below

## Code Standards

### JavaScript/React Standards

#### Code Style
```javascript
// Use functional components with hooks
const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);
  
  // Use descriptive variable names
  const isUserAuthenticated = user !== null;
  const selectedJobsCount = Object.values(selectedJobs).filter(job => job.selected).length;
  
  // Use early returns to reduce nesting
  if (!isUserAuthenticated) {
    return <LoginPrompt />;
  }
  
  return (
    <div>
      {/* Component content */}
    </div>
  );
};
```

#### Naming Conventions
```javascript
// Components: PascalCase
const MitigationPlanner = () => {};
const BossActionItem = () => {};

// Variables and functions: camelCase
const selectedJobs = {};
const handleJobSelection = () => {};

// Constants: SCREAMING_SNAKE_CASE
const MAX_MITIGATION_PERCENTAGE = 100;
const FIREBASE_CONFIG_KEYS = [];

// Files: kebab-case for components, camelCase for utilities
// Components: MitigationPlanner.jsx
// Utilities: cooldownManager.js
```

#### Component Structure
```javascript
// 1. Imports (external libraries first, then internal)
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { validateInput } from '../../utils/validation';

// 2. Styled components
const Container = styled.div`
  /* styles */
`;

// 3. Component definition
const MyComponent = ({ prop1, prop2 }) => {
  // 4. Hooks (state, context, custom hooks)
  const [localState, setLocalState] = useState();
  const { user } = useAuth();
  
  // 5. Event handlers
  const handleClick = () => {
    // handler logic
  };
  
  // 6. Effects
  useEffect(() => {
    // effect logic
  }, []);
  
  // 7. Render
  return (
    <Container>
      {/* JSX */}
    </Container>
  );
};

// 8. Export
export default MyComponent;
```

### CSS/Styling Standards

#### Styled Components
```javascript
// Use theme variables
const Button = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.buttonText};
  padding: ${props => props.theme.spacing.medium};
  border-radius: ${props => props.theme.borderRadius.medium};
  
  // Responsive design
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.small};
  }
`;

// Use semantic prop names
const StatusIndicator = styled.div`
  border-left: 4px solid ${props => 
    props.$isAvailable ? props.theme.colors.primary : props.theme.colors.error
  };
`;
```

#### Responsive Design
```javascript
// Mobile-first approach
const ResponsiveContainer = styled.div`
  // Base styles (mobile)
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.small};
  
  // Tablet and up
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    flex-direction: row;
    gap: ${props => props.theme.spacing.medium};
  }
  
  // Desktop and up
  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    gap: ${props => props.theme.spacing.large};
  }
`;
```

### State Management Standards

#### Context Usage
```javascript
// Create focused contexts
const JobContext = createContext();
const BossContext = createContext();
// Avoid: const AppContext = createContext(); // Too broad

// Use custom hooks for context access
export const useJobContext = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobContext must be used within JobProvider');
  }
  return context;
};
```

#### State Updates
```javascript
// Use functional updates for state that depends on previous state
setCount(prevCount => prevCount + 1);

// Use object spread for object updates
setUser(prevUser => ({
  ...prevUser,
  name: newName
}));

// Use proper dependency arrays in useEffect
useEffect(() => {
  fetchData();
}, [userId, selectedBoss]); // Include all dependencies
```

## Git Workflow

### Branch Naming
```bash
# Feature branches
feature/add-boss-timeline-zoom
feature/implement-scholar-aetherflow

# Bug fixes
fix/cooldown-calculation-error
fix/mobile-drag-drop-issue

# Documentation
docs/update-api-documentation
docs/add-troubleshooting-guide

# Refactoring
refactor/simplify-mitigation-context
refactor/optimize-firebase-queries
```

### Commit Messages
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Format: type(scope): description

# Examples:
feat(jobs): add pictomancer job support
fix(cooldown): resolve aetherflow stack calculation
docs(readme): update installation instructions
style(components): improve button hover states
refactor(contexts): simplify state management
test(utils): add cooldown manager tests
chore(deps): update firebase dependencies
```

### Pull Request Process

#### Before Creating PR
```bash
# 1. Ensure your branch is up to date
git checkout main
git pull origin main
git checkout your-feature-branch
git rebase main

# 2. Run quality checks
bun run lint
bun run test
bun run build

# 3. Test your changes thoroughly
# - Manual testing in browser
# - Test on mobile devices
# - Test with different user scenarios
```

#### PR Template
```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Mobile testing completed
- [ ] Cross-browser testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] No console errors or warnings
```

## Testing Standards

### Unit Testing
```javascript
// Use descriptive test names
describe('CooldownManager', () => {
  it('should calculate correct cooldown availability for single-charge abilities', () => {
    // Test implementation
  });
  
  it('should handle aetherflow stack consumption correctly', () => {
    // Test implementation
  });
});

// Test edge cases
it('should handle empty assignments array', () => {
  // Test implementation
});

it('should throw error for invalid ability ID', () => {
  // Test implementation
});
```

### Integration Testing
```javascript
// Test component interactions
it('should update mitigation assignments when job selection changes', () => {
  // Test implementation
});

// Test Firebase integration
it('should sync changes across multiple users in real-time', () => {
  // Test implementation
});
```

## Documentation Standards

### Code Documentation
```javascript
/**
 * Calculates mitigation percentage for a boss action
 * @param {string} bossActionId - The ID of the boss action
 * @param {Array} assignments - Array of mitigation assignments
 * @param {Object} selectedJobs - Currently selected jobs
 * @returns {number} Total mitigation percentage (0-100)
 */
const calculateMitigationPercentage = (bossActionId, assignments, selectedJobs) => {
  // Implementation
};

// Use JSDoc for complex functions
// Add inline comments for complex logic
// Avoid obvious comments
```

### README Updates
When adding features:
1. Update feature list in main README.md
2. Add usage examples if applicable
3. Update screenshots if UI changes
4. Document any new environment variables

## Performance Guidelines

### React Performance
```javascript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component implementation
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// Use useCallback for event handlers passed to children
const handleClick = useCallback(() => {
  // Handler logic
}, [dependency]);
```

### Firebase Performance
```javascript
// Batch Firebase operations
const batch = {};
batch[`plans/${planId}/data/selectedJobs`] = selectedJobs;
batch[`plans/${planId}/data/assignments`] = assignments;
await update(ref(database), batch);

// Use appropriate Firebase queries
// Avoid downloading unnecessary data
const jobsRef = ref(database, `plans/${planId}/data/selectedJobs`);
```

## Security Guidelines

### Environment Variables
```javascript
// Never commit sensitive data
// Use VITE_ prefix for client-side variables
// Validate environment variables on startup

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID'
];

const missingVars = requiredEnvVars.filter(envVar => !import.meta.env[envVar]);
if (missingVars.length > 0) {
  throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
}
```

### Input Validation
```javascript
// Validate user inputs
const validatePlanName = (name) => {
  if (!name || typeof name !== 'string') {
    throw new Error('Plan name must be a non-empty string');
  }
  if (name.length > 100) {
    throw new Error('Plan name must be less than 100 characters');
  }
  return name.trim();
};
```

## Review Process

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Logic is clear and well-commented
- [ ] Error handling is appropriate
- [ ] Performance considerations addressed
- [ ] Security best practices followed
- [ ] Tests are comprehensive
- [ ] Documentation is updated

### Review Timeline
- **Initial Review**: Within 2-3 business days
- **Follow-up Reviews**: Within 1 business day
- **Merge**: After approval and CI passes

## Release Process

### Version Numbering
Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version number bumped
- [ ] Changelog updated
- [ ] Production deployment tested
- [ ] Rollback plan prepared

## Getting Help

### Resources
- [Development Setup Guide](./06-development-setup.md)
- [Troubleshooting Guide](./07-troubleshooting.md)
- [Technical Implementation](./02-technical-implementation.md)

### Communication
- **GitHub Discussions**: For questions and ideas
- **Discord**: For real-time chat
- **Issues**: For bug reports and feature requests
- **Pull Requests**: For code review discussions

Thank you for contributing to MitPlan! Your efforts help make raid planning better for the FFXIV community.
