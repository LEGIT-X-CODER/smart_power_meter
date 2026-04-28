import { useEffect, useState } from 'react';
import { Cpu, Wifi, WifiOff, BatteryCharging, Activity, Bell } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import StatCard from '../components/ui/StatCard';
import DeviceCard from '../components/devices/DeviceCard';
import { useAuth } from '../contexts/AuthContext';
import { getDeviceMetadata, listenToNotifications } from '../lib/firestore';
import { listenToDevice, isDeviceOnline } from '../lib/realtimeDb';
import type { DeviceMetadata, AppNotification, DeviceRTDB } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';


interface DeviceState {
  meta: DeviceMetadata;
  rtdb: DeviceRTDB | null;
}

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DeviceState[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubscribers: (() => void)[] = [];

  useEffect(() => {
    if (!userProfile?.devices?.length) { setLoading(false); return; }

    const loadDevices = async () => {
      const metas = await Promise.all(
        userProfile.devices.map((id) => getDeviceMetadata(id))
      );
      const validMetas = metas.filter(Boolean) as DeviceMetadata[];

      const deviceStates: DeviceState[] = validMetas.map((meta) => ({
        meta,
        rtdb: null,
      }));
      setDevices(deviceStates);
      setLoading(false);

      // Subscribe to realtime data
      validMetas.forEach((meta, i) => {
        const unsub = listenToDevice(meta.id, (data) => {
          setDevices((prev) => {
            const updated = [...prev];
            if (updated[i]) updated[i] = { ...updated[i], rtdb: data };
            return updated;
          });
        });
        unsubscribers.push(unsub);
      });
    };

    loadDevices();
    return () => unsubscribers.forEach((u) => u());
  }, [userProfile?.devices?.join(',')]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToNotifications(user.uid, setNotifications);
    return unsub;
  }, [user]);

  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.rtdb && isDeviceOnline(d.rtdb.heartbeat)).length;
  const offlineDevices = totalDevices - onlineDevices;

  const totalEnergyToday = devices.reduce((acc, d) => acc + (d.rtdb?.live?.totalEnergy ?? 0), 0);
  const recentNotifs = notifications.slice(0, 5);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getHour = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-[#040d1a]">
      <TopBar
        title="Dashboard"
        right={
          <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        }
      />

      <div className="page-container space-y-6 animate-fade-in">
        {/* Greeting */}
        <div className="pt-2">
          <p className="text-slate-400 text-sm">{getHour()},</p>
          <h2 className="text-2xl font-bold text-white">{userProfile?.displayName || 'User'} 👋</h2>
        </div>

        {/* Hero energy card */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-cyan-600 to-blue-700">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-cyan-100 text-sm font-medium">Total Energy Today</p>
                <p className="text-white text-4xl font-bold mt-1">
                  {totalEnergyToday >= 1000
                    ? `${(totalEnergyToday / 1000).toFixed(2)} kWh`
                    : `${totalEnergyToday.toFixed(0)} Wh`}
                </p>
                <p className="text-cyan-200 text-sm mt-1">Across {totalDevices} device{totalDevices !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <BatteryCharging size={24} className="text-white" />
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className="text-cyan-100 text-xs">{onlineDevices} online</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <span className="text-cyan-100 text-xs">{offlineDevices} offline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard title="Total Devices" value={totalDevices} icon={Cpu} iconColor="text-blue-400" bgColor="bg-blue-500/10" />
          <StatCard title="Online Now" value={onlineDevices} icon={Wifi} iconColor="text-emerald-400" bgColor="bg-emerald-500/10" />
          <StatCard title="Offline" value={offlineDevices} icon={WifiOff} iconColor="text-red-400" bgColor="bg-red-500/10" />
          <StatCard title="Alerts" value={unreadCount} icon={Bell} iconColor="text-amber-400" bgColor="bg-amber-500/10"
            onClick={() => navigate('/notifications')} />
        </div>

        {/* Devices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title mb-0">My Devices</h3>
            <button onClick={() => navigate('/devices')} className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">See all</button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 glass-card relative overflow-hidden">
                  <div className="absolute inset-0 shimmer" />
                </div>
              ))}
            </div>
          ) : devices.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Cpu size={40} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No devices yet</p>
              <p className="text-slate-500 text-sm mt-1">Go to Devices tab to add your first device</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.slice(0, 3).map((d) => (
                <DeviceCard key={d.meta.id} device={d.meta} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        {recentNotifs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title mb-0">Recent Alerts</h3>
              <button onClick={() => navigate('/notifications')} className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">See all</button>
            </div>
            <div className="space-y-2">
              {recentNotifs.map((n) => (
                <div key={n.id} className={`glass-card p-3 flex items-start gap-3 ${!n.read ? 'border-l-2 border-l-cyan-500' : ''}`}>
                  <Activity size={16} className={`shrink-0 mt-0.5 ${
                    n.type === 'offline' ? 'text-red-400' :
                    n.type === 'threshold' ? 'text-amber-400' : 'text-cyan-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{n.message}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{formatDistanceToNow(n.createdAt, { addSuffix: true })}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-cyan-500 rounded-full mt-1.5 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
