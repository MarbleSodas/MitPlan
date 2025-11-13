# MitPlan Documentation

## Overview
This documentation provides comprehensive information about the MitPlan application - a web-based tool for Final Fantasy XIV players to plan and optimize raid mitigation strategies. The documentation is organized into several key sections that cover all aspects of the application from features to technical implementation.

## Documentation Structure

### 📋 [01. Feature Inventory](./01-feature-inventory.md)
**Complete catalog of all MitPlan features and capabilities**

This document provides a comprehensive overview of every feature in the application, including:
- Core mitigation planning system with drag-and-drop interface
- Multi-boss support for various FFXIV encounters
- FFXIV job system integration with accurate abilities
- Advanced mitigation mechanics (cooldowns, charges, Aetherflow)
- Real-time collaboration system
- Authentication and user management (authenticated + anonymous)
- Plan management and sharing
- Import/export functionality
- Theme system (light/dark modes)
- Mobile responsiveness and accessibility
- Performance optimizations

**Use this document to**: Understand what the application does and its full feature set.

### 🔧 [02. Technical Implementation](./02-technical-implementation.md)
**Detailed technical information about how features are implemented**

This document covers the technical details behind each feature, including:
- File locations and component structure
- Key functions and classes
- Data structures and algorithms
- State management patterns
- Integration points and APIs
- Performance optimization techniques
- Testing strategies

**Use this document to**: Understand how the application works under the hood and locate specific code.

### 🏗️ [03. Architecture Overview](./03-architecture-overview.md)
**High-level system architecture and design patterns**

This document explains the overall system design, including:
- Frontend and backend architecture
- Technology stack and framework choices
- Component hierarchy and organization
- Data flow patterns
- Authentication and authorization
- Performance and scalability considerations
- Security measures
- Deployment and monitoring

**Use this document to**: Understand the big picture of how the system is designed and organized.

### 👤 [04. User Workflows](./04-user-workflows.md)
**Key user journeys and interaction patterns**

This document outlines how users interact with the application, including:
- New user onboarding (authenticated and anonymous)
- Plan creation and editing workflows
- Collaborative editing processes
- Mobile user experience
- Error handling and recovery
- Advanced features (tank positions, cooldown management)

**Use this document to**: Understand user experience and design user-facing features.

### 🗄️ [05. Database Schema](./05-database-schema.md)
**Complete Firebase database structure and data relationships**

This document details the data layer, including:
- Firebase Realtime Database schema
- Data structures and relationships
- Security rules and access control
- Performance optimization
- Data migration strategies
- Backup and recovery procedures

**Use this document to**: Work with data, understand database structure, and implement data-related features.

### 🚀 [06. Development Setup Guide](./06-development-setup.md)
**Step-by-step guide for setting up the development environment**

This document provides detailed instructions for:
- Environment setup and prerequisites
- Firebase configuration
- Local development server setup
- Testing environment configuration
- Build and deployment processes

**Use this document to**: Get the development environment up and running quickly.

### 🔧 [07. Troubleshooting Guide](./07-troubleshooting.md)
**Common issues and their solutions**

This document covers:
- Common development issues and fixes
- Firebase connection problems
- Build and deployment errors
- Performance debugging
- Browser compatibility issues

**Use this document to**: Resolve common problems during development.

### 🤝 [08. Contributing Guide](./08-contributing.md)
**Guidelines for contributing to the project**

This document includes:
- Code standards and style guidelines
- Pull request process
- Testing requirements
- Documentation standards
- Review process

**Use this document to**: Contribute code and maintain project quality.

## Quick Start Guide

### For Developers
1. **Start Here**: Read the [Feature Inventory](./01-feature-inventory.md) to understand what the application does
2. **Setup**: Follow the [Development Setup Guide](./06-development-setup.md) to get started
3. **Architecture**: Review the [Architecture Overview](./03-architecture-overview.md) to understand the system design
4. **Implementation**: Use the [Technical Implementation](./02-technical-implementation.md) guide to locate and understand code
5. **Data**: Reference the [Database Schema](./05-database-schema.md) when working with data

### For Product Managers
1. **Features**: Review the [Feature Inventory](./01-feature-inventory.md) for complete feature understanding
2. **User Experience**: Study the [User Workflows](./04-user-workflows.md) to understand user journeys
3. **Technical Constraints**: Check the [Architecture Overview](./03-architecture-overview.md) for scalability and limitations

### For Designers
1. **User Flows**: Start with [User Workflows](./04-user-workflows.md) to understand user interactions
2. **Features**: Reference the [Feature Inventory](./01-feature-inventory.md) for UI/UX requirements
3. **Technical Constraints**: Review [Technical Implementation](./02-technical-implementation.md) for component structure

## Key Technologies

### Frontend
- **React 18**: Modern React with concurrent features
- **Vite**: Fast build tool and development server
- **Styled Components**: CSS-in-JS styling
- **React Router v6**: Client-side routing
- **@dnd-kit**: Drag and drop functionality

### Backend
- **Firebase Realtime Database**: Real-time collaboration
- **Firebase Authentication**: User management
- **Firebase Analytics**: Usage tracking

### Development
- **Bun**: Package manager and runtime
- **ESLint**: Code linting
- **Vitest**: Testing framework
- **Vercel**: Hosting and deployment

## Application Structure

```
src/
├── components/           # UI components
│   ├── common/          # Shared components
│   ├── planner/         # Mitigation planner
│   ├── dashboard/       # Dashboard components
│   └── mobile/          # Mobile-specific components
├── contexts/            # React Context providers
├── services/            # Business logic and APIs
├── hooks/               # Custom React hooks
├── utils/               # Helper functions
├── data/                # Static data (jobs, abilities, bosses)
└── styles/              # Global styles and themes
```

## Key Features Summary

### Core Functionality
- **Mitigation Planning**: Drag-and-drop interface for assigning abilities to boss actions
- **Real-time Collaboration**: Multiple users can edit plans simultaneously
- **FFXIV Integration**: Accurate job data, abilities, and boss encounters
- **Universal Access**: Both authenticated and anonymous users have full functionality

### Advanced Features
- **Cooldown Management**: Sophisticated tracking with multiple specialized systems
- **Tank Position System**: MT/OT assignment with automatic mitigation filtering
- **Aetherflow Tracking**: Scholar's stack system with automatic refresh
- **Mobile Optimization**: Touch-friendly interface with responsive design

### Technical Highlights
- **Real-time Synchronization**: Firebase-powered collaboration
- **Performance Optimization**: Caching, batching, and debouncing
- **Offline Support**: Local storage fallback
- **Theme System**: Light/dark modes with smooth transitions

## Contributing

### Development Setup
```bash
# Clone repository
git clone https://github.com/MarbleSodas/MitPlan.git

# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun run test
```

### Documentation Updates
When adding new features or making significant changes:
1. Update the relevant documentation files
2. Ensure all sections remain consistent
3. Add new workflows to the User Workflows document
4. Update technical implementation details
5. Modify database schema if data structures change

## Support and Community

- **Live Application**: [mitplan.vercel.app](https://mitplan.vercel.app/)
- **Discord Community**: Available via in-app Discord button
- **Support**: Ko-fi donation link available in application
- **Issues**: GitHub repository for bug reports and feature requests

## Version Information

- **Documentation Version**: 1.0
- **Application Version**: Current (see package.json)
- **Last Updated**: 2025-07-12

This documentation is maintained alongside the application and should be updated whenever significant changes are made to features, architecture, or user workflows.
