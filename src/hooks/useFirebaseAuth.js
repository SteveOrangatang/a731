import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  updateProfile,
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

  return { user, profile, loading, signUp, signIn, signOut };
}
