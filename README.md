# MitPlan - FFXIV Mitigation Planner

![MitPlan Logo](public/xivmitplan.ico)

## 🌟 Live Demo

Check out the live application: [MitPlan on Vercel](https://mitplan.vercel.app/)

## 📖 Overview

MitPlan is a comprehensive web application designed to help Final Fantasy XIV players plan and optimize their raid mitigation strategies. Built with modern web technologies and real-time collaboration features, MitPlan provides an intuitive interface for coordinating defensive cooldowns across your entire raid team.

## ✨ Key Features

### 🎮 FFXIV Integration
- **Official Job Icons**: Uses authentic FFXIV job icons from XIVAPI/GameEscape
- **Accurate Ability Data**: Job abilities match official FFXIV guides with correct level requirements, mitigation percentages, durations, and cooldowns
- **Level-Based Filtering**: Abilities automatically adjust based on job level, showing only available skills
- **Boss Action Database**: Includes accurate boss timelines for Ketuduke, Lala, Statice, Sugar Riot (M6S), Brute Abominator (M7S), and M8S

### 🤝 Real-Time Collaboration
- **Live Editing**: Multiple users can edit plans simultaneously with Firebase real-time synchronization
- **Active User Display**: See who's currently editing with circular avatar icons and hover tooltips
- **Change Tracking**: Real-time updates with conflict resolution and change origin tracking
- **Session Management**: Automatic cleanup of inactive sessions

### 👤 Anonymous User Support
- **No Account Required**: Full editing capabilities without creating an account
- **Local Storage Fallback**: Plans saved locally for offline access
- **Seamless Migration**: Easy account creation with automatic plan transfer
- **Display Name System**: Temporary identities for collaboration

### 🛡️ Advanced Tank Systems
- **Dual-Tank Support**: Comprehensive system for main tank (MT) and off-tank (OT) assignments
- **Position Selection**: Dynamic tank position assignment with real-time collaboration
- **Smart Mitigation Logic**:
  - Self-target abilities auto-assign to the appropriate tank
  - Single-target abilities show tank selection modal for dual-tank busters
  - Party-wide mitigations apply to both tanks
- **Shared Cooldowns**: Abilities like Bloodwhetting and Nascent Flash share cooldowns appropriately

### 🔮 Scholar's Aetherflow System
- **Stack Tracking**: Monitors Aetherflow stacks (0-3) based on boss action timing
- **Automatic Refresh**: 60-second refresh functionality based on timeline timing
- **Smart Consumption**: Tracks stack usage for abilities like Lustrate, Indomitability, and Excogitation

### ⚡ Enhanced Cooldown Management
- **Charge System**: Tracks abilities with multiple charges (e.g., Tetragrammaton, Essential Dignity)
- **Role-Shared Abilities**: Manages cooldowns for abilities shared across job roles
- **Instance Tracking**: Separate cooldown tracking for multiple instances of the same ability
- **Visual Indicators**: Color-coded availability status with detailed cooldown information

### 📊 Mitigation Optimization
- **Optimal Calculation**: Automatically calculates mitigation assignments that maximize damage reduction
- **15% Minimum Rule**: Ensures at least 15% mitigation on each boss action
- **Duration Windows**: Mitigation abilities appear on all boss actions within their duration
- **Secondary Applications**: Different styling for overlapping mitigation effects

### 🎨 User Experience
- **Responsive Design**: Mobile-friendly interface with bottom-up capsule view for mitigation assignment
- **Theme System**: Light and dark mode with consistent styling across all components
- **Drag & Drop**: Intuitive mitigation assignment with visual feedback
- **Filter System**: Show only relevant mitigations based on damage type and target
- **Loading States**: Comprehensive loading indicators and error boundaries

### 💾 Data Management
- **Firebase Integration**: Primary storage with real-time synchronization
- **Import/Export**: Full plan data import/export with backward compatibility
- **Plan Versioning**: Support for older plan versions while retaining all data
- **Access Control**: Plan ownership tracking with shared access management

## 🛠️ Technology Stack

- **Frontend**: React 19 with modern hooks and context API
- **Styling**: Styled Components with theme system
- **Drag and Drop**: @dnd-kit library for accessible interactions
- **Build Tool**: Vite for fast development and optimized builds
- **Package Manager**: Bun for improved performance
- **Backend**: Firebase Realtime Database for live collaboration
- **Authentication**: Firebase Auth with anonymous user support
- **Deployment**: Vercel with automatic deployments
- **Icons**: Lucide React for UI icons, XIVAPI for FFXIV assets

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- Bun (recommended) or npm (v8.0.0 or higher)
- Firebase project (for real-time features)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/MarbleSodas/MitPlan.git
   cd MitPlan
   ```

2. Install dependencies
   ```bash
   bun install
   # or
   npm install
   ```

3. Set up Firebase configuration
   ```bash
   # Copy the example environment file
   cp .env.example .env.local

   # Add your Firebase configuration
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_DATABASE_URL=your_database_url
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. Start the development server
   ```bash
   bun run dev
   # or
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
bun run build
# or
npm run build
```

The built files will be in the `dist` directory.

## 📝 Usage Guide

### Basic Workflow

1. **Select Jobs**: Choose the jobs in your raid composition from the job selector
2. **Assign Tank Positions**: Set main tank (MT) and off-tank (OT) assignments
3. **Choose a Boss**: Select the boss encounter you're planning for
4. **Plan Mitigation**: Drag mitigation abilities onto boss actions or use the mobile interface
5. **Optimize**: Use the auto-assignment feature to optimize mitigation coverage
6. **Collaborate**: Share your plan URL with team members for real-time editing
7. **Export**: Save your completed plan for future reference

### Advanced Features

#### Real-Time Collaboration
- Share the plan edit URL with your team
- See active collaborators in the top-right corner
- Changes sync instantly across all connected users
- Anonymous users can participate without accounts

#### Tank Position Management
- Use the tank position selector to assign MT/OT roles
- Single-target abilities will prompt for tank selection on dual-tank busters
- Self-target abilities automatically assign to the appropriate tank

#### Scholar Aetherflow Tracking
- Aetherflow stacks are automatically tracked based on timeline
- Stack consumption is calculated for abilities like Lustrate and Indomitability
- 60-second refresh timer aligns with boss action timing

#### Charge and Cooldown Management
- Abilities with charges (e.g., Tetragrammaton) show remaining uses
- Shared cooldowns prevent conflicts between related abilities
- Visual indicators show availability status with colored borders

## 🔄 Data Persistence & Storage

MitPlan offers multiple storage options to ensure your plans are always accessible:

### Firebase Realtime Database (Primary)
- Real-time synchronization across all devices
- Automatic backup and recovery
- Collaborative editing with conflict resolution
- Plan ownership and access control

### Local Storage (Fallback)
- Offline plan editing and storage
- Automatic local backup for anonymous users
- Seamless migration to Firebase when creating an account

### Import/Export System
- JSON-based plan export for sharing and backup
- Backward compatibility with older plan versions
- Cross-platform plan sharing

## 🔧 Development

### Project Structure
```
src/
├── components/           # React components
│   ├── Common/          # Shared components
│   ├── Dashboard/       # Dashboard components
│   ├── Planner/         # Mitigation planner
│   ├── Collaboration/   # Real-time collaboration
│   ├── DragAndDrop/     # Drag and drop system
│   └── Mobile/          # Mobile-specific components
├── contexts/            # React Context providers
├── services/            # Business logic and APIs
├── hooks/               # Custom React hooks
├── utils/               # Helper functions
├── data/                # Static data (jobs, abilities, bosses)
└── styles/              # Global styles and themes
```

### Available Scripts
- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run lint` - Run ESLint
- `bun run test` - Run tests

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](documentation/08-contributing.md) for detailed information.

### Quick Start for Contributors
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the coding standards and naming conventions
4. Add tests for new features
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 💬 Community & Support

### Discord Community
Join our Discord server for real-time support and community interaction:
- Get help with using MitPlan
- Share your mitigation strategies
- Request new features
- Report bugs and issues
- Connect with other FFXIV raiders

### Ko-fi Support
Support the development of MitPlan: [ko-fi.com/marblesodas](https://ko-fi.com/marblesodas)

## 📚 Documentation

Comprehensive documentation is available in the `/documentation` folder:
- [Feature Inventory](documentation/01-feature-inventory.md)
- [Technical Implementation](documentation/02-technical-implementation.md)
- [Architecture Overview](documentation/03-architecture-overview.md)
- [User Workflows](documentation/04-user-workflows.md)
- [Database Schema](documentation/05-database-schema.md)
- [Development Setup](documentation/06-development-setup.md)
- [Troubleshooting](documentation/07-troubleshooting.md)

## 🔒 Privacy & Security

MitPlan respects user privacy and implements security best practices:
- Anonymous users can use the app without providing personal information
- Firebase security rules protect user data
- No sensitive information is stored in local storage
- See our [Privacy Policy](https://mitplan.vercel.app/privacy-policy) for details

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎮 FFXIV Content Disclaimer

Final Fantasy XIV content, including job icons and ability data, is property of Square Enix Co., LTD.

This project is not affiliated with Square Enix and is intended for educational and planning purposes only.

## 🙏 Acknowledgements

- [Square Enix](https://www.square-enix.com/) for Final Fantasy XIV
- [XIVAPI](https://xivapi.com/) for FFXIV data and icons
- [GameEscape](https://ffxiv.gamerescape.com/) for additional FFXIV resources
- [Firebase](https://firebase.google.com/) for real-time database and authentication
- [Vercel](https://vercel.com/) for hosting and deployment
- The FFXIV community for feedback and feature requests

---

**Made with ❤️ for the FFXIV raiding community**
- [GameEscape](https://ffxiv.gamerescape.com/) for ability icons
- [Icy Veins FFXIV Guide](https://www.icy-veins.com/ffxiv/) for mitigation calculation methodology
