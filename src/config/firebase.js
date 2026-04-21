import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc } from 'firebase/firestore';

// Note: Firebase Storage is intentionally NOT used so the app can run on the
// Spark (free) plan. Rubrics and papers persist only as extracted text in
// Firestore.

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebase = Object.values(firebaseConfig).every(Boolean);

const app  = hasFirebase ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app)      : null;
export const db   = app ? getFirestore(app) : null;

export const appId = import.meta.env.VITE_APP_ID || 'a731-simulator';

/** Shorthand: collection path under the app's public data root. */
export const col = (...segments) =>
  collection(db, 'artifacts', appId, 'public', 'data', ...segments);

/** Shorthand: doc reference under the app's public data root. */
export const ref = (...segments) =>
  doc(db, 'artifacts', appId, 'public', 'data', ...segments);
