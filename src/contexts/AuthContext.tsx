import React, {
  createContext, useContext, useEffect, useState, useCallback
} from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as fbSignOut, sendPasswordResetEmail, updateProfile as fbUpdateProfile,
  GoogleAuthProvider, signInWithPopup, type User
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUserProfile, getUserProfile } from '../lib/firestore';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User) => {
    let profile = await getUserProfile(u.uid);
    if (!profile) {
      profile = {
        uid: u.uid,
        displayName: u.displayName || 'User',
        email: u.email || '',
        photoURL: u.photoURL || '',
        devices: [],
        createdAt: Date.now(),
      };
      await createUserProfile(profile);
    }
    setUserProfile(profile);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadProfile(u);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await fbUpdateProfile(cred.user, { displayName });
    await createUserProfile({
      uid: cred.user.uid,
      displayName,
      email,
      photoURL: '',
      devices: [],
      createdAt: Date.now(),
    });
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    // createUserProfile uses merge:true so it won't overwrite existing data
    await createUserProfile({
      uid: cred.user.uid,
      displayName: cred.user.displayName || 'User',
      email: cred.user.email || '',
      photoURL: cred.user.photoURL || '',
      devices: [],
      createdAt: Date.now(),
    });
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading,
      signIn, signUp, signInWithGoogle, signOut, resetPassword, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
