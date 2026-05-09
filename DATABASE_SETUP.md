# 🔌 Smart Power Meter — Database Connectivity Guide

> Complete setup guide for Firebase Realtime Database (RTDB), Firestore, and ESP32-to-App data flow.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Firebase Project Setup](#firebase-project-setup)
3. [Realtime Database (RTDB)](#realtime-database-rtdb)
4. [Firestore Database](#firestore-database)
5. [Firebase Authentication](#firebase-authentication)
6. [Firestore Indexes (CRITICAL)](#firestore-indexes-critical)
7. [Security Rules](#security-rules)
8. [ESP32 → Firebase Data Flow](#esp32--firebase-data-flow)
9. [App → Firebase Data Flow](#app--firebase-data-flow)
10. [Complete RTDB Structure](#complete-rtdb-structure)
11. [Complete Firestore Structure](#complete-firestore-structure)
12. [Seeding Demo Data](#seeding-demo-data)
13. [Troubleshooting](#troubleshooting)
14. [Netlify Deployment](#netlify-deployment)

---

## Architecture Overview

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

| Database | Purpose | Used By |
|----------|---------|---------|
| **RTDB** | Real-time live data, device control, heartbeat | ESP32 + App |
| **Firestore** | Historical logs, user profiles, notifications, device metadata | ESP32 (logs only) + App |
| **Auth** | User login + ESP32 device authentication | Both |

---

## Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project** → Name it (e.g., `smart-home`)
3. Enable **Google Analytics** (optional)

### Step 2: Enable Services

In your Firebase project, enable:

- ✅ **Authentication** → Email/Password + Google Sign-in
- ✅ **Realtime Database** → Create in `asia-southeast1` region
- ✅ **Firestore Database** → Create in `asia-south1` region
- ✅ **Web App** → Register app → Copy config keys

### Step 3: Get Configuration Keys

After registering the web app, you'll get:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  measurementId: "G-XXXXXXXX",
};
```

> ⚠️ **Note:** Firebase client-side API keys are **PUBLIC by design**. Security is enforced via **Firebase Security Rules**, not by hiding keys.

---

## Realtime Database (RTDB)

### Purpose
RTDB handles **real-time, low-latency** data:
- Live sensor readings (voltage, current, power)
- Device ON/OFF state
- Heartbeat (online detection)
- Schedule & threshold settings
- Electricity rate settings

### Initial Setup

Import `firebase-device-setup.json` into RTDB:

**Firebase Console → Realtime Database → ⋮ → Import JSON**

```json
{
  "device_registry": {
    "SPM-A1B2C3": {
      "password": "spm2026",
      "linkedTo": null,
      "firmwareVersion": "1.0.0",
      "registeredAt": 1714300000000
    }
  },
  "devices": {
    "SPM-A1B2C3": {
      "heartbeat": 0,
      "switchState": false,
      "manualOverride": false,
      "lastCommand": 0,
      "live": {
        "voltage": 0,
        "current": 0,
        "currentPower": 0,
        "totalEnergy": 0
      },
      "schedule": {
        "enabled": false,
        "shutdownTimestamp": 0,
        "startTimestamp": 0
      },
      "threshold": {
        "enabled": false,
        "value": 5,
        "unit": "kWh",
        "action": "notify"
      }
    }
  }
}
```

### RTDB Rules (Development)

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> ⚠️ Change to authenticated rules before production. See [Security Rules](#security-rules).

---

## Firestore Database

### Purpose
Firestore handles **historical, queryable** data:
- Power consumption logs (charts & CSV export)
- User profiles
- Device metadata (name, room, owner)
- Notifications (alerts for schedule, threshold, offline, etc.)

### Collections

| Collection | Document ID | Description |
|------------|-------------|-------------|
| `users` | `{firebase_uid}` | User profile (name, email, devices list) |
| `devices` | `{device_id}` | Device metadata (name, room, owner) |
| `power_logs` | Auto-generated | Historical power readings from ESP32 |
| `notifications` | Auto-generated | Alert messages for the user |

---

## Firebase Authentication

### Users Needed

| User | Purpose | Create In |
|------|---------|-----------|
| **Your account** | Web app login | App signup page or Firebase Console |
| **`device@yourapp.com`** | ESP32 authentication | Firebase Console → Authentication → Add User |

### Create ESP32 Device User

1. Firebase Console → **Authentication** → **Add User**
2. Email: `device@yourapp.com`
3. Password: `password@123`

> The ESP32 firmware authenticates with these credentials to read/write RTDB and Firestore.

---

## Firestore Indexes (CRITICAL)

> **🔴 Without these indexes, power logs and notifications will NOT show in the app. Queries silently return empty results.**

### Required Composite Indexes

Go to **Firebase Console → Firestore → Indexes → Add Index**:

| # | Collection | Field 1 | Direction | Field 2 | Direction |
|---|-----------|---------|-----------|---------|-----------|
| 1 | `power_logs` | `deviceId` | Ascending ↑ | `timestamp` | Ascending ↑ |
| 2 | `notifications` | `userId` | Ascending ↑ | `createdAt` | Descending ↓ |
| 3 | `notifications` | `userId` | Ascending ↑ | `read` | Ascending ↑ |

### Quick Method (Recommended)

1. Open the app in browser
2. Open **Developer Tools** → **Console** tab
3. Navigate to the **Logs** tab on any device
4. You'll see an error with a clickable link: _"The query requires an index. Create it here: ..."_
5. **Click the link** → Firebase will auto-create the index
6. Repeat for notifications page

> Index creation takes 2-5 minutes. Status shows as "Building" → "Enabled".

### Using Index Config File

Alternatively, deploy indexes via Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project
# Copy firestore.indexes.json content
firebase deploy --only firestore:indexes
```

---

## Security Rules

### Firestore Rules (Development — Open Access)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Firestore Rules (Production — Authenticated)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Device metadata — owner only
    match /devices/{deviceId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Power logs — any authenticated user can read, ESP32 device can write
    match /power_logs/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth != null;
    }

    // Notifications — user can only access their own
    match /notifications/{notifId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

### RTDB Rules (Development)

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### RTDB Rules (Production)

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "device_registry": {
      "$deviceId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## ESP32 → Firebase Data Flow

### What ESP32 Writes

| Path / Collection | Data | Frequency | Function |
|-------------------|------|-----------|----------|
| **RTDB** `/devices/{id}/heartbeat` | Firebase server timestamp | Every 20 sec | `updateHeartbeat()` |
| **RTDB** `/devices/{id}/live/*` | voltage, current, power, energy | Every 3 sec | `uploadMetrics()` |
| **RTDB** `/devices/{id}/switchState` | true/false | On relay change | `controlRelay()` |
| **RTDB** `/devices/{id}/manualOverride` | true/false | On relay change | `controlRelay()` |
| **RTDB** `/devices/{id}/schedule/enabled` | → false | When schedule triggers | `checkSchedule()` |
| **RTDB** `/devices/{id}/threshold/enabled` | → false | When threshold triggers | `checkThreshold()` |
| **Firestore** `power_logs/{doc}` | Full power snapshot | Every 60 sec | `uploadPowerLog()` |

### What ESP32 Reads

| Path | Data | Frequency | Function |
|------|------|-----------|----------|
| **RTDB** `/devices/{id}/switchState` | Remote ON/OFF command | Every 1 sec | `checkRemoteCommand()` |
| **RTDB** `/devices/{id}/schedule/*` | Schedule config | Every 30 sec | `readSchedule()` |
| **RTDB** `/devices/{id}/threshold/*` | Threshold config | Every 30 sec | `readThreshold()` |

### ESP32 Timestamp (NTP)

The ESP32 syncs time via NTP on boot and uses **real Unix milliseconds** (same as JavaScript `Date.now()`) for Firestore timestamps:

```cpp
// NTP sync (in connectWiFi)
configTime(19800, 0, "pool.ntp.org", "time.nist.gov");  // IST UTC+5:30

// Get Unix milliseconds (in uploadPowerLog)
unsigned long long getUnixMillis() {
  struct timeval tv;
  gettimeofday(&tv, NULL);
  return (unsigned long long)tv.tv_sec * 1000ULL + (tv.tv_usec / 1000);
}
```

> ⚠️ **Critical:** Without NTP sync, timestamps would be `millis()/1000` (seconds since boot) which never matches the app's `Date.now()` queries. Logs would appear empty.

---

## App → Firebase Data Flow

### What the App Writes

| Path / Collection | Data | Trigger | Function |
|-------------------|------|---------|----------|
| **RTDB** `/devices/{id}/switchState` | true/false | Power button | `setSwitchState()` |
| **RTDB** `/devices/{id}/manualOverride` | true/false | Power button | `setSwitchState()` |
| **RTDB** `/devices/{id}/lastCommand` | `Date.now()` | Power button | `setSwitchState()` |
| **RTDB** `/devices/{id}/schedule/*` | Schedule config | Save Schedule | `setSchedule()` |
| **RTDB** `/devices/{id}/threshold/*` | Threshold config | Save Threshold | `setThreshold()` |
| **RTDB** `/devices/{id}/settings/ratePerKwh` | ₹/kWh rate | Rate setting | LiveMetrics component |
| **RTDB** `/device_registry/{id}/linkedTo` | User UID | Add Device | `linkDeviceToUser()` |
| **Firestore** `users/{uid}` | Profile data | Signup/edit | `createUserProfile()` |
| **Firestore** `devices/{id}` | Name, room, owner | Add Device | `setDeviceMetadata()` |
| **Firestore** `notifications/{id}` | Alert message | Auto-trigger | `createNotification()` |

### What the App Reads (Real-time Listeners)

| Path / Collection | Component | Function |
|-------------------|-----------|----------|
| **RTDB** `/devices/{id}` (entire node) | DeviceDetailPage | `listenToDevice()` |
| **RTDB** `/devices/{id}/live` | LiveMetrics | `listenToLiveMetrics()` |
| **RTDB** `/devices/{id}/heartbeat` | Online detection | `listenToHeartbeat()` |
| **RTDB** `/device_registry/{id}` | AddDeviceModal | `getDeviceRegistryEntry()` |
| **Firestore** `power_logs` | PowerLogs (charts) | `listenToPowerLogs()` |
| **Firestore** `notifications` | NotificationsPage | `listenToNotifications()` |

---

## Complete RTDB Structure

```
root/
├── devices/
│   └── SPM-A1B2C3/
│       ├── heartbeat: 1714350000000          ← ESP32 writes (server timestamp)
│       ├── switchState: false                ← Both read/write
│       ├── manualOverride: false             ← Both read/write
│       ├── lastCommand: 1714349000000        ← App writes only
│       ├── live/                             ← ESP32 writes every 3 sec
│       │   ├── voltage: 232.5
│       │   ├── current: 1.85
│       │   ├── currentPower: 430.1
│       │   └── totalEnergy: 1200.5
│       ├── schedule/                         ← App writes, ESP32 reads
│       │   ├── enabled: false
│       │   ├── shutdownTimestamp: 1714390000000
│       │   └── startTimestamp: 0
│       ├── threshold/                        ← App writes, ESP32 reads
│       │   ├── enabled: true
│       │   ├── value: 5
│       │   ├── unit: "kWh"
│       │   └── action: "both"
│       └── settings/                         ← App writes
│           └── ratePerKwh: 8.0
│
└── device_registry/
    └── SPM-A1B2C3/
        ├── password: "spm2026"               ← Pre-created manually
        ├── linkedTo: "user_uid_here"         ← App writes on device add
        ├── firmwareVersion: "1.0.0"          ← Pre-created
        └── registeredAt: 1714300000000       ← Pre-created
```

---

## Complete Firestore Structure

### `users/{uid}`
```json
{
  "uid": "firebase_auth_uid",
  "displayName": "Aman",
  "email": "aman@example.com",
  "photoURL": "",
  "devices": ["SPM-A1B2C3"],
  "createdAt": 1714300000000
}
```

### `devices/{device_id}`
```json
{
  "id": "SPM-A1B2C3",
  "name": "Living Room Meter",
  "room": "Living Room",
  "ownerId": "firebase_auth_uid",
  "firmwareVersion": "1.0.0",
  "addedAt": 1714300000000
}
```

### `power_logs/{auto_id}`
```json
{
  "deviceId": "SPM-A1B2C3",
  "voltage": 232.5,
  "current": 1.85,
  "power": 430.1,
  "totalEnergy": 1200.5,
  "timestamp": 1714350000000
}
```

### `notifications/{auto_id}`
```json
{
  "userId": "firebase_auth_uid",
  "deviceId": "SPM-A1B2C3",
  "deviceName": "Living Room Meter",
  "type": "threshold",
  "message": "⚠️ Energy threshold reached — action triggered",
  "read": false,
  "createdAt": 1714350000000
}
```

**Notification Types:** `threshold` | `schedule` | `offline` | `online` | `high_consumption` | `manual_override`

---

## Seeding Demo Data

### Prerequisites
```bash
npm install firebase    # already in project dependencies
```

### Setup
1. Sign up in the app → get your **User UID** from Firebase Console → Authentication
2. Edit `seed-demo-data.mjs` line 41:
   ```javascript
   const USER_ID = 'paste_your_uid_here';
   ```

### Run
```bash
node seed-demo-data.mjs
```

### What It Creates
| Data | Count | Description |
|------|-------|-------------|
| Power logs | ~2000 | 7 days of realistic Indian household patterns (5-min intervals) |
| Notifications | 6 | Sample alerts (threshold, schedule, offline, online) |
| RTDB live data | 1 | Current device state with realistic values |
| Device metadata | 1 | Firestore device entry |

---

## Troubleshooting

### ❌ Logs page shows "No data for this period"

**Cause 1: Missing Firestore composite index**
- Open browser DevTools → Console
- Look for error: _"The query requires an index"_
- Click the link in the error to auto-create the index
- Wait 2-5 minutes for index to build

**Cause 2: Timestamp mismatch (old firmware)**
- ESP32 must use NTP-synced Unix timestamps (`getUnixMillis()`)
- If using old firmware with `millis()/1000`, re-flash with updated code
- Verify in Serial Monitor: timestamps should be 13-digit numbers (e.g., `1714350000000`)

**Cause 3: Firestore rules blocking reads**
- Set rules to `allow read, write: if true` for development
- Check Firebase Console → Firestore → Rules

### ❌ Device shows "Offline" even when ESP32 is running

**Cause: Firebase Auth failure**
- Check Serial Monitor for auth errors
- Verify `device@yourapp.com` / `password@123` exists in Firebase Authentication
- The app checks: `Date.now() - heartbeat < 30000ms`

### ❌ Notifications not appearing

**Cause 1: Missing composite index** on `notifications` collection
- Create index: `userId` (Asc) + `createdAt` (Desc)

**Cause 2: No notification documents exist**
- Run `seed-demo-data.mjs` with your User UID
- Or trigger schedule/threshold from the app — notifications auto-create

### ❌ "Add Device" fails with "Device not found"

**Cause: `device_registry` not set up**
- Import `firebase-device-setup.json` into RTDB
- Or manually create: `device_registry/SPM-A1B2C3/password: "spm2026"`

### ❌ ESP32 Serial shows "Firestore upload failed"

**Possible causes:**
1. WiFi connected but no internet → check router
2. Firebase Auth failed → verify device user credentials
3. Firestore not enabled → enable in Firebase Console
4. NTP sync failed → check `"Syncing NTP time... Done"` in Serial

### ❌ Netlify deploy fails (secrets scanner)

- Firebase client keys are public — add to `netlify.toml`:
  ```toml
  [build.environment]
    SECRETS_SCAN_OMIT_KEYS = "VITE_FIREBASE_API_KEY,VITE_FIREBASE_APP_ID,..."
  ```
- Add `VITE_FIREBASE_*` env vars in Netlify dashboard
- See `netlify.toml` in project for full config

---

## Netlify Deployment

### Environment Variables

Add these in **Netlify → Site Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | `https://your-project-default-rtdb.xxx.firebasedatabase.app` |
| `VITE_FIREBASE_PROJECT_ID` | `your-project` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `VITE_FIREBASE_APP_ID` | `1:123456789:web:abcdef` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-XXXXXXXX` |

### Build Settings

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | `20` |

---

## Quick Start Checklist

```
[ ] 1. Create Firebase project
[ ] 2. Enable Auth (Email/Password + Google)
[ ] 3. Create Realtime Database
[ ] 4. Create Firestore Database
[ ] 5. Register Web App → get config keys
[ ] 6. Create .env with VITE_FIREBASE_* keys
[ ] 7. Create ESP32 auth user (device@yourapp.com)
[ ] 8. Import firebase-device-setup.json into RTDB
[ ] 9. Set RTDB rules (open for dev)
[ ] 10. Set Firestore rules (open for dev)
[ ] 11. Create Firestore indexes (power_logs + notifications)
[ ] 12. Flash ESP32 with updated firmware
[ ] 13. Sign up in app → Add device (ID: SPM-A1B2C3, Password: spm2026)
[ ] 14. Run seed-demo-data.mjs (optional, for demo data)
[ ] 15. Deploy to Netlify with env vars
```

---

*Last updated: April 2026*
