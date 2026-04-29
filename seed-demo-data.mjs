/**
 * Demo Data Seeder for Smart Power Meter
 * 
 * Run: node seed-demo-data.mjs
 * 
 * This creates ~24 hours of realistic power log data
 * in Firestore + sample notifications + RTDB test data.
 * 
 * Prerequisites:
 *   npm install firebase
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, doc, setDoc,
} from 'firebase/firestore';
import { getDatabase, ref, set } from 'firebase/database';

// ── Firebase config (same as app) ──
const firebaseConfig = {
  apiKey: "AIzaSyA7O47MgXjq--BX28pVK9eI5HaNkYbHu1Y",
  authDomain: "smart-home-bc589.firebaseapp.com",
  databaseURL: "https://smart-home-bc589-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-home-bc589",
  storageBucket: "smart-home-bc589.firebasestorage.app",
  messagingSenderId: "681981170855",
  appId: "1:681981170855:web:d1157167977b2f8600b782",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// ── Configuration ──
const DEVICE_ID = 'SPM-A1B2C3';
// ⚠️ REPLACE with your actual Firebase Auth UID after signing up in the app
const USER_ID = 'YOUR_USER_UID_HERE';

// ── Helpers ──
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function simulateReading(hour) {
  // Simulate realistic Indian household patterns
  // Low load at night, peaks in morning and evening
  let baseLoad;

  if (hour >= 0 && hour < 6) {
    baseLoad = randomBetween(20, 60);       // Night: fans, fridge
  } else if (hour >= 6 && hour < 9) {
    baseLoad = randomBetween(200, 500);     // Morning: geyser, appliances
  } else if (hour >= 9 && hour < 12) {
    baseLoad = randomBetween(80, 200);      // Late morning: light load
  } else if (hour >= 12 && hour < 15) {
    baseLoad = randomBetween(150, 400);     // Afternoon: AC, cooking
  } else if (hour >= 15 && hour < 18) {
    baseLoad = randomBetween(100, 250);     // Afternoon: moderate
  } else if (hour >= 18 && hour < 21) {
    baseLoad = randomBetween(300, 700);     // Evening peak: lights, TV, AC, cooking
  } else {
    baseLoad = randomBetween(50, 150);      // Late night: winding down
  }

  // Add some random noise
  const power = baseLoad + randomBetween(-20, 20);
  const voltage = randomBetween(215, 245);
  const current = power / voltage;

  return {
    voltage: parseFloat(voltage.toFixed(1)),
    current: parseFloat(current.toFixed(3)),
    power: parseFloat(power.toFixed(1)),
  };
}

// ── 1. Seed Power Logs (Firestore) ──
async function seedPowerLogs() {
  console.log('📊 Seeding power logs (last 7 days)...');

  const now = Date.now();
  let totalEnergy = 0;
  let count = 0;

  // Generate logs every 1 minute for past 7 days
  // That's ~10080 entries — let's do every 5 minutes = ~2016 entries
  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const DAYS = 7;
  const startTime = now - (DAYS * 24 * 60 * 60 * 1000);

  for (let ts = startTime; ts <= now; ts += INTERVAL_MS) {
    const date = new Date(ts);
    const hour = date.getHours();
    const reading = simulateReading(hour);

    // Accumulate energy (Wh)
    const dtHours = INTERVAL_MS / 3600000;
    totalEnergy += reading.power * dtHours;

    const logData = {
      deviceId: DEVICE_ID,
      voltage: reading.voltage,
      current: reading.current,
      power: reading.power,
      totalEnergy: parseFloat(totalEnergy.toFixed(2)),
      timestamp: ts,
    };

    await addDoc(collection(db, 'power_logs'), logData);
    count++;

    if (count % 100 === 0) {
      console.log(`  ... ${count} logs created (${new Date(ts).toLocaleString()})`);
    }
  }

  console.log(`✅ Created ${count} power log entries`);
  console.log(`   Total simulated energy: ${(totalEnergy / 1000).toFixed(2)} kWh`);
  return totalEnergy;
}

// ── 2. Seed Notifications (Firestore) ──
async function seedNotifications() {
  console.log('🔔 Seeding notifications...');

  if (USER_ID === 'YOUR_USER_UID_HERE') {
    console.log('  ⚠️ Skipping notifications — set USER_ID first');
    return;
  }

  const now = Date.now();
  const notifications = [
    {
      userId: USER_ID,
      deviceId: DEVICE_ID,
      deviceName: 'Smart Meter',
      type: 'threshold',
      message: '⚠️ Energy threshold reached — Smart Meter action triggered (5 kWh limit)',
      read: false,
      createdAt: now - 2 * 60 * 60 * 1000,   // 2 hours ago
    },
    {
      userId: USER_ID,
      deviceId: DEVICE_ID,
      deviceName: 'Smart Meter',
      type: 'schedule',
      message: '⏰ Schedule triggered — Smart Meter was turned OFF automatically at 22:00',
      read: false,
      createdAt: now - 10 * 60 * 60 * 1000,  // 10 hours ago
    },
    {
      userId: USER_ID,
      deviceId: DEVICE_ID,
      deviceName: 'Smart Meter',
      type: 'high_consumption',
      message: '⚡ High power consumption detected — Smart Meter drawing 650W',
      read: true,
      createdAt: now - 18 * 60 * 60 * 1000,  // 18 hours ago
    },
    {
      userId: USER_ID,
      deviceId: DEVICE_ID,
      deviceName: 'Smart Meter',
      type: 'online',
      message: '✅ Smart Meter is back online',
      read: true,
      createdAt: now - 24 * 60 * 60 * 1000,  // 1 day ago
    },
    {
      userId: USER_ID,
      deviceId: DEVICE_ID,
      deviceName: 'Smart Meter',
      type: 'offline',
      message: '🔴 Smart Meter went offline — no heartbeat for 30s',
      read: true,
      createdAt: now - 25 * 60 * 60 * 1000,  // 25 hours ago
    },
    {
      userId: USER_ID,
      deviceId: DEVICE_ID,
      deviceName: 'Smart Meter',
      type: 'schedule',
      message: '⏰ Schedule triggered — Smart Meter turned OFF at 23:00',
      read: true,
      createdAt: now - 2 * 24 * 60 * 60 * 1000,  // 2 days ago
    },
  ];

  for (const notif of notifications) {
    await addDoc(collection(db, 'notifications'), notif);
  }

  console.log(`✅ Created ${notifications.length} notifications`);
}

// ── 3. Update RTDB with live demo data ──
async function seedRTDB(totalEnergy) {
  console.log('🔥 Updating RTDB with live demo data...');

  const now = Date.now();

  await set(ref(rtdb, `devices/${DEVICE_ID}`), {
    heartbeat: now,
    switchState: true,
    manualOverride: false,
    lastCommand: now - 600000,
    live: {
      voltage: 232.5,
      current: 1.85,
      currentPower: 430.1,
      totalEnergy: parseFloat((totalEnergy).toFixed(2)),
    },
    schedule: {
      enabled: false,
      shutdownTimestamp: 0,
      startTimestamp: 0,
    },
    threshold: {
      enabled: true,
      value: 50,
      unit: 'kWh',
      action: 'both',
    },
    settings: {
      ratePerKwh: 8.0,
    },
  });

  // Device registry
  await set(ref(rtdb, `device_registry/${DEVICE_ID}`), {
    password: 'spm2026',
    linkedTo: USER_ID === 'YOUR_USER_UID_HERE' ? null : USER_ID,
    firmwareVersion: '1.0.0',
    registeredAt: now - 30 * 24 * 60 * 60 * 1000,
  });

  console.log('✅ RTDB updated with demo live data');
}

// ── 4. Seed Firestore device metadata ──
async function seedDeviceMetadata() {
  console.log('📱 Seeding device metadata...');

  if (USER_ID === 'YOUR_USER_UID_HERE') {
    console.log('  ⚠️ Skipping device metadata — set USER_ID first');
    return;
  }

  await setDoc(doc(db, 'devices', DEVICE_ID), {
    id: DEVICE_ID,
    name: 'Smart Meter',
    room: 'Living Room',
    ownerId: USER_ID,
    firmwareVersion: '1.0.0',
    addedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  }, { merge: true });

  console.log('✅ Device metadata created');
}

// ── Run all ──
async function main() {
  console.log('');
  console.log('🚀 Smart Power Meter — Demo Data Seeder');
  console.log('========================================');
  console.log(`Device: ${DEVICE_ID}`);
  console.log(`User:   ${USER_ID}`);
  console.log('');

  try {
    const totalEnergy = await seedPowerLogs();
    await seedNotifications();
    await seedRTDB(totalEnergy);
    await seedDeviceMetadata();

    console.log('');
    console.log('🎉 All demo data seeded successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Sign up / log in to the app');
    console.log('  2. Copy your UID from Firebase Console → Authentication');
    console.log(`  3. If USER_ID was placeholder, re-run with your UID`);
    console.log(`  4. Add device ${DEVICE_ID} with password: spm2026`);
    console.log('');
  } catch (err) {
    console.error('❌ Error:', err);
  }

  process.exit(0);
}

main();
