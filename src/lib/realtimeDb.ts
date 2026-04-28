// Firebase Realtime Database helpers
import {
  ref, set, get, onValue, off, update
} from 'firebase/database';
import { rtdb } from './firebase';
import type { DeviceRTDB, LiveMetrics, Schedule, Threshold, DeviceRegistryEntry } from '../types';

const HEARTBEAT_TIMEOUT_MS = 30_000; // 30 seconds

// ── Online detection ──────────────────────────────────────────
export function isDeviceOnline(heartbeat: number): boolean {
  return Date.now() - heartbeat < HEARTBEAT_TIMEOUT_MS;
}

// ── Device Registry (for linking devices) ──────────────────────
export async function getDeviceRegistryEntry(
  deviceId: string
): Promise<DeviceRegistryEntry | null> {
  const snap = await get(ref(rtdb, `device_registry/${deviceId}`));
  return snap.exists() ? (snap.val() as DeviceRegistryEntry) : null;
}

export async function linkDeviceToUser(deviceId: string, userId: string): Promise<void> {
  await update(ref(rtdb, `device_registry/${deviceId}`), { linkedTo: userId });
}

export async function unlinkDevice(deviceId: string): Promise<void> {
  await update(ref(rtdb, `device_registry/${deviceId}`), { linkedTo: null });
}

// ── Device RTDB data ──────────────────────────────────────────
export async function getDeviceData(deviceId: string): Promise<DeviceRTDB | null> {
  const snap = await get(ref(rtdb, `devices/${deviceId}`));
  return snap.exists() ? (snap.val() as DeviceRTDB) : null;
}

export function listenToDevice(
  deviceId: string,
  callback: (data: DeviceRTDB | null) => void
) {
  const deviceRef = ref(rtdb, `devices/${deviceId}`);
  onValue(deviceRef, (snap) => {
    callback(snap.exists() ? (snap.val() as DeviceRTDB) : null);
  });
  return () => off(deviceRef);
}

// ── Switch Control ─────────────────────────────────────────────
export async function setSwitchState(
  deviceId: string,
  state: boolean,
  isManual = true
): Promise<void> {
  await update(ref(rtdb, `devices/${deviceId}`), {
    switchState: state,
    manualOverride: isManual,
    lastCommand: Date.now(),
  });
}

// ── Schedule ──────────────────────────────────────────────────
export async function setSchedule(deviceId: string, schedule: Schedule): Promise<void> {
  await set(ref(rtdb, `devices/${deviceId}/schedule`), schedule);
}

// ── Threshold ─────────────────────────────────────────────────
export async function setThreshold(deviceId: string, threshold: Threshold): Promise<void> {
  await set(ref(rtdb, `devices/${deviceId}/threshold`), threshold);
}

// ── Live metrics listener ─────────────────────────────────────
export function listenToLiveMetrics(
  deviceId: string,
  callback: (metrics: LiveMetrics | null) => void
) {
  const metricsRef = ref(rtdb, `devices/${deviceId}/live`);
  onValue(metricsRef, (snap) => {
    callback(snap.exists() ? (snap.val() as LiveMetrics) : null);
  });
  return () => off(metricsRef);
}

// ── Heartbeat listener ────────────────────────────────────────
export function listenToHeartbeat(
  deviceId: string,
  callback: (heartbeat: number) => void
) {
  const hbRef = ref(rtdb, `devices/${deviceId}/heartbeat`);
  onValue(hbRef, (snap) => {
    if (snap.exists()) callback(snap.val() as number);
  });
  return () => off(hbRef);
}

// ── Initialize device in RTDB (first time) ────────────────────
export async function initializeDeviceRTDB(deviceId: string): Promise<void> {
  const existing = await getDeviceData(deviceId);
  if (!existing) {
    await set(ref(rtdb, `devices/${deviceId}`), {
      heartbeat: 0,
      switchState: false,
      manualOverride: false,
      live: { voltage: 0, current: 0, currentPower: 0, totalEnergy: 0 },
      schedule: { enabled: false, shutdownTimestamp: 0, startTimestamp: 0 },
      threshold: { enabled: false, value: 5, unit: 'kWh', action: 'notify' },
    } as DeviceRTDB);
  }
}
