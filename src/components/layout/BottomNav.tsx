import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Cpu, Bell, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listenToNotifications } from '../../lib/firestore';
import { useEffect, useState } from 'react';

const tabs = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { path: '/devices',   icon: Cpu,             label: 'Devices' },
  { path: '/notifications', icon: Bell,         label: 'Alerts' },
  { path: '/profile',   icon: User,             label: 'Profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToNotifications(user.uid, (notifs) => {
      setUnread(notifs.filter((n) => !n.read).length);
    });
    return unsub;
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 bottom-nav">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 pt-2">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = pathname.startsWith(path);
          const isNotif = path === '/notifications';

          return (
            <button
              key={path}
              id={`nav-${label.toLowerCase()}`}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 relative
                         ${isActive
                           ? 'text-cyan-400'
                           : 'text-slate-500 hover:text-slate-300'}`}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan-400 rounded-full" />
              )}

              <div className="relative">
                <Icon size={22} className={isActive ? 'drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]' : ''} />
                {isNotif && unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
