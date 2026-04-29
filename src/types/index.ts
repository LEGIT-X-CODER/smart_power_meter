// TypeScript type definitions for Smart Power Meter

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  devices: string[];
  createdAt: number;
  fcmToken?: string;
}

export interface DeviceMetadata {
  id: string;
  name: string;
  room: string;
  ownerId: string;
  firmwareVersion: string;
  addedAt: number;
}

export interface DeviceRegistryEntry {
  password: string;
  linkedTo: string | null;
  firmwareVersion: string;
  registeredAt: number;
}

export interface LiveMetrics {
  voltage: number;
  current: number;
  currentPower: number;
  totalEnergy: number;
}

export interface Schedule {
  enabled: boolean;
  shutdownTimestamp: number;
  startTimestamp: number;
}

export interface Threshold {
  enabled: boolean;
  value: number;
  unit: 'Wh' | 'kWh';
  action: 'notify' | 'turnoff' | 'both';
}

export interface DeviceRTDB {
  heartbeat: number;
  switchState: boolean;
  manualOverride: boolean;
  live: LiveMetrics;
  schedule: Schedule;
  threshold: Threshold;
}

export interface PowerLog {
  id: string;
  deviceId: string;
  voltage: number;
  current: number;
  power: number;
  totalEnergy: number;
  timestamp: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  deviceId: string;
  deviceName?: string;
  type: 'threshold' | 'schedule' | 'offline' | 'high_consumption' | 'manual_override' | 'online';
  message: string;
  read: boolean;
  createdAt: number;
}

export interface Device extends DeviceMetadata {
  rtdb?: DeviceRTDB;
  isOnline: boolean;
}

export type LogPeriod = 'minute' | 'daily' | 'weekly' | 'monthly';
