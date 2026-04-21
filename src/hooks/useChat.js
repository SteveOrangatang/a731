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

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Select an agent from the roster ────────────────────────────────────
  const selectAgent = (agent) => {
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
      setMessages([
        {
          id: 'opening',
          role: 'agent',
          text: agent.openingMessage,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  // ── Send a student message ─────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedAgent || !user || !profile) return;

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

    if (!sessionId) {
      sessionId = await createTranscript({
        userId: user.uid,
        studentRank: profile.rank,
        studentName: profile.lastName,
        studentEmail: profile.email,
        agentId: selectedAgent.id,
        agentName: `${selectedAgent.rank} ${selectedAgent.name}`,
        lessonId: selectedAgent.lessonId || 'lesson1',
        isMoralCourageChallenge: selectedAgent.isMoralCourageChallenge || false,
        messages: updated,
      });
      setChatSessionId(sessionId);
    } else {
      await updateTranscript(sessionId, { messages: updated });
    }

    const lessonId = selectedAgent.lessonId || 'lesson1';
    const lesson = lessons?.[lessonId];

    const aiText = await generateAIResponse(
      text,
      updated,
      selectedAgent,
      profile.rank,
      profile.lastName,
      lesson,
    );

    const aiMsg = {
      id: (Date.now() + 1).toString(),
      role: 'agent',
      text: aiText,
      timestamp: Date.now(),
    };
    const final = [...updated, aiMsg];
    setMessages(final);
    setIsTyping(false);
    await updateTranscript(sessionId, { messages: final });
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
