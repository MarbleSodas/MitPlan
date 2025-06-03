# MitPlan - FFXIV Mitigation Planner

![MitPlan Logo](public/xivmitplan.ico)

## 🌟 Live Demo

Check out the live application: [MitPlan on Vercel](https://mitplan.vercel.app/)

## 📖 Overview

MitPlan is a web application designed to help Final Fantasy XIV players plan and optimize their raid mitigation strategies. The tool allows players to:

- Select FFXIV jobs/classes and view their mitigation abilities
- Visualize boss timelines and actions
- Drag and drop mitigation abilities onto boss actions
- Track cooldowns and prevent invalid mitigation assignments
- Calculate optimal mitigation plans
- Import and export mitigation strategies

## ✨ Features

### Job Selection
- Select from all FFXIV jobs (tanks, healers, DPS)
- View job-specific mitigation abilities with accurate descriptions, cooldowns, and effects
- Filter abilities based on selected jobs and boss level

### Boss Timeline
- View detailed boss action timelines
- See action types (tankbusters, raidwides, etc.)
- Visualize damage patterns and plan accordingly

### Mitigation Planning
- Drag and drop mitigation abilities onto boss actions
- Automatic cooldown tracking and validation
- Visual indicators for abilities on cooldown
- Stacking mitigation calculation

### Authentication & Cloud Storage
- Sign in with email/password or Google account
- Cloud-based plan storage with Firebase Firestore
- Cross-device synchronization of your mitigation plans
- Secure user authentication with Firebase Auth

### Real-time Collaboration
- Share plans with your raid team via shareable links
- Real-time collaborative editing with Firebase Realtime Database
- See who else is viewing/editing the plan
- Visual indicators for other users' selections

### Import/Export
- Save and load mitigation plans to the cloud
- Export plans to share with your raid team
- Import plans from other players
- Automatic backup and synchronization

### Dark Mode
- Toggle between light and dark themes

## 🛠️ Technology Stack

- **Frontend**: React 19
- **Styling**: Styled Components
- **Drag and Drop**: @dnd-kit library
- **Build Tool**: Vite
- **Backend**: Firebase (Serverless)
  - **Authentication**: Firebase Auth
  - **Database**: Firestore (plan storage)
  - **Real-time**: Firebase Realtime Database (collaboration)
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v8.0.0 or higher)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/MarbleSodas/MitPlan.git
   cd MitPlan
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up Firebase (optional for local development)
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication, Firestore, and Realtime Database
   - Copy your Firebase config to `src/config/firebase.js`
   - Note: The app will work in offline mode without Firebase setup

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 📝 Usage Guide

1. **Select Jobs**: Choose the jobs in your raid composition
2. **Choose a Boss**: Select the boss encounter you're planning for
3. **Plan Mitigation**: Click on a boss action to select it, then drag mitigation abilities onto it
4. **Review**: Check the total mitigation percentage for each boss action
5. **Save/Export**: Save your plan or export it to share with others

## 🔄 Data Persistence & Collaboration

MitPlan offers multiple data storage options:

### Cloud Storage (Authenticated Users)
- **Firebase Firestore**: Secure cloud storage for your mitigation plans
- **Cross-device sync**: Access your plans from any device
- **Real-time collaboration**: Share plans with your raid team for live editing
- **Automatic backup**: Your plans are safely stored in the cloud

### Local Storage (Offline Mode)
- **Local browser storage**: Plans saved locally when not signed in
- **Migration support**: Easily migrate local plans to cloud storage
- **Offline functionality**: Full app functionality without internet connection

### Export/Import
- **JSON export**: Download plans as JSON files for backup
- **Plan sharing**: Share exported plans with other users
- **Cross-platform compatibility**: Import plans from any MitPlan instance

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## � Community

Join our Discord server to stay updated on new features, report bugs, request features, and connect with other users:

[Join the MitPlan Discord Server](https://discord.gg/YOUR_INVITE_LINK)

- Get announcements about new features and updates
- Request new features and enhancements
- Report bugs and issues
- Share your suggestions and ideas
- Connect with other FFXIV players using MitPlan

## �📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎮 FFXIV Content

Final Fantasy XIV content, including job icons and ability data, is property of Square Enix Co., LTD.

This project is not affiliated with Square Enix and is intended for educational and planning purposes only.

## 🙏 Acknowledgements

- [XIVAPI](https://xivapi.com/) for FFXIV data references
- [GameEscape](https://ffxiv.gamerescape.com/) for ability icons
- [Icy Veins FFXIV Guide](https://www.icy-veins.com/ffxiv/) for mitigation calculation methodology
