import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Power, Activity, BarChart2, Clock, AlertTriangle, Settings } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import PowerSwitch from '../components/device/PowerSwitch';
import LiveMetrics from '../components/device/LiveMetrics';
import PowerLogs from '../components/device/PowerLogs';
import ScheduleTimer from '../components/device/ScheduleTimer';
import ThresholdConfig from '../components/device/ThresholdConfig';
import DeviceSettings from '../components/device/DeviceSettings';
import { getDeviceMetadata, createNotification } from '../lib/firestore';
import { listenToDevice, isDeviceOnline } from '../lib/realtimeDb';
import { useAuth } from '../contexts/AuthContext';
import type { DeviceMetadata, DeviceRTDB } from '../types';
import Spinner from '../components/ui/Spinner';

const TABS = [
  { key: 'control',   label: 'Control',   icon: Power },
  { key: 'metrics',   label: 'Live',      icon: Activity },
  { key: 'logs',      label: 'Logs',      icon: BarChart2 },
  { key: 'schedule',  label: 'Schedule',  icon: Clock },
  { key: 'threshold', label: 'Threshold', icon: AlertTriangle },
  { key: 'settings',  label: 'Settings',  icon: Settings },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [device, setDevice] = useState<DeviceMetadata | null>(null);
  const [rtdb, setRtdb] = useState<DeviceRTDB | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('control');
  const [loading, setLoading] = useState(true);

  // Track previous state for detecting transitions
  const prevRtdb = useRef<DeviceRTDB | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!id) return;
    getDeviceMetadata(id).then((meta) => {
      setDevice(meta);
      setLoading(false);
    });
    const unsub = listenToDevice(id, setRtdb);
    return unsub;
  }, [id]);

  // Detect schedule/threshold triggers and create notifications
  useEffect(() => {
    if (!rtdb || !id || !user || !device) return;

    // Skip the very first load to avoid false triggers
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevRtdb.current = rtdb;
      return;
    }

    const prev = prevRtdb.current;

    // Schedule triggered: enabled went from true → false
    if (prev?.schedule?.enabled === true && rtdb.schedule?.enabled === false) {
      createNotification({
        userId: user.uid,
        deviceId: id,
        deviceName: device.name,
        type: 'schedule',
        message: `⏰ Schedule triggered — ${device.name} was turned OFF automatically`,
        read: false,
        createdAt: Date.now(),
      }).catch(console.error);
    }

    // Threshold triggered: enabled went from true → false
    if (prev?.threshold?.enabled === true && rtdb.threshold?.enabled === false) {
      createNotification({
        userId: user.uid,
        deviceId: id,
        deviceName: device.name,
        type: 'threshold',
        message: `⚠️ Energy threshold reached — ${device.name} action triggered`,
        read: false,
        createdAt: Date.now(),
      }).catch(console.error);
    }

    prevRtdb.current = rtdb;
  }, [rtdb, id, user, device]);

  const online = rtdb ? isDeviceOnline(rtdb.heartbeat) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040d1a] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen bg-[#040d1a] flex items-center justify-center">
        <p className="text-slate-400">Device not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040d1a]">
      <TopBar title={device.name} showBack />

      {/* Tabs */}
      <div className="sticky top-[57px] z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/30">
        <div className="flex overflow-x-auto scrollbar-none max-w-lg mx-auto px-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              id={`tab-${key}`}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all
                         ${activeTab === key
                           ? 'border-cyan-500 text-cyan-400'
                           : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-container animate-fade-in">
        {activeTab === 'control' && (
          <div className="space-y-4">
            <PowerSwitch deviceId={device.id} rtdb={rtdb} online={online} />
            <LiveMetrics deviceId={device.id} rtdb={rtdb} online={online} />
          </div>
        )}

        {activeTab === 'metrics' && (
          <LiveMetrics deviceId={device.id} rtdb={rtdb} online={online} />
        )}

        {activeTab === 'logs' && (
          <PowerLogs deviceId={device.id} />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTimer deviceId={device.id} schedule={rtdb?.schedule} />
        )}

        {activeTab === 'threshold' && (
          <ThresholdConfig deviceId={device.id} threshold={rtdb?.threshold} />
        )}

        {activeTab === 'settings' && (
          <DeviceSettings
            device={device}
            onRenamed={(name) => setDevice((d) => d ? { ...d, name } : d)}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
