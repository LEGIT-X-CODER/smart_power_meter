// Firestore helper functions
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit,
  getDocs, addDoc, onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, DeviceMetadata, PowerLog, AppNotification } from '../types';

// ── User Profile ──────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data as Record<string, unknown>);
}

// ── Devices (Firestore metadata) ──────────────────────────────
export async function addDeviceToUser(uid: string, deviceId: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const devices: string[] = snap.data().devices || [];
    if (!devices.includes(deviceId)) {
      await updateDoc(userRef, { devices: [...devices, deviceId] });
    }
  }
}

export async function removeDeviceFromUser(uid: string, deviceId: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const devices: string[] = snap.data().devices || [];
    await updateDoc(userRef, { devices: devices.filter((d) => d !== deviceId) });
  }
}

export async function getDeviceMetadata(deviceId: string): Promise<DeviceMetadata | null> {
  const snap = await getDoc(doc(db, 'devices', deviceId));
  return snap.exists() ? ({ id: deviceId, ...snap.data() } as DeviceMetadata) : null;
}

export async function setDeviceMetadata(deviceId: string, data: Partial<DeviceMetadata>): Promise<void> {
  await setDoc(doc(db, 'devices', deviceId), data, { merge: true });
}

export async function deleteDeviceMetadata(deviceId: string): Promise<void> {
  await deleteDoc(doc(db, 'devices', deviceId));
}

// ── Power Logs ────────────────────────────────────────────────
export async function getPowerLogs(
  deviceId: string,
  period: 'minute' | 'daily' | 'weekly' | 'monthly'
): Promise<PowerLog[]> {
  const now = Date.now();
  const periodMs = {
    minute: 60 * 60 * 1000,      // last 1 hour (60 minute entries)
    daily:  24 * 60 * 60 * 1000, // last 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };
  const since = now - periodMs[period];

  const q = query(
    collection(db, 'power_logs'),
    where('deviceId', '==', deviceId),
    where('timestamp', '>=', since),
    orderBy('timestamp', 'asc'),
    limit(500)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PowerLog));
}

export function listenToPowerLogs(
  deviceId: string,
  period: 'minute' | 'daily' | 'weekly' | 'monthly',
  callback: (logs: PowerLog[]) => void
) {
  const now = Date.now();
  const periodMs = {
    minute: 60 * 60 * 1000,
    daily:  24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };
  const since = now - periodMs[period];
  const q = query(
    collection(db, 'power_logs'),
    where('deviceId', '==', deviceId),
    where('timestamp', '>=', since),
    orderBy('timestamp', 'asc'),
    limit(500)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PowerLog)));
  });
}

export async function addPowerLog(log: Omit<PowerLog, 'id'>): Promise<void> {
  await addDoc(collection(db, 'power_logs'), log);
}

export async function resetDeviceLogs(deviceId: string): Promise<void> {
  const q = query(collection(db, 'power_logs'), where('deviceId', '==', deviceId), limit(500));
  const snap = await getDocs(q);
  const deletes = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletes);
}

// ── Notifications ─────────────────────────────────────────────
export function listenToNotifications(
  userId: string,
  callback: (notifs: AppNotification[]) => void
) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification)));
  });
}

export async function markNotificationRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { read: true })));
}

export async function createNotification(notif: Omit<AppNotification, 'id'>): Promise<void> {
  await addDoc(collection(db, 'notifications'), notif);
}
