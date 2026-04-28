import { Zap, Activity, Gauge, BatteryCharging } from 'lucide-react';
import type { DeviceRTDB } from '../../types';

interface Props {
  rtdb: DeviceRTDB | null;
  online: boolean;
}

interface MetricItem {
  label: string;
  value: string;
  unit: string;
  icon: typeof Zap;
  color: string;
  bg: string;
}

export default function LiveMetrics({ rtdb, online }: Props) {
  const live = rtdb?.live;

  const metrics: MetricItem[] = [
    {
      label: 'Voltage',
      value: live?.voltage?.toFixed(1) ?? '0.0',
      unit: 'V',
      icon: Zap,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Current',
      value: live?.current?.toFixed(2) ?? '0.00',
      unit: 'A',
      icon: Activity,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Power',
      value: live?.currentPower?.toFixed(1) ?? '0.0',
      unit: 'W',
      icon: Gauge,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Total Energy',
      value: live?.totalEnergy
        ? live.totalEnergy >= 1000
          ? (live.totalEnergy / 1000).toFixed(3)
          : live.totalEnergy.toFixed(1)
        : '0.0',
      unit: live?.totalEnergy && live.totalEnergy >= 1000 ? 'kWh' : 'Wh',
      icon: BatteryCharging,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="glass-card p-4 relative overflow-hidden">
            {/* Background pattern */}
            <div className={`absolute inset-0 ${m.bg} opacity-50`} />

            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className={`${m.bg} ${m.color} p-1.5 rounded-lg`}>
                  <m.icon size={14} />
                </div>
                <span className="text-slate-400 text-xs font-medium">{m.label}</span>
              </div>

              {online ? (
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${m.color}`}>{m.value}</span>
                  <span className="text-slate-400 text-sm">{m.unit}</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-600">—</span>
                </div>
              )}

              {/* Live indicator */}
              {online && (
                <div className="absolute top-0 right-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-400 text-[9px] font-medium">LIVE</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!online && (
        <div className="text-center py-2">
          <p className="text-slate-500 text-sm">Live metrics unavailable — device is offline</p>
        </div>
      )}
    </div>
  );
}
