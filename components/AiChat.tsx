
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Transaction, Wallet, Debt } from '../types';
import { sendAiMessage, ChatMessage, QUICK_PROMPTS } from '../lib/ai';
import { useLanguage } from '../context/LanguageContext';

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  wallets: Wallet[];
  debts: Debt[];
  userName: string;
}

const AiChat: React.FC<AiChatProps> = ({
  isOpen, onClose, transactions, wallets, debts, userName
}) => {
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setShowQuickPrompts(true);
    }
  }, [isOpen, messages.length]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: messageText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setShowQuickPrompts(false);
    setIsLoading(true);

    try {
      const reply = await sendAiMessage(
        newMessages,
        transactions,
        wallets,
        debts,
        userName,
        lang as 'id' | 'en'
      );
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: lang === 'id'
          ? '⚠️ Maaf, terjadi kesalahan. Silakan coba lagi.'
          : '⚠️ Sorry, an error occurred. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setShowQuickPrompts(true);
  };

  const quickPrompts = QUICK_PROMPTS[lang as 'id' | 'en'] || QUICK_PROMPTS.id;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop"
        onClick={onClose}
      />

      {/* Chat Panel - Full screen bottom sheet */}
      <div className="relative mt-auto w-full max-w-md mx-auto h-[92vh] bg-[var(--bg-deep)] rounded-t-[32px] flex flex-col overflow-hidden border-t border-white/[0.08] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] animate-modal-slide">

        {/* Handle + Header */}
        <div className="shrink-0">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/10" />
          </div>

          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <i className="fa-solid fa-brain text-white text-sm" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">Artos AI</h2>
                <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-[0.15em]">
                  {lang === 'id' ? 'Asisten Keuangan' : 'Financial Assistant'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={handleReset}
                  className="w-9 h-9 rounded-xl bg-[var(--bg-inner)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] active:scale-90 transition-all hover:text-rose-400"
                  title="Reset"
                >
                  <i className="fa-solid fa-arrows-rotate text-[10px]" />
                </button>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-[var(--bg-inner)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] active:scale-90 transition-all hover:text-[var(--text-primary)]"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scroll-momentum">
          {/* Welcome / Quick Prompts */}
          {showQuickPrompts && messages.length === 0 && (
            <div className="animate-card-entrance">
              {/* Welcome Card */}
              <div className="text-center mb-8 mt-4">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-wand-magic-sparkles text-emerald-500 text-xl" />
                </div>
                <h3 className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight mb-2">
                  {lang === 'id' ? 'Halo! Saya Artos AI 👋' : 'Hi! I\'m Artos AI 👋'}
                </h3>
                <p className="text-[12px] text-[var(--text-muted)] leading-relaxed max-w-[260px] mx-auto">
                  {lang === 'id'
                    ? 'Saya bisa menganalisis keuangan Anda dan memberikan saran cerdas berdasarkan data transaksi Anda.'
                    : 'I can analyze your finances and provide smart advice based on your transaction data.'}
                </p>
              </div>

              {/* Quick Prompt Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(qp.prompt)}
                    className="flex flex-col items-start gap-2 p-4 bg-[rgba(var(--bg-card-rgb),0.5)] border border-[var(--border-subtle)] rounded-2xl text-left active:scale-[0.97] transition-all hover:border-emerald-500/20 group"
                  >
                    <span className="text-lg">{qp.icon}</span>
                    <span className="text-[11px] font-bold text-[var(--text-primary)] tracking-tight group-hover:text-emerald-500 transition-colors">
                      {qp.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shrink-0 mr-2.5 mt-1 shadow-sm">
                  <i className="fa-solid fa-brain text-white text-[9px]" />
                </div>
              )}
              <div
                className={`max-w-[82%] px-4 py-3 text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-500 text-black rounded-[20px] rounded-tr-md font-medium'
                    : 'bg-[rgba(var(--bg-card-rgb),0.6)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-[20px] rounded-tl-md'
                }`}
              >
                <div className="whitespace-pre-wrap break-words ai-content">
                  {formatAiMessage(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start animate-fade-up">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shrink-0 mr-2.5 mt-1">
                <i className="fa-solid fa-brain text-white text-[9px] animate-pulse" />
              </div>
              <div className="bg-[rgba(var(--bg-card-rgb),0.6)] border border-[var(--border-subtle)] rounded-[20px] rounded-tl-md px-5 py-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="shrink-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 border-t border-[var(--border-subtle)] bg-[rgba(var(--bg-deep-rgb),0.95)] backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex-1 flex items-center bg-[rgba(var(--bg-card-rgb),0.5)] border border-[var(--border-subtle)] rounded-2xl px-4 py-1 focus-within:border-emerald-500/30 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={lang === 'id' ? 'Tanya soal keuanganmu...' : 'Ask about your finances...'}
                className="flex-1 bg-transparent border-none outline-none text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] py-2.5"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                input.trim() && !isLoading
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/25'
                  : 'bg-[var(--bg-inner)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
              }`}
            >
              <i className={`fa-solid ${isLoading ? 'fa-spinner animate-spin' : 'fa-paper-plane'} text-xs`} />
            </button>
          </div>

          {/* Powered by label */}
          <p className="text-center text-[8px] font-semibold text-[var(--text-muted)] mt-2.5 uppercase tracking-[0.2em] opacity-30">
            Powered by Artos AI • OpenRouter
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Format AI message content — handle markdown-like formatting
 */
function formatAiMessage(content: string): React.ReactNode {
  // Split by newlines and process each line
  const lines = content.split('\n');

  return lines.map((line, i) => {
    // Bold text: **text**
    let formatted: React.ReactNode = line;

    if (typeof formatted === 'string') {
      const parts: React.ReactNode[] = [];
      let remaining = formatted;
      let boldMatch;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;

      while ((boldMatch = boldRegex.exec(remaining)) !== null) {
        if (boldMatch.index > lastIndex) {
          parts.push(remaining.slice(lastIndex, boldMatch.index));
        }
        parts.push(
          <strong key={`b-${i}-${boldMatch.index}`} className="font-bold text-emerald-500">
            {boldMatch[1]}
          </strong>
        );
        lastIndex = boldMatch.index + boldMatch[0].length;
      }
      if (lastIndex < remaining.length) {
        parts.push(remaining.slice(lastIndex));
      }
      formatted = parts.length > 0 ? parts : remaining;
    }

    return (
      <React.Fragment key={i}>
        {formatted}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export default AiChat;
