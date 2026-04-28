import { useState } from 'react';
import { Clock, Power, Save } from 'lucide-react';
import { setSchedule } from '../../lib/realtimeDb';
import type { Schedule } from '../../types';
import toast from 'react-hot-toast';
import Spinner from '../ui/Spinner';

interface Props {
  deviceId: string;
  schedule: Schedule | undefined;
}

export default function ScheduleTimer({ deviceId, schedule }: Props) {
  const [enabled, setEnabled] = useState(schedule?.enabled ?? false);
  const [shutdownTime, setShutdownTime] = useState(() => {
    if (schedule?.shutdownTimestamp) {
      const d = new Date(schedule.shutdownTimestamp);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '22:00';
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const [h, m] = shutdownTime.split(':').map(Number);
      const now = new Date();
      const shutdownDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
      // If time has passed today, schedule for tomorrow
      if (shutdownDate.getTime() < Date.now()) {
        shutdownDate.setDate(shutdownDate.getDate() + 1);
      }

      await setSchedule(deviceId, {
        enabled,
        shutdownTimestamp: shutdownDate.getTime(),
        startTimestamp: 0,
      });
      toast.success(enabled ? `Schedule set: OFF at ${shutdownTime}` : 'Schedule disabled');
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
          <Clock size={20} />
        </div>
        <div>
          <h3 className="text-white font-semibold">Schedule Timer</h3>
          <p className="text-slate-400 text-xs">Automatically control device at a set time</p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
        <div>
          <p className="text-white text-sm font-medium">Enable Schedule</p>
          <p className="text-slate-400 text-xs mt-0.5">ESP32 will follow this timer</p>
        </div>
        <button
          id="schedule-toggle"
          onClick={() => setEnabled(!enabled)}
          className={`relative w-12 h-6 rounded-full transition-all duration-300
                     ${enabled ? 'bg-purple-500' : 'bg-slate-600'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300
                           ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Shutdown time */}
      <div className={`space-y-2 transition-opacity duration-200 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <label className="text-sm text-slate-300 font-medium flex items-center gap-2">
          <Power size={14} className="text-red-400" /> Shutdown Time
        </label>
        <div className="relative">
          <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="schedule-shutdown-time"
            type="time"
            value={shutdownTime}
            onChange={(e) => setShutdownTime(e.target.value)}
            className="input-field pl-10 [color-scheme:dark]"
          />
        </div>
        <p className="text-slate-500 text-xs">
          Device will automatically turn OFF at {shutdownTime} daily.
          Manual ON/OFF always overrides this schedule.
        </p>
      </div>

      {/* Info banner */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <p className="text-amber-300 text-xs">
          ⚡ <strong>Manual override always wins.</strong> If you manually turn ON/OFF the device, it overrides the schedule until next trigger.
        </p>
      </div>

      <button
        id="schedule-save"
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {saving ? <Spinner size="sm" /> : <Save size={16} />}
        {saving ? 'Saving…' : 'Save Schedule'}
      </button>
    </div>
  );
}
