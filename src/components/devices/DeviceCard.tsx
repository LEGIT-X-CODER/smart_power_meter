import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, WifiOff, Zap, Home, ChevronRight } from 'lucide-react';
import { listenToDevice, isDeviceOnline, setSwitchState } from '../../lib/realtimeDb';
import type { DeviceMetadata, DeviceRTDB } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  device: DeviceMetadata;
}

export default function DeviceCard({ device }: Props) {
  const navigate = useNavigate();
  const [rtdb, setRtdb] = useState<DeviceRTDB | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const unsub = listenToDevice(device.id, setRtdb);
    return unsub;
  }, [device.id]);

  const online = rtdb ? isDeviceOnline(rtdb.heartbeat) : false;
  const switchOn = rtdb?.switchState ?? false;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!online) { toast.error('Device is offline'); return; }
    setToggling(true);
    try {
      await setSwitchState(device.id, !switchOn, true);
    } catch {
      toast.error('Failed to toggle device');
    } finally {
      setToggling(false);
    }
  };

  const power = rtdb?.live?.currentPower ?? 0;

  return (
    <div
      id={`device-card-${device.id}`}
      onClick={() => navigate(`/device/${device.id}`)}
      className="glass-card-hover p-4 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all
                        ${switchOn && online
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-slate-700/50 text-slate-500'}`}>
          <Zap size={20} className={switchOn && online ? 'drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]' : ''} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold text-sm truncate">{device.name}</p>
            <span className={online ? 'status-online' : 'status-offline'}>
              {online ? <Wifi size={8} /> : <WifiOff size={8} />}
              {online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Home size={11} className="text-slate-500" />
            <p className="text-slate-400 text-xs truncate">{device.room}</p>
            {online && (
              <span className="text-slate-500 text-xs ml-1">· {power.toFixed(1)} W</span>
            )}
          </div>
        </div>

        {/* Quick Toggle */}
        <div className="flex items-center gap-2">
          <button
            id={`toggle-${device.id}`}
            onClick={handleToggle}
            disabled={toggling}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none
                       ${switchOn && online ? 'bg-cyan-500' : 'bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300
                             ${switchOn && online ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <ChevronRight size={16} className="text-slate-600" />
        </div>
      </div>

      {/* Power bar */}
      {online && power > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/30 flex items-center gap-2">
          <Zap size={12} className="text-amber-400" />
          <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((power / 3000) * 100, 100)}%` }}
            />
          </div>
          <span className="text-slate-400 text-xs">{power.toFixed(0)} W</span>
        </div>
      )}
    </div>
  );
}
