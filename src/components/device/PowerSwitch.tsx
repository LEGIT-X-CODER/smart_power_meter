import { useState } from 'react';
import { Power, Wifi, WifiOff, Clock } from 'lucide-react';
import { setSwitchState } from '../../lib/realtimeDb';
import type { DeviceRTDB } from '../../types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  deviceId: string;
  rtdb: DeviceRTDB | null;
  online: boolean;
}

export default function PowerSwitch({ deviceId, rtdb, online }: Props) {
  const [toggling, setToggling] = useState(false);
  const switchOn = rtdb?.switchState ?? false;

  const handleToggle = async () => {
    setToggling(true);
    try {
      await setSwitchState(deviceId, !switchOn, true);
      toast.success(switchOn ? '🔴 Device turned OFF' : '🟢 Device turned ON');
    } catch {
      toast.error('Failed to control device');
    } finally {
      setToggling(false);
    }
  };

  const lastSeen = rtdb?.heartbeat
    ? formatDistanceToNow(rtdb.heartbeat, { addSuffix: true })
    : 'never';

  return (
    <div className="glass-card p-6 flex flex-col items-center gap-4">
      {/* Status badge */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                      ${online ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
        <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
        {online ? 'Device Online' : 'Device Offline'}
        {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      </div>

      {/* Power Button */}
      <div className="relative">
        {/* Outer ring animation when ON */}
        {switchOn && online && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping scale-125" />
            <div className="absolute inset-0 rounded-full border border-cyan-400/20 scale-150 animate-pulse-slow" />
          </>
        )}

        <button
          id="power-switch-btn"
          onClick={handleToggle}
          disabled={toggling || !online}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center
                     transition-all duration-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed
                     ${switchOn && online
                       ? 'bg-gradient-to-br from-cyan-500 to-blue-600 switch-on'
                       : 'bg-slate-800 border-2 border-slate-600 switch-off'
                     }`}
        >
          <Power
            size={48}
            className={`transition-all duration-300 ${
              switchOn && online
                ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                : 'text-slate-500'
            } ${toggling ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* State text */}
      <div className="text-center">
        <p className={`text-2xl font-bold ${switchOn && online ? 'gradient-text' : 'text-slate-500'}`}>
          {switchOn ? 'ON' : 'OFF'}
        </p>
        <p className="text-slate-500 text-xs mt-0.5">
          {toggling ? 'Updating…' : 'Tap to toggle power'}
        </p>
        {rtdb?.manualOverride && (
          <p className="text-amber-400 text-xs mt-1">⚡ Manual override active</p>
        )}
      </div>

      {/* Last heartbeat */}
      <div className="flex items-center gap-1.5 text-slate-500 text-xs">
        <Clock size={12} />
        <span>Last seen {lastSeen}</span>
      </div>
    </div>
  );
}
