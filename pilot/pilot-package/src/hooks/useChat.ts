import { useCallback, useEffect, useRef, useState } from 'react';
import {
  generatePersonaReply,
  listMyConversations,
  loadConversation,
} from '../foundry/client';
import type { Message, Persona, ConversationMode } from '../foundry/types';

interface UseChatArgs {
  scenarioId: string | null;
  onAfterSend?: () => void; // e.g. refresh stage progress / transcripts
}

/**
 * Single-agent chat hook for the Foundry-backed build.
 *
 * Flow on agent select:
 *   1. Look up the user's existing Conversation for (scenarioId, personaId)
 *      via `listMyConversations(scenarioId)`.
 *   2. If found, `loadConversation(id)` and render its messages.
 *   3. If not found, render an empty thread; show the persona's openingMessage
 *      preview if `initiates`. No conversation is created until the student
 *      sends their first message.
 *
 * Flow on send:
 *   1. Optimistically append the USER message locally so it shows up immediately.
 *   2. Call `generatePersonaReply` (which creates the Conversation if needed,
 *      writes the USER message and the ASSISTANT reply).
 *   3. If we don't yet know the conversationId, look it up via
 *      `listMyConversations(scenarioId)`.
 *   4. `loadConversation(id)` to get authoritative state including the new
 *      ASSISTANT reply, and replace local state with it.
 */
export function useChat({ scenarioId, onAfterSend }: UseChatArgs) {
  const [selectedAgent, setSelectedAgent] = useState<Persona | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mode, setMode] = useState<ConversationMode>('intake');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const liveAgentRef = useRef<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const selectAgent = useCallback(
    async (agent: Persona | null, modeOverride?: ConversationMode) => {
      liveAgentRef.current = agent?.personaId ?? null;
      setSelectedAgent(agent);
      setMessages([]);
      setConversationId(null);
      setError(null);
      if (modeOverride) setMode(modeOverride);
      else setMode('intake');

      if (!agent || !scenarioId) return;

      try {
        const mine = await listMyConversations(scenarioId);
        const existing = mine.find((c) => c.personaId === agent.personaId);

        if (existing) {
          setConversationId(existing.conversationId);
          if (!modeOverride) setMode(existing.mode);
          const loaded = await loadConversation(existing.conversationId);
          if (liveAgentRef.current === agent.personaId) {
            setMessages(loaded.messages);
            setMode(loaded.conversation.mode);
          }
        } else if (agent.initiates && agent.openingMessage) {
          // No backend conversation yet. Show the opening locally so the
          // student sees something. The real opening will be persisted
          // server-side once they send their first message.
          if (liveAgentRef.current === agent.personaId) {
            setMessages([
              {
                messageId: 'preview-opening',
                role: 'ASSISTANT',
                content:
                  modeOverride === 'briefback' && agent.briefbackOpening
                    ? agent.briefbackOpening
                    : agent.openingMessage,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        setError(`Could not load conversation: ${message}`);
      }
    },
    [scenarioId],
  );

  const sendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputText.trim();
      if (!text || !selectedAgent || !scenarioId) return;

      const inFlightAgent = selectedAgent;
      const isStillLive = () => liveAgentRef.current === inFlightAgent.personaId;

      setInputText('');
      setError(null);

      // Optimistic local append so the student sees their message immediately
      const optimistic: Message = {
        messageId: `optimistic-${Date.now()}`,
        role: 'USER',
        content: text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev.filter((m) => m.messageId !== 'preview-opening' || prev.length > 1), optimistic]);
      setIsTyping(true);

      try {
        await generatePersonaReply({
          scenarioId,
          personaId: inFlightAgent.personaId,
          userMessage: text,
        });

        // Find the conversationId if we don't have it yet
        let cid = conversationId;
        if (!cid) {
          const mine = await listMyConversations(scenarioId);
          const found = mine.find((c) => c.personaId === inFlightAgent.personaId);
          cid = found?.conversationId ?? null;
          if (cid && isStillLive()) setConversationId(cid);
        }

        if (cid) {
          const loaded = await loadConversation(cid);
          if (isStillLive()) {
            setMessages(loaded.messages);
            setMode(loaded.conversation.mode);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        setError(`Send failed: ${message}`);
        // Keep the optimistic user message visible so they don't lose what
        // they typed; they can retry by re-typing.
      } finally {
        setIsTyping(false);
        if (onAfterSend) {
          try {
            onAfterSend();
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[chat] onAfterSend threw:', err);
          }
        }
      }
    },
    [inputText, selectedAgent, scenarioId, conversationId, onAfterSend],
  );

  return {
    selectedAgent,
    selectAgent,
    conversationId,
    mode,
    messages,
    inputText,
    setInputText,
    isTyping,
    error,
    messagesEndRef,
    sendMessage,
  };
}
