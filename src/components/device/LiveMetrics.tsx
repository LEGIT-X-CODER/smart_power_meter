import { useState, useEffect } from 'react';
import { Zap, Activity, Gauge, BatteryCharging, IndianRupee, Settings2 } from 'lucide-react';
import { ref, get, set } from 'firebase/database';
import { rtdb } from '../../lib/firebase';
import type { DeviceRTDB } from '../../types';

interface Props {
  deviceId: string;
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

export default function LiveMetrics({ deviceId, rtdb: deviceRtdb, online }: Props) {
  const live = deviceRtdb?.live;

  // Rate setting (₹ per kWh)
  const [rate, setRate] = useState(8.0); // default ₹8/kWh
  const [editingRate, setEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState('8');

  // Load saved rate from RTDB
  useEffect(() => {
    if (!deviceId) return;
    get(ref(rtdb, `devices/${deviceId}/settings/ratePerKwh`)).then((snap) => {
      if (snap.exists()) {
        setRate(snap.val());
        setTempRate(snap.val().toString());
      }
    });
  }, [deviceId]);

  const saveRate = async () => {
    const val = parseFloat(tempRate);
    if (isNaN(val) || val <= 0) return;
    setRate(val);
    setEditingRate(false);
    await set(ref(rtdb, `devices/${deviceId}/settings/ratePerKwh`), val);
  };

  // Cost calculation
  const energyKwh = (live?.totalEnergy ?? 0) / 1000;
  const totalCost = energyKwh * rate;

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

      {/* Cost Card */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-orange-500/10 opacity-50" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-orange-500/10 text-orange-400 p-1.5 rounded-lg">
                <IndianRupee size={14} />
              </div>
              <span className="text-slate-400 text-xs font-medium">Estimated Cost</span>
            </div>
            <button
              id="edit-rate-btn"
              onClick={() => { setEditingRate(!editingRate); setTempRate(rate.toString()); }}
              className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50"
            >
              <Settings2 size={14} />
            </button>
          </div>

          {online ? (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-orange-400">₹{totalCost.toFixed(2)}</span>
              <span className="text-slate-400 text-sm">({energyKwh.toFixed(3)} kWh)</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-600">—</span>
            </div>
          )}

          <p className="text-slate-500 text-xs mt-1">
            Rate: ₹{rate.toFixed(2)}/kWh
          </p>

          {/* Rate editor */}
          {editingRate && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <label className="text-sm text-slate-300 font-medium mb-1.5 block">
                Electricity Rate (₹ per kWh)
              </label>
              <div className="flex gap-2">
                <input
                  id="rate-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={tempRate}
                  onChange={(e) => setTempRate(e.target.value)}
                  className="input-field flex-1"
                  placeholder="8.0"
                />
                <button
                  id="rate-save-btn"
                  onClick={saveRate}
                  className="btn-primary px-4 text-sm"
                >
                  Save
                </button>
              </div>
              <p className="text-slate-500 text-[10px] mt-1.5">
                Common rates: ₹3-5 (subsidized), ₹6-8 (domestic), ₹8-12 (commercial)
              </p>
            </div>
          )}
        </div>
      </div>

      {!online && (
        <div className="text-center py-2">
          <p className="text-slate-500 text-sm">Live metrics unavailable — device is offline</p>
        </div>
      )}
    </div>
  );
}
