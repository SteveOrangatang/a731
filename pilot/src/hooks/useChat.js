import { useState, useEffect, useRef, useCallback } from 'react';
import { generateAIResponse } from '../utils/ai';

/**
 * Single-agent chat hook for the Pilot build.
 *
 * Stage gating logic mirrors the production simulator:
 *   - Each agent has a transcript stored by agentId (via the store).
 *   - Leaders can be entered in 'briefback' mode after >=3 of the 4
 *     subordinates have at least one user turn.
 */
export function useChat(store, scenarios, lessonId) {
  const { transcripts, getOrCreateTranscript, updateTranscript } = store;

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState('intake'); // 'intake' | 'briefback'
  const messagesEndRef = useRef(null);
  const liveAgentRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const selectAgent = useCallback(
    (agent, modeOverride) => {
      liveAgentRef.current = agent ? agent.id : null;
      setSelectedAgent(agent);
      setMessages([]);
      setChatSessionId(null);

      if (!agent) {
        setMode('intake');
        return;
      }

      // Resume or create transcript
      const t = getOrCreateTranscript(agent);
      setChatSessionId(t.id);

      const isBriefbackMode =
        modeOverride === 'briefback' && agent.role === 'leader';
      setMode(isBriefbackMode ? 'briefback' : 'intake');

      if (t.messages && t.messages.length > 0) {
        setMessages(t.messages);
      } else if (agent.initiates && agent.openingMessage) {
        const opening =
          isBriefbackMode && agent.briefbackOpening
            ? agent.briefbackOpening
            : agent.openingMessage;
        const seed = [
          {
            id: 'opening',
            role: 'agent',
            text: opening,
            timestamp: Date.now(),
          },
        ];
        setMessages(seed);
        updateTranscript(t.id, { messages: seed });
      }
    },
    [getOrCreateTranscript, updateTranscript],
  );

  const sendMessage = useCallback(
    async (e) => {
      e.preventDefault();
      if (!inputText.trim() || !selectedAgent) return;

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

      // Persist the user message immediately so refreshing mid-call doesn't
      // lose it.
      if (chatSessionId) {
        updateTranscript(chatSessionId, { messages: updated });
      }

      const scenario = scenarios?.[lessonId];
      let aiText = '';
      try {
        aiText = await generateAIResponse(
          text,
          updated,
          inFlightAgent,
          'MAJ', // Pilot demo: hard-coded student rank
          'Smith', // Pilot demo: hard-coded student name
          scenario,
          { mode },
        );
      } catch (err) {
        aiText = `[Error: ${err?.message || 'unknown error'}]`;
      }

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        text: aiText,
        timestamp: Date.now(),
      };
      const final = [...updated, aiMsg];

      if (chatSessionId) {
        updateTranscript(chatSessionId, { messages: final });
      }
      if (isStillLive()) setMessages(final);
      setIsTyping(false);
    },
    [
      inputText,
      selectedAgent,
      messages,
      chatSessionId,
      updateTranscript,
      scenarios,
      lessonId,
      mode,
    ],
  );

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
    mode,
  };
}
