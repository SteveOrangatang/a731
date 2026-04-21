import React, { useState } from 'react';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { useChat } from './hooks/useChat';

import AuthPanel from './components/AuthPanel';
import PendingApproval from './components/PendingApproval';
import StudentDashboard from './components/student/StudentDashboard';
import StudentView from './components/student/StudentView';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';

export default function App() {
  const auth = useFirebaseAuth();
  const { user, profile, loading, signOut } = auth;
  const firestoreSync = useFirestoreSync(user);
  const {
    storedPasscodes,
    agents,
    lessons,
    allTranscripts,
    submissions,
    upsertSubmission,
  } = firestoreSync;

  // ── Navigation ─────────────────────────────────────────────────────────
  const [view, setView] = useState('dashboard');
  const [activeLessonKey, setActiveLessonKey] = useState(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ── Chat hook ──────────────────────────────────────────────────────────
  const chat = useChat(firestoreSync, profile, user);

  // ── Helpers ────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    chat.selectAgent(null);
    setActiveLessonKey(null);
    setView('dashboard');
    setIsAdmin(false);
    setShowAdminLogin(false);
    try { await signOut(); } catch (_) {}
  };

  const openLesson = (key) => {
    chat.selectAgent(null);
    setActiveLessonKey(key);
    setView('lesson');
  };

  // ── Admin login flow (super passcode) ──────────────────────────────────
  if (showAdminLogin && !isAdmin) {
    return (
      <AdminLogin
        storedPasscodes={storedPasscodes}
        onSuccess={() => {
          setIsAdmin(true);
          setShowAdminLogin(false);
        }}
        onBack={() => setShowAdminLogin(false)}
      />
    );
  }

  if (isAdmin) {
    return (
      <AdminDashboard
        firestoreSync={firestoreSync}
        onExit={() => setIsAdmin(false)}
      />
    );
  }

  // ── Initial auth bootstrap ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading…
      </div>
    );
  }

  // ── Unauthenticated → show login/signup ───────────────────────────────
  if (!user || !profile) {
    return (
      <AuthPanel
        auth={auth}
        onAdminClick={() => setShowAdminLogin(true)}
      />
    );
  }

  // ── Pending / rejected profile → waiting screen ───────────────────────
  if (profile.status && profile.status !== 'approved') {
    return (
      <PendingApproval
        profile={profile}
        onSignOut={handleSignOut}
        onAdminClick={() => setShowAdminLogin(true)}
      />
    );
  }

  // ── Student dashboard ─────────────────────────────────────────────────
  if (view === 'dashboard') {
    return (
      <StudentDashboard
        profile={profile}
        agents={agents}
        lessons={lessons}
        transcripts={allTranscripts}
        submissions={submissions}
        onOpenLesson={openLesson}
        onSignOut={handleSignOut}
        onSubmitPaper={upsertSubmission}
        onEnterAdmin={() => setIsAdmin(true)}
      />
    );
  }

  // ── Student lesson view ───────────────────────────────────────────────
  if (view === 'lesson' && activeLessonKey) {
    return (
      <StudentView
        agents={agents}
        chat={chat}
        profile={profile}
        lessonKey={activeLessonKey}
        lesson={lessons[activeLessonKey]}
        lessonTitle={lessons[activeLessonKey]?.title || activeLessonKey}
        onExit={handleSignOut}
        onBackToDashboard={() => {
          chat.selectAgent(null);
          setView('dashboard');
        }}
      />
    );
  }

  return null;
}
