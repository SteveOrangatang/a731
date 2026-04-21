import { useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  updateProfile,
  getAuth as getSecondaryAuth,
} from 'firebase/auth';
import { onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, ref } from '../config/firebase';

/**
 * Manages Firebase auth. Automatically signs in anonymously when nobody is
 * logged in so that Firestore reads work for unauthenticated flows (like the
 * admin passcode gate). Students then upgrade to a real email/password
 * account via `signUp` / `signIn`.
 *
 * Returns:
 *   user         — Firebase User (anonymous or real)
 *   profile      — Firestore user doc (null for anonymous users)
 *   loading      — true on initial auth bootstrap
 *   signUp({ email, password, rank, lastName }) — creates account + profile
 *   signIn({ email, password })                 — logs in an existing account
 *   signOut()                                    — signs out (anon session respawns)
 */
export function useFirebaseAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error('Anonymous sign-in failed:', e);
          setLoading(false);
        }
        return;
      }
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Subscribe to profile doc whenever a non-anonymous user is authed.
  useEffect(() => {
    if (!user || user.isAnonymous) {
      setProfile(null);
      return;
    }
    const unsub = onSnapshot(ref('users', user.uid), (snap) => {
      if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
      else setProfile(null);
    });
    return unsub;
  }, [user]);

  const signUp = async ({ email, password, rank, lastName }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await updateProfile(cred.user, { displayName: `${rank} ${lastName}` });
    } catch (_) {}
    await setDoc(ref('users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      rank,
      lastName,
      role: 'student',
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return cred.user;
  };

  const signIn = ({ email, password }) =>
    signInWithEmailAndPassword(auth, email, password);

  const signOut = () => firebaseSignOut(auth);

  /**
   * Creates a brand-new admin account without disturbing the current session.
   * Uses a secondary Firebase app instance so the caller stays signed in.
   */
  const createAdminAccount = async ({ email, password, rank, lastName }) => {
    if (!auth) throw new Error('Firebase not configured');

    // Spin up a secondary app with the same config (auth only) so the
    // createUser call does NOT hijack the primary session.
    const secondaryApp = initializeApp(auth.app.options, `admin-create-${Date.now()}`);
    const secondaryAuth = getSecondaryAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password,
      );
      try {
        await updateProfile(cred.user, {
          displayName: `${rank || ''} ${lastName || ''}`.trim(),
        });
      } catch (_) {}

      await setDoc(ref('users', cred.user.uid), {
        uid: cred.user.uid,
        email,
        rank: rank || '',
        lastName: lastName || '',
        role: 'admin',
        status: 'approved',
        createdAt: serverTimestamp(),
        createdBy: user?.uid || null,
      });

      await firebaseSignOut(secondaryAuth);
      return cred.user;
    } finally {
      try {
        await deleteApp(secondaryApp);
      } catch (_) {}
    }
  };

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    createAdminAccount,
  };
}
