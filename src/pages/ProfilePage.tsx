import { useState } from 'react';
import { User, Mail, LogOut, Edit3, Lock, Save, ChevronRight, Info } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../lib/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

import toast from 'react-hot-toast';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';

export default function ProfilePage() {
  const { user, userProfile, signOut, refreshProfile } = useAuth();
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(userProfile?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);

  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim() || !user) return;
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: name.trim() });
      await updateUserProfile(user.uid, { displayName: name.trim() });
      await refreshProfile();
      setEditName(false);
      toast.success('Name updated');
    } catch {
      toast.error('Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !currentPw || !newPw) return toast.error('Fill in both password fields');
    if (newPw.length < 6) return toast.error('New password must be at least 6 characters');
    setSavingPw(true);
    try {
      const cred = EmailAuthProvider.credential(user.email!, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      toast.success('Password changed successfully');
      setShowPwModal(false);
      setCurrentPw('');
      setNewPw('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        toast.error('Current password is incorrect');
      } else {
        toast.error('Failed to change password');
      }
    } finally {
      setSavingPw(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  const isGoogleUser = user?.providerData?.[0]?.providerId === 'google.com';

  return (
    <div className="min-h-screen bg-[#040d1a]">
      <TopBar title="Profile" />

      <div className="page-container space-y-4 animate-fade-in">
        {/* Avatar card */}
        <div className="glass-card p-6 flex flex-col items-center gap-3">
          <div className="relative">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="avatar" className="w-20 h-20 rounded-full border-2 border-cyan-500/50" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center border-2 border-cyan-500/50">
                <span className="text-white text-3xl font-bold">
                  {(userProfile?.displayName || user?.email || 'U')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </div>

          {editName ? (
            <div className="flex items-center gap-2 w-full max-w-[220px]">
              <input
                id="profile-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field text-center text-base"
                autoFocus
              />
              <button onClick={handleSaveName} disabled={savingName} className="p-2 text-cyan-400 hover:text-cyan-300">
                {savingName ? <Spinner size="sm" /> : <Save size={18} />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-white text-xl font-bold">{userProfile?.displayName}</h2>
              <button id="edit-name-btn" onClick={() => { setName(userProfile?.displayName ?? ''); setEditName(true); }} className="p-1 text-slate-400 hover:text-white">
                <Edit3 size={16} />
              </button>
            </div>
          )}

          <p className="text-slate-400 text-sm flex items-center gap-1.5">
            <Mail size={13} />
            {user?.email}
          </p>

          {isGoogleUser && (
            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
              Signed in with Google
            </span>
          )}
        </div>

        {/* Account options */}
        <div className="glass-card divide-y divide-slate-700/30">
          {[
            { id: 'profile-devices', icon: User, label: 'Linked Devices', value: `${userProfile?.devices?.length ?? 0} device${(userProfile?.devices?.length ?? 0) !== 1 ? 's' : ''}` },
            ...(!isGoogleUser ? [{ id: 'change-password-btn', icon: Lock, label: 'Change Password', action: () => setShowPwModal(true) }] : []),
            { id: 'about-btn', icon: Info, label: 'App Version', value: '1.0.0' },
          ].map(({ id, icon: Icon, label, value, action }) => (
            <button
              key={id}
              id={id}
              onClick={action}
              disabled={!action}
              className="w-full flex items-center gap-3 p-4 hover:bg-slate-700/30 transition-all disabled:cursor-default text-left"
            >
              <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                <Icon size={16} />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{label}</p>
                {value && <p className="text-slate-400 text-xs mt-0.5">{value}</p>}
              </div>
              {action && <ChevronRight size={16} className="text-slate-600" />}
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button
          id="signout-btn"
          onClick={handleSignOut}
          className="btn-danger w-full flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

      {/* Change Password Modal */}
      <Modal isOpen={showPwModal} onClose={() => setShowPwModal(false)} title="Change Password">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-slate-300 font-medium">Current Password</label>
            <input id="current-pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="input-field" placeholder="Enter current password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-slate-300 font-medium">New Password</label>
            <input id="new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="input-field" placeholder="Min. 6 characters" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowPwModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button id="save-pw-btn" onClick={handleChangePassword} disabled={savingPw} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {savingPw && <Spinner size="sm" />}
              {savingPw ? 'Saving…' : 'Change'}
            </button>
          </div>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}
