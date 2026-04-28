import { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, AlertCircle, Loader2, Home } from 'lucide-react';
import Modal from '../ui/Modal';

import { getDeviceRegistryEntry, linkDeviceToUser, initializeDeviceRTDB } from '../../lib/realtimeDb';
import { addDeviceToUser, setDeviceMetadata } from '../../lib/firestore';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'form' | 'verifying' | 'success' | 'error';

export default function AddDeviceModal({ isOpen, onClose, onSuccess }: Props) {
  const { user, userProfile, refreshProfile } = useAuth();
  const [deviceId, setDeviceId] = useState('');
  const [devicePassword, setDevicePassword] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceRoom, setDeviceRoom] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setDeviceId('');
      setDevicePassword('');
      setDeviceName('');
      setDeviceRoom('');
      setStep('form');
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId.trim() || !devicePassword.trim()) {
      return toast.error('Please enter both Device ID and Password');
    }
    setStep('verifying');

    try {
      // Check if device already linked to this user
      if (userProfile?.devices.includes(deviceId.trim())) {
        setErrorMsg('This device is already added to your account.');
        setStep('error');
        return;
      }

      const entry = await getDeviceRegistryEntry(deviceId.trim());

      if (!entry) {
        setErrorMsg('Device not found. Check your Device ID and try again.');
        setStep('error');
        return;
      }

      if (entry.password !== devicePassword.trim()) {
        setErrorMsg('Incorrect device password. Please try again.');
        setStep('error');
        return;
      }

      if (entry.linkedTo && entry.linkedTo !== user!.uid) {
        setErrorMsg('This device is already linked to another account.');
        setStep('error');
        return;
      }

      // All good — link device
      await linkDeviceToUser(deviceId.trim(), user!.uid);
      await addDeviceToUser(user!.uid, deviceId.trim());
      await initializeDeviceRTDB(deviceId.trim());
      await setDeviceMetadata(deviceId.trim(), {
        id: deviceId.trim(),
        name: deviceName || `Device ${deviceId.slice(-4)}`,
        room: deviceRoom || 'General',
        ownerId: user!.uid,
        firmwareVersion: entry.firmwareVersion || '1.0.0',
        addedAt: Date.now(),
      });

      await refreshProfile();
      setStep('success');
    } catch (err) {
      console.error(err);
      setErrorMsg('Connection error. Please check your internet and try again.');
      setStep('error');
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={step === 'verifying' ? () => {} : onClose} title="Add New Device">
      {step === 'form' && (
        <form onSubmit={handleVerify} className="space-y-4 pb-2">
          <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl mb-2">
            <Cpu size={20} className="text-cyan-400 shrink-0" />
            <p className="text-slate-300 text-xs">Find your Device ID and Password on the ESP32 device label or in the device manual.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-slate-300 font-medium">Device ID</label>
            <input
              id="add-device-id"
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g. SPM-A1B2C3"
              className="input-field"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-slate-300 font-medium">Device Password</label>
            <input
              id="add-device-password"
              type="password"
              value={devicePassword}
              onChange={(e) => setDevicePassword(e.target.value)}
              placeholder="Enter device password"
              className="input-field"
              autoComplete="off"
            />
          </div>

          <div className="border-t border-slate-700/50 pt-4 space-y-3">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Optional — Customize Device</p>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">Device Name</label>
              <input
                id="add-device-name"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Living Room Socket"
                className="input-field"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">Room / Location</label>
              <div className="relative">
                <Home size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="add-device-room"
                  type="text"
                  value={deviceRoom}
                  onChange={(e) => setDeviceRoom(e.target.value)}
                  placeholder="e.g. Living Room"
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button id="verify-device" type="submit" className="btn-primary flex-1">Add Device</button>
          </div>
        </form>
      )}

      {step === 'verifying' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 size={32} className="text-cyan-400 animate-spin" />
          </div>
          <p className="text-white font-semibold">Verifying Device…</p>
          <p className="text-slate-400 text-sm mt-1">Checking credentials and linking device</p>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center py-6 pb-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">Device Added!</h3>
          <p className="text-slate-400 text-sm mb-6">
            <span className="text-white font-medium">{deviceName || deviceId}</span> is now linked to your account.
          </p>
          <button id="add-device-done" onClick={handleDone} className="btn-primary w-full">Go to Dashboard</button>
        </div>
      )}

      {step === 'error' && (
        <div className="text-center py-6 pb-2">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">Verification Failed</h3>
          <p className="text-slate-400 text-sm mb-6">{errorMsg}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => setStep('form')} className="btn-primary flex-1">Try Again</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
