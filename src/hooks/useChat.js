import { useState, useEffect, useRef } from 'react';
import { generateAIResponse } from '../utils/gemini';

/**
 * Manages chat state for a single student ↔ agent conversation.
 *
 * Transcripts are keyed by (userId, agentId) so each student has their own
 * ongoing session per persona.
 */
export function useChat(firestoreSync, profile, user) {
  const { allTranscripts, createTranscript, updateTranscript, lessons } = firestoreSync;

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [inputText, setInputText]         = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const messagesEndRef = useRef(null);
  // Track the agent that is currently "live" so an in-flight sendMessage
  // can detect if the student switched personas mid-call and avoid writing
  // its result into the new persona's React state.
  const liveAgentRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Select an agent from the roster ────────────────────────────────────
  // Optional explicit mode override: 'briefback' forces briefback mode for
  // leaders. Default behavior is to auto-detect based on subordinate progress.
  const selectAgent = (agent, modeOverride) => {
    liveAgentRef.current = agent ? agent.id : null;
    setSelectedAgent(agent);
    setMessages([]);
    setChatSessionId(null);

    if (!agent || !user) return;

    // Resume existing session if one exists for this user + agent
    const existing = allTranscripts.find(
      (t) => t.userId === user.uid && t.agentId === agent.id,
    );

    if (existing) {
      setChatSessionId(existing.id);
      setMessages(existing.messages || []);
    } else if (agent.initiates && agent.openingMessage) {
      // For leaders entering briefback mode, swap in the briefback opening.
      const isBriefbackMode =
        modeOverride === 'briefback' ||
        (agent.role === 'leader' && countSubordinatesEngaged(agent, user, allTranscripts) >= 3);
      const opening = isBriefbackMode && agent.briefbackOpening
        ? agent.briefbackOpening
        : agent.openingMessage;
      setMessages([
        {
          id: 'opening',
          role: 'agent',
          text: opening,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  // Helper: count how many subordinate transcripts in this scenario have
  // at least one user turn from this student.
  function countSubordinatesEngaged(leaderAgent, user, transcripts) {
    if (!leaderAgent || !user) return 0;
    const lessonId = leaderAgent.lessonId;
    return (transcripts || []).filter(
      (t) =>
        t.userId === user.uid &&
        t.lessonId === lessonId &&
        t.agentId !== leaderAgent.id &&
        (t.messages || []).some((m) => m.role === 'user'),
    ).length;
  }

  // ── Send a student message ─────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedAgent || !user || !profile) return;

    // Capture the agent and session at the start of the send. If the student
    // switches personas while this call is in flight, we'll detect that with
    // liveAgentRef and skip React state updates so we don't bleed into the
    // new persona's chat.
    const inFlightAgent = selectedAgent;
    const isStillLive = () => liveAgentRef.current === inFlightAgent.id;

    const text = inputText.trim();
    setInputText('');

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsTyping(true);

    let sessionId = chatSessionId;
    let aiText = '[Connection error: failed to reach the model.]';
    let final = updated;

    try {
      if (!sessionId) {
        sessionId = await createTranscript({
          userId: user.uid,
          studentRank: profile.rank,
          studentName: profile.lastName,
          studentEmail: profile.email,
          agentId: inFlightAgent.id,
          agentName: `${inFlightAgent.rank} ${inFlightAgent.name}`,
          lessonId: inFlightAgent.lessonId || 'lesson1',
          isMoralCourageChallenge: inFlightAgent.isMoralCourageChallenge || false,
          messages: updated,
        });
        // Only adopt this sessionId into React state if the student is still
        // viewing this agent. If they switched, the new agent already has
        // its own chatSessionId loaded (or null), and overwriting it would
        // cause subsequent sends to land in this old transcript.
        if (isStillLive()) setChatSessionId(sessionId);
      } else {
        await updateTranscript(sessionId, { messages: updated });
      }

      const lessonId = inFlightAgent.lessonId || 'lesson1';
      const lesson = lessons?.[lessonId];

      // Compute leader briefback mode: leader is selected AND 3+ subordinates
      // in this scenario have at least one user turn from this student.
      const leaderInBriefbackMode =
        inFlightAgent.role === 'leader' &&
        countSubordinatesEngaged(inFlightAgent, user, allTranscripts) >= 3;

      // Difficulty is set per (student, scenario) by the instructor. 'hard'
      // disables the leader-capitulation rule so leaders behave like the
      // original (loop-forever) version. Default 'normal'.
      const difficulty =
        profile?.scenarioDifficulty?.[lessonId] === 'hard' ? 'hard' : 'normal';

      try {
        aiText = await generateAIResponse(
          text,
          updated,
          inFlightAgent,
          profile.rank,
          profile.lastName,
          lesson,
          {
            mode: leaderInBriefbackMode ? 'briefback' : 'intake',
            difficulty,
          },
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[chat] generateAIResponse threw:', err);
        aiText = `[Connection error: ${err?.message || 'unknown error'}]`;
      }

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        text: aiText,
        timestamp: Date.now(),
      };
      final = [...updated, aiMsg];

      // ALWAYS persist the AI reply to the correct transcript, even if the
      // student has switched personas. Persistence is keyed by sessionId,
      // which is locked to inFlightAgent, so this lands in the right doc.
      if (sessionId) {
        try {
          await updateTranscript(sessionId, { messages: final });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[chat] persist transcript failed:', err);
        }
      }

      // Only update React state if the student is still on this agent.
      // Otherwise the new agent's chat is already on screen and we must not
      // clobber it with this old conversation's messages.
      if (isStillLive()) {
        setMessages(final);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[chat] sendMessage outer error:', err);
      if (isStillLive()) {
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          text: `[Error: ${err?.message || 'unknown error'}]`,
          timestamp: Date.now(),
        };
        setMessages([...updated, aiMsg]);
      }
    } finally {
      // ALWAYS clear the typing indicator, no matter what failed above.
      setIsTyping(false);
    }
  };

  return {
    selectedAgent,
    selectAgent,
    chatSessionId,
    messages,
    inputText,
    setInputText,
    isTyping,
    messagesEndRef,
    sendMessage,
  };
}
