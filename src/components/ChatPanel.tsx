import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Place, RouteInfo } from '../types';
import { ChatMessageItem } from './ChatMessageItem';
import {
  Send,
  Sparkles,
  RefreshCw,
  Globe,
  Trash2,
  MapPin,
  Compass,
  ArrowDown,
  Info,
} from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string, model: string, enableSearch: boolean) => void;
  onClearChat: () => void;
  onSelectPlace: (place: Place) => void;
  selectedPlaceId?: string | null;
  onShowRoute: (route: RouteInfo) => void;
  mapCityName?: string;
  userLocation: { lat: number; lng: number } | null;
  onLocateUser: () => void;
}

const STARTER_PROMPTS = [
  {
    title: 'Live Traffic & Route',
    query: 'What is the current traffic condition and driving route from Tokyo Station to Haneda Airport? Check for delays.',
    icon: '🚗',
  },
  {
    title: 'Tokyo Ramen Quest',
    query: 'Find the top 4 highest-rated ramen shops in Tokyo near Shinjuku with 4.5+ ratings and what to order at each.',
    icon: '🍜',
  },
  {
    title: 'NYC Traffic Check',
    query: 'Check real-time traffic and driving directions from Times Square to Brooklyn Bridge with estimated delays.',
    icon: '🚦',
  },
  {
    title: 'Florence Art Walk',
    query: 'Plan a 3-stop walkable Renaissance cultural tour in Florence with estimated walking times and must-see artworks.',
    icon: '🏛️',
  },
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onClearChat,
  onSelectPlace,
  selectedPlaceId,
  onShowRoute,
  mapCityName,
  userLocation,
  onLocateUser,
}) => {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [enableSearchGrounding, setEnableSearchGrounding] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    onSendMessage(text, selectedModel, enableSearchGrounding);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      id="chat-panel-container"
      className="flex flex-col h-full bg-slate-50/70 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800"
    >
      {/* Header */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              MapChat AI
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Real-Time Location &amp; Maps Assistant
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            id="clear-chat-history-btn"
            onClick={onClearChat}
            disabled={messages.length === 0}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Model & Search Grounding Controls Bar */}
      <div className="px-3 py-2 bg-slate-100/80 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs shrink-0">
        {/* Model dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Model:</span>
          <select
            id="model-selector-dropdown"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="gemini-3.5-flash">gemini-3.5-flash (Search Grounded)</option>
            <option value="gemini-3.8-flash">gemini-3.8-flash (General)</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
          </select>
        </div>

        {/* Search Grounding toggle */}
        <button
          id="toggle-search-grounding-btn"
          onClick={() => setEnableSearchGrounding(!enableSearchGrounding)}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
            enableSearchGrounding
              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
          }`}
          title={
            enableSearchGrounding
              ? 'Google Search Grounding active: verifies real-time hours, reviews & current status'
              : 'Click to enable Google Search Grounding'
          }
        >
          <Globe className="w-3 h-3" />
          <span className="hidden sm:inline">Search Grounded</span>
          <span className="sm:hidden">Search</span>
        </button>
      </div>

      {/* Messages Thread */}
      <div
        id="messages-scroll-area"
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Ask MapChat Anything
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 mb-6 leading-relaxed">
              Explore places worldwide, plan custom walking routes, check opening hours, or discover hidden local gems powered by real-time Google Maps data.
            </p>

            {/* Quick Starter Suggestions */}
            <div className="w-full space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider text-left">
                Suggested Inquiries
              </p>
              <div className="grid grid-cols-1 gap-2 text-left">
                {STARTER_PROMPTS.map((starter, idx) => (
                  <button
                    key={idx}
                    id={`starter-prompt-${idx}`}
                    onClick={() => onSendMessage(starter.query, selectedModel, enableSearchGrounding)}
                    className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 rounded-xl transition-all text-xs flex items-start gap-2.5 group text-left"
                  >
                    <span className="text-base shrink-0">{starter.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors truncate">
                        {starter.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {starter.query}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                onSelectPlace={onSelectPlace}
                selectedPlaceId={selectedPlaceId}
                onFollowUpClick={(fu) => onSendMessage(fu, selectedModel, enableSearchGrounding)}
                onShowRoute={onShowRoute}
              />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2.5 text-xs text-slate-500 p-2 animate-pulse">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>Searching Google Maps &amp; generating recommendations...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        {/* Context bar (Active Map City / User Location) */}
        <div className="flex items-center justify-between gap-2 mb-2 text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
            <span className="truncate">
              {mapCityName ? `Focused Area: ${mapCityName}` : 'Global Map Active'}
            </span>
          </div>

          <button
            id="inject-near-me-btn"
            onClick={() => {
              if (userLocation) {
                setInput('What are the top 3 best-rated lunch places within walking distance of my current location?');
              } else {
                onLocateUser();
                setInput('What are the top 3 best-rated lunch places within walking distance of my current location?');
              }
            }}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-[11px] font-medium flex items-center gap-1 shrink-0"
          >
            📍 Near Me
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <div className="relative flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-500 transition-all">
            <textarea
              id="chat-input-textarea"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about places, food, sights, routes..."
              className="w-full bg-transparent px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden resize-none max-h-32"
            />
          </div>

          <button
            id="send-message-btn"
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl shadow-xs transition-colors shrink-0"
            title="Send (Enter)"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
