import { useState } from 'react';
import { Settings, Home, Trash2, RotateCcw, Cpu, Edit3, Save } from 'lucide-react';
import { setDeviceMetadata, removeDeviceFromUser, deleteDeviceMetadata, resetDeviceLogs } from '../../lib/firestore';
import { unlinkDevice } from '../../lib/realtimeDb';
import { useAuth } from '../../contexts/AuthContext';
import type { DeviceMetadata } from '../../types';
import ConfirmDialog from '../ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Spinner from '../ui/Spinner';

interface Props {
  device: DeviceMetadata;
  onRenamed: (name: string) => void;
}

export default function DeviceSettings({ device, onRenamed }: Props) {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(device.name);
  const [room, setRoom] = useState(device.room);
  const [savingMeta, setSavingMeta] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSaveMeta = async () => {
    if (!name.trim()) return toast.error('Device name cannot be empty');
    setSavingMeta(true);
    try {
      await setDeviceMetadata(device.id, { name: name.trim(), room: room.trim() || 'General' });
      onRenamed(name.trim());
      toast.success('Device info updated');
    } catch {
      toast.error('Failed to update device info');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setRemoving(true);
    try {
      await removeDeviceFromUser(user.uid, device.id);
      await unlinkDevice(device.id);
      await deleteDeviceMetadata(device.id);
      await refreshProfile();
      toast.success('Device removed');
      navigate('/devices');
    } catch {
      toast.error('Failed to remove device');
      setRemoving(false);
    }
  };

  const handleResetLogs = async () => {
    setResetting(true);
    try {
      await resetDeviceLogs(device.id);
      toast.success('Power logs cleared');
      setShowReset(false);
    } catch {
      toast.error('Failed to reset logs');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Rename & Room */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Edit3 size={18} className="text-cyan-400" />
          <h3 className="text-white font-semibold">Device Info</h3>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-slate-300 font-medium">Device Name</label>
          <input id="settings-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. Living Room Socket" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-slate-300 font-medium">Room / Location</label>
          <div className="relative">
            <Home size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="settings-room" type="text" value={room} onChange={(e) => setRoom(e.target.value)} className="input-field pl-10" placeholder="e.g. Living Room" />
          </div>
        </div>

        <button id="settings-save" onClick={handleSaveMeta} disabled={savingMeta} className="btn-primary w-full flex items-center justify-center gap-2">
          {savingMeta ? <Spinner size="sm" /> : <Save size={16} />}
          {savingMeta ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Device info */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Cpu size={18} className="text-slate-400" />
          <h3 className="text-white font-semibold">Device Details</h3>
        </div>
        {[
          { label: 'Device ID', value: device.id },
          { label: 'Firmware', value: device.firmwareVersion || 'N/A' },
          { label: 'Added', value: new Date(device.addedAt).toLocaleDateString() },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
            <span className="text-slate-400 text-sm">{label}</span>
            <span className="text-white text-sm font-medium font-mono">{value}</span>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="glass-card p-5 space-y-3 border border-red-500/20">
        <h3 className="text-red-400 font-semibold flex items-center gap-2">
          <Settings size={18} /> Danger Zone
        </h3>

        <button id="reset-logs-btn" onClick={() => setShowReset(true)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <RotateCcw size={18} />
          <div className="text-left">
            <p className="text-sm font-medium">Reset Power Logs</p>
            <p className="text-xs opacity-70">Delete all historical power data</p>
          </div>
        </button>

        <button id="remove-device-btn" onClick={() => setShowRemove(true)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
          <Trash2 size={18} />
          <div className="text-left">
            <p className="text-sm font-medium">Remove Device</p>
            <p className="text-xs opacity-70">Permanently unlink from your account</p>
          </div>
        </button>
      </div>

      <ConfirmDialog
        isOpen={showRemove}
        onClose={() => setShowRemove(false)}
        onConfirm={handleRemove}
        title="Remove Device"
        message={`Are you sure you want to remove "${device.name}"? This will unlink it from your account permanently.`}
        confirmLabel="Remove Device"
        loading={removing}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={handleResetLogs}
        title="Reset Logs"
        message="All power history logs will be permanently deleted. This cannot be undone."
        confirmLabel="Reset Logs"
        loading={resetting}
        variant="warning"
      />
    </div>
  );
}
