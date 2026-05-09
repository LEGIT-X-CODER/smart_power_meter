# ⚡ Smart Power Meter

A full-stack IoT solution for real-time power monitoring and device control. Features a web-based PWA dashboard with Firebase backend, ESP32 firmware, and real-time data synchronization.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-12.12-orange?logo=firebase)
![Vite](https://img.shields.io/badge/Vite-8.0-purple?logo=vite)

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Building & Deployment](#building--deployment)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [ESP32 Setup](#esp32-setup)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### Dashboard & Monitoring
- **Real-time Power Metrics** – Live voltage, current, power, and energy consumption
- **Power Consumption Charts** – Historical data visualization with Recharts
- **Device Status Monitoring** – Online/offline status and device health checks
- **Responsive Design** – Mobile-first PWA with offline support

### Device Control
- **Remote Power Control** – Toggle relay on/off from the web app
- **Scheduled Timers** – Program automatic on/off schedules
- **Threshold Alerts** – Configure power consumption thresholds with notifications
- **Device Settings** – Manage device names, calibration, and configurations

### User Management
- **Firebase Authentication** – Email/password signup and login
- **User Profiles** – Personal settings and preferences
- **Device Ownership** – Multiple devices per user with role management

### Notifications
- **Real-time Alerts** – Threshold breach and anomaly notifications
- **Notification History** – View past alerts and system messages

### Progressive Web App (PWA)
- **Offline Support** – Caching for offline access to dashboard
- **Home Screen Install** – Add app to home screen on mobile
- **Service Worker** – Background sync and push notifications ready

---

## 🛠️ Tech Stack

### Frontend
- **React 19** – UI library with functional components and hooks
- **TypeScript 6.0** – Type-safe JavaScript
- **Vite 8.0** – Lightning-fast build tool with HMR
- **Tailwind CSS 3.4** – Utility-first CSS framework
- **React Router 7.14** – Client-side routing
- **Recharts 3.8** – Composable chart library
- **Lucide React** – Beautiful SVG icons
- **React Hot Toast** – Toast notifications

### Backend & Database
- **Firebase Realtime Database (RTDB)** – Real-time data sync
- **Firestore** – Document-based NoSQL database for historical logs
- **Firebase Authentication** – User authentication and management
- **Firebase Cloud Functions** – Serverless backend (optional)

### Hardware
- **ESP32** – Microcontroller with WiFi connectivity
- **Arduino IDE** – Firmware development

### DevOps & Tools
- **Netlify** – Hosting and continuous deployment
- **ESLint** – Code quality and style enforcement
- **PostCSS & Autoprefixer** – CSS processing

---

## 🏗️ Architecture

```
┌──────────────┐       ┌────────────────────────┐       ┌──────────────┐
│   ESP32      │       │    Firebase Cloud       │       │   Web App    │
│   Device     │◄─────►│                        │◄─────►│   (PWA)      │
│              │       │  ┌──────────────────┐  │       │              │
│ • Sensors    │  RTDB │  │  Realtime DB     │  │ RTDB  │ • Dashboard  │
│ • Relay      │──────►│  │  (Live data)     │◄─┼──────►│ • Controls   │
│ • OLED       │       │  └──────────────────┘  │       │ • Live view  │
│ • Buttons    │       │  ┌──────────────────┐  │       │ • Charts     │
│              │ Logs  │  │  Firestore       │  │ Query │ • Logs       │
│              │──────►│  │  (Historical)    │◄─┼──────►│ • Notifs     │
│              │       │  └──────────────────┘  │       │              │
│              │       │  ┌──────────────────┐  │       │              │
│              │ Auth  │  │  Authentication  │  │ Auth  │              │
│              │──────►│  │  (Users)         │◄─┼──────►│              │
└──────────────┘       └────────────────────────┘       └──────────────┘
```

### Data Flow
- **Real-time Updates**: RTDB syncs live metrics between ESP32 and web app
- **Historical Logs**: Firestore stores long-term power consumption data
- **Authentication**: Firebase Auth handles user sign-in and device authorization
- **PWA Offline**: Service Worker caches critical data for offline access

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 16+** and npm/yarn
- **Git** for version control
- **Firebase CLI** (optional, for deployment)
- **Arduino IDE** (for ESP32 firmware)
- **ESP32 Development Board** (or compatible)

### Firebase Project
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable the following services:
   - Authentication (Email/Password)
   - Realtime Database
   - Firestore Database
   - Cloud Storage (optional)
3. Download your Firebase config and set environment variables

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/smart-power-meter.git
cd smart-power-meter
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Firebase
Create a `.env.local` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
```

### 4. Set Firebase Security Rules
Copy `firestore.rules` and `firestore.indexes.json` to your Firebase project:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

For detailed database setup instructions, see [DATABASE_SETUP.md](DATABASE_SETUP.md).

---

## 🔧 Development

### Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production
```bash
npm run build
```

This generates optimized files in the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

---

## 📦 Building & Deployment

### Local Build
```bash
npm run build
npm run preview
```

### Deploy to Netlify

#### Option 1: Using Netlify CLI
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### Option 2: Using Git Integration
1. Push code to GitHub
2. Connect repository to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`

#### Option 3: Using netlify.toml
The project includes `netlify.toml` with pre-configured settings.

See [netlify.toml](netlify.toml) for custom redirects and configuration.

---

## 📁 Project Structure

```
smart-power-meter/
├── src/
│   ├── components/
│   │   ├── auth/               # Authentication components
│   │   ├── device/             # Device detail components
│   │   ├── devices/            # Device list components
│   │   ├── layout/             # Navigation & layout
│   │   └── ui/                 # Reusable UI components
│   ├── pages/                  # Page components
│   │   ├── DashboardPage.tsx
│   │   ├── DeviceDetailPage.tsx
│   │   ├── DevicesPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── auth/               # Auth pages
│   ├── contexts/               # React Context providers
│   ├── lib/                    # Firebase & utility functions
│   ├── types/                  # TypeScript type definitions
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # Entry point
│   ├── App.css                 # Global styles
│   └── index.css               # CSS reset & utilities
├── public/                     # Static assets
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service Worker
│   └── icons/                  # App icons
├── esp32/
│   └── smart_power_meter/
│       └── smart_power_meter.ino  # ESP32 firmware
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── tailwind.config.js          # Tailwind CSS config
├── postcss.config.js           # PostCSS config
├── eslint.config.js            # ESLint config
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Firestore indexes
├── netlify.toml                # Netlify config
└── package.json                # Project dependencies
```

---

## ⚙️ Configuration

### Environment Variables
Create `.env.local` with your Firebase credentials (see [Installation](#installation)).

### Tailwind CSS
Edit `tailwind.config.js` to customize colors, fonts, and theme.

### TypeScript
Adjust `tsconfig.json` or `tsconfig.app.json` for compiler options.

### Vite
Modify `vite.config.ts` to add plugins or change build options.

---

## 🗄️ Database Setup

The project uses Firebase with two databases:

1. **Realtime Database (RTDB)** – Live metrics and real-time control
2. **Firestore** – Historical logs and user data

For complete setup instructions, refer to [DATABASE_SETUP.md](DATABASE_SETUP.md).

### Quick Start with Demo Data
```bash
node seed-demo-data.mjs
```

This seeds sample data into your Firebase project for testing.

---

## 🔌 ESP32 Setup

### Prerequisites
- ESP32 Development Board
- Arduino IDE with ESP32 support
- Arduino libraries: WiFi, Firebase Realtime Database, OLED display drivers

### Upload Firmware
1. Open `esp32/smart_power_meter/smart_power_meter.ino` in Arduino IDE
2. Install required libraries via Library Manager
3. Configure WiFi credentials and Firebase config
4. Select board: `ESP32 Dev Module`
5. Upload to device

For detailed ESP32 setup, see the firmware comments in the `.ino` file.

---

## 🐛 Troubleshooting

### Firebase Connection Issues
- Verify Firebase credentials in `.env.local`
- Check Firebase security rules in Firestore console
- Ensure CORS is properly configured

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Development Server Not Starting
```bash
# Check if port 5173 is in use
netstat -tuln | grep 5173

# Use alternative port
npm run dev -- --port 3000
```

### Service Worker Issues
- Clear browser cache and reload
- Unregister old Service Workers in DevTools

For more help, see [DATABASE_SETUP.md](DATABASE_SETUP.md#troubleshooting).

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Write clean, TypeScript-first code
- Follow the existing project structure
- Run `npm run lint` before committing
- Add tests for new features
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License – see the LICENSE file for details.

---

## 📞 Support & Contact

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check [DATABASE_SETUP.md](DATABASE_SETUP.md) for setup help
- Review the troubleshooting section above

---

## 🙏 Acknowledgments

- React community for excellent documentation
- Firebase for backend services
- Vite for the fast build tool
- Tailwind CSS for utility-first styling
- Contributors and testers

---

**Made with ⚡ for IoT power monitoring**
