import React from 'react';
import { Users, Download, Send } from 'lucide-react';
import { exportTranscript } from '../../utils/exportTranscript';

export default function ChatPanel({
  selectedAgent,
  messages,
  inputText,
  setInputText,
  isTyping,
  messagesEndRef,
  onSendMessage,
  studentRank,
  studentName,
}) {
  if (!selectedAgent) {
    return (
      <div className="flex-grow flex items-center justify-center text-slate-400">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Select a person from the roster to begin.</p>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    exportTranscript({
      messages,
      studentName,
      studentRank,
      agentName: `${selectedAgent.rank} ${selectedAgent.name}`,
    });
  };

  return (
    <>
      {/* Chat header */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-700 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold text-xs">
            {selectedAgent.rank}
          </div>
          <h2 className="text-base font-bold text-slate-900">
            {selectedAgent.name}
          </h2>
        </div>
        <button
          onClick={handleExport}
          disabled={messages.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium disabled:opacity-40 hover:bg-slate-200 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 py-10 text-sm">
            Send a message to begin.
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border text-slate-800'
              }`}
            >
              <div className="text-[10px] opacity-60 mb-1">
                {msg.role === 'user'
                  ? `${studentRank} ${studentName}`
                  : selectedAgent.name}
              </div>
              <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl px-4 py-3 text-xs text-slate-400 italic shadow-sm">
              {selectedAgent.name} is typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t flex-shrink-0">
        <form onSubmit={onSendMessage} className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow bg-slate-100 rounded-full px-5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-sm border-none"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="bg-amber-500 text-white rounded-full p-2.5 disabled:opacity-40 hover:bg-amber-600 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </>
  );
}
