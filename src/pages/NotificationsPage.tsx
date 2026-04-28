import { useEffect, useState } from 'react';
import { BellOff, CheckCheck, Wifi, AlertTriangle, Activity, Zap } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { listenToNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/firestore';
import type { AppNotification } from '../types';
import { formatDistanceToNow } from 'date-fns';

const iconMap = {
  offline: { icon: Wifi, color: 'text-red-400', bg: 'bg-red-500/10' },
  online:  { icon: Wifi, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  threshold: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  high_consumption: { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  manual_override: { icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const unread = notifications.filter((n) => !n.read).length;

  const handleMarkAll = async () => {
    if (!user || unread === 0) return;
    await markAllNotificationsRead(user.uid);
  };

  const handleMarkOne = async (id: string) => {
    await markNotificationRead(id);
  };

  return (
    <div className="min-h-screen bg-[#040d1a]">
      <TopBar
        title="Notifications"
        right={
          unread > 0 ? (
            <button onClick={handleMarkAll} className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 rounded-lg hover:bg-slate-700/50">
              <CheckCheck size={14} /> Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="page-container animate-fade-in">
        {unread > 0 && (
          <div className="pt-2 pb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              {unread} unread alert{unread !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 glass-card relative overflow-hidden">
                <div className="absolute inset-0 shimmer" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card p-12 text-center mt-4">
            <BellOff size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No notifications</p>
            <p className="text-slate-500 text-sm mt-1">Alerts about your devices will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 pt-4">
            {notifications.map((n) => {
              const { icon: Icon, color, bg } = iconMap[n.type] ?? iconMap.manual_override;
              return (
                <div
                  key={n.id}
                  id={`notif-${n.id}`}
                  onClick={() => !n.read && handleMarkOne(n.id)}
                  className={`glass-card p-4 flex items-start gap-3 transition-all
                             ${!n.read ? 'border-l-2 border-l-cyan-500 cursor-pointer hover:bg-slate-700/40' : 'opacity-70'}`}
                >
                  <div className={`${bg} ${color} p-2 rounded-xl shrink-0`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{n.message}</p>
                    {n.deviceName && (
                      <p className="text-slate-500 text-xs mt-0.5">{n.deviceName}</p>
                    )}
                    <p className="text-slate-500 text-xs mt-1">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 bg-cyan-400 rounded-full shrink-0 mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
