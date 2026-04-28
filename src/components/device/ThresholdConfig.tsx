import { useState } from 'react';
import { AlertTriangle, Bell, Power, Save } from 'lucide-react';
import { setThreshold } from '../../lib/realtimeDb';
import type { Threshold } from '../../types';
import toast from 'react-hot-toast';
import Spinner from '../ui/Spinner';

interface Props {
  deviceId: string;
  threshold: Threshold | undefined;
}

type ThresholdAction = 'notify' | 'turnoff' | 'both';

export default function ThresholdConfig({ deviceId, threshold }: Props) {
  const [enabled, setEnabled] = useState(threshold?.enabled ?? false);
  const [value, setValue] = useState(threshold?.value?.toString() ?? '5');
  const [unit, setUnit] = useState<'Wh' | 'kWh'>(threshold?.unit ?? 'kWh');
  const [action, setAction] = useState<ThresholdAction>(threshold?.action ?? 'notify');
  const [saving, setSaving] = useState(false);

  const actions: { key: ThresholdAction; label: string; icon: typeof Bell; color: string }[] = [
    { key: 'notify',  label: 'Notify only',    icon: Bell,          color: 'text-blue-400' },
    { key: 'turnoff', label: 'Turn off power', icon: Power,         color: 'text-red-400' },
    { key: 'both',    label: 'Notify + Turn off', icon: AlertTriangle, color: 'text-amber-400' },
  ];

  const handleSave = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return toast.error('Please enter a valid threshold value');
    setSaving(true);
    try {
      await setThreshold(deviceId, { enabled, value: numValue, unit, action });
      toast.success(enabled ? `Threshold set: ${value} ${unit}` : 'Threshold disabled');
    } catch {
      toast.error('Failed to save threshold');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 className="text-white font-semibold">Power Threshold</h3>
          <p className="text-slate-400 text-xs">Take action when energy limit is reached</p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
        <div>
          <p className="text-white text-sm font-medium">Enable Threshold</p>
          <p className="text-slate-400 text-xs mt-0.5">Monitor energy and trigger actions</p>
        </div>
        <button
          id="threshold-toggle"
          onClick={() => setEnabled(!enabled)}
          className={`relative w-12 h-6 rounded-full transition-all duration-300 ${enabled ? 'bg-amber-500' : 'bg-slate-600'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className={`space-y-4 transition-opacity duration-200 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        {/* Value + Unit */}
        <div className="space-y-1.5">
          <label className="text-sm text-slate-300 font-medium">Threshold Value</label>
          <div className="flex gap-2">
            <input
              id="threshold-value"
              type="number"
              min="0"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="5"
              className="input-field flex-1"
            />
            <div className="flex bg-slate-800/80 border border-slate-600/50 rounded-xl overflow-hidden">
              {(['Wh', 'kWh'] as const).map((u) => (
                <button
                  key={u}
                  id={`threshold-unit-${u.toLowerCase()}`}
                  onClick={() => setUnit(u)}
                  className={`px-3 py-3 text-sm font-medium transition-all ${unit === u ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="space-y-2">
          <label className="text-sm text-slate-300 font-medium">When Reached</label>
          <div className="space-y-2">
            {actions.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                id={`threshold-action-${key}`}
                onClick={() => setAction(key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all
                           ${action === key
                             ? 'border-amber-500/50 bg-amber-500/10'
                             : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/30'}`}
              >
                <div className={`p-1.5 rounded-lg ${action === key ? 'bg-amber-500/20' : 'bg-slate-700/50'}`}>
                  <Icon size={14} className={action === key ? color : 'text-slate-500'} />
                </div>
                <span className={`text-sm font-medium ${action === key ? 'text-white' : 'text-slate-400'}`}>{label}</span>
                {action === key && <div className="ml-auto w-2 h-2 bg-amber-400 rounded-full" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        id="threshold-save"
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {saving ? <Spinner size="sm" /> : <Save size={16} />}
        {saving ? 'Saving…' : 'Save Threshold'}
      </button>
    </div>
  );
}
