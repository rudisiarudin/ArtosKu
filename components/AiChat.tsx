import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Transaction, Wallet, Debt } from '../types';
import { sendAiMessage, ChatMessage, QUICK_PROMPTS } from '../lib/ai';
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, X, Shield, Send, Loader2, Sparkle } from 'lucide-react';

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  wallets: Wallet[];
  debts: Debt[];
  userName: string;
  onAddTransaction?: (t: Omit<any, 'id'>) => void;
}

const AiChat: React.FC<AiChatProps> = ({
  isOpen, onClose, transactions, wallets, debts, userName, onAddTransaction
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

      if (reply.includes(':::RECORD_TRANSACTION:::')) {
        const parts = reply.split(':::RECORD_TRANSACTION:::');
        const textContent = parts[0].trim();
        const jsonPart = parts[1].split(':::END_RECORD:::')[0].trim();

        try {
          const txData = JSON.parse(jsonPart);
          if (onAddTransaction) {
            onAddTransaction({
              ...txData,
              date: new Date().toISOString()
            });
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: textContent + '\n\n✅ **Transaction recorded successfully!**'
            }]);
          }
        } catch (e) {
          setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      }
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

  const quickPrompts = QUICK_PROMPTS[lang as 'id' | 'en'] || QUICK_PROMPTS.id;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div className="relative mt-auto w-full max-w-md mx-auto h-[90vh] bg-[#0c0c0e] rounded-t-[2.5rem] flex flex-col overflow-hidden border-t border-white/5 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
        
        {/* Header */}
        <div className="shrink-0 pt-2 pb-1 border-b border-white/5">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-1 rounded-full bg-zinc-800" />
          </div>

          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Sparkles className="size-5 text-black" strokeWidth={2.5} />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-[16px] font-bold text-white tracking-tight">Artos Intelligence</h2>
                <div className="flex items-center gap-1.5">
                  <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Active System</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="size-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all active:scale-90"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scroll-momentum">
          {showQuickPrompts && messages.length === 0 && (
            <div className="space-y-12 py-4">
              {/* Welcome Hero */}
              <div className="text-center space-y-4">
                <div className="size-16 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center mx-auto shadow-2xl">
                  <Shield className="size-7 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {lang === 'id' ? 'Apa yang bisa saya bantu?' : 'How can I assist you?'}
                  </h3>
                  <p className="text-[12px] font-medium text-zinc-500 leading-relaxed max-w-[260px] mx-auto uppercase tracking-wider">
                    Analyze patterns or record data instantly.
                  </p>
                </div>
              </div>

              {/* Quick Prompts */}
              <div className="grid grid-cols-2 gap-3">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(qp.prompt)}
                    className="flex flex-col items-start gap-2 p-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-left hover:bg-zinc-900 hover:border-emerald-500/20 transition-all active:scale-[0.98] group"
                  >
                    <span className="text-[11px] font-bold text-zinc-400 group-hover:text-emerald-500 uppercase tracking-wide leading-snug">
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
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-5 py-3.5 text-[13px] leading-relaxed tracking-tight ${
                  msg.role === 'user'
                    ? 'bg-emerald-500 text-black rounded-3xl rounded-tr-sm font-bold shadow-xl shadow-emerald-500/10'
                    : 'bg-zinc-900 border border-white/5 text-zinc-200 rounded-3xl rounded-tl-sm shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {formatAiMessage(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-white/5 rounded-3xl rounded-tl-sm px-6 py-4">
                <div className="flex items-center gap-1.5">
                  <div className="size-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="size-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="size-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="shrink-0 px-6 pb-10 pt-4 bg-[#0c0c0e] border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center bg-zinc-950 border border-white/5 rounded-2xl px-4 h-14 focus-within:border-emerald-500/20 transition-all">
              <Sparkle className="size-4 text-zinc-600 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={lang === 'id' ? 'Tanya sesuatu...' : 'Ask anything...'}
                className="flex-1 bg-transparent pl-3 text-sm text-white placeholder:text-zinc-800 outline-none"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`size-14 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                input.trim() && !isLoading
                  ? 'bg-emerald-500 text-black shadow-xl shadow-emerald-500/10'
                  : 'bg-zinc-900 text-zinc-800 border border-white/5'
              }`}
            >
              {isLoading ? <Loader2 className="size-5 animate-spin" /> : <Send size={20} strokeWidth={2.5} />}
            </button>
          </div>
          <p className="text-center text-[9px] font-black text-zinc-800 mt-4 uppercase tracking-[0.4em]">
            Artos Intelligence Standard
          </p>
        </div>
      </div>
    </div>
  );
};

function formatAiMessage(content: string): React.ReactNode {
  const lines = content.split('\n');
  return lines.map((line, i) => {
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
