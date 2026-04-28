import { useEffect, useState } from 'react';
import { Plus, Cpu } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import DeviceCard from '../components/devices/DeviceCard';
import AddDeviceModal from '../components/devices/AddDeviceModal';
import { useAuth } from '../contexts/AuthContext';
import { getDeviceMetadata } from '../lib/firestore';
import type { DeviceMetadata } from '../types';

export default function DevicesPage() {
  const { userProfile, refreshProfile } = useAuth();
  const [devices, setDevices] = useState<DeviceMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadDevices = async () => {
    if (!userProfile?.devices?.length) { setDevices([]); setLoading(false); return; }
    const metas = await Promise.all(userProfile.devices.map((id) => getDeviceMetadata(id)));
    setDevices(metas.filter(Boolean) as DeviceMetadata[]);
    setLoading(false);
  };

  useEffect(() => { loadDevices(); }, [userProfile?.devices?.join(',')]);

  return (
    <div className="min-h-screen bg-[#040d1a]">
      <TopBar title="My Devices" />

      <div className="page-container space-y-4 animate-fade-in">
        <div className="flex items-center justify-between pt-2">
          <p className="text-slate-400 text-sm">{devices.length} device{devices.length !== 1 ? 's' : ''} added</p>
          <button
            id="add-device-btn"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            <Plus size={18} /> Add Device
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 glass-card relative overflow-hidden">
                <div className="absolute inset-0 shimmer" />
              </div>
            ))}
          </div>
        ) : devices.length === 0 ? (
          <div className="glass-card p-12 text-center animate-slide-up">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Cpu size={40} className="text-slate-600" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">No Devices Yet</h3>
            <p className="text-slate-400 text-sm mb-6">Add your first Smart Power Meter device to start monitoring</p>
            <button id="add-first-device" onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={18} className="inline mr-2" /> Add Your First Device
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {devices.length > 0 && (
        <button
          id="fab-add-device"
          onClick={() => setShowAdd(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full shadow-glow-cyan flex items-center justify-center active:scale-95 transition-transform z-30"
        >
          <Plus size={24} className="text-white" />
        </button>
      )}

      <AddDeviceModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => { refreshProfile(); loadDevices(); }}
      />

      <BottomNav />
    </div>
  );
}
