'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Loader2, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Slide } from '@/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TutorChatProps {
  slide: Slide;
  language?: 'tr' | 'en';
  onClose: () => void;
}

export function TutorChat({ slide, language = 'tr', onClose }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isTR = language === 'tr';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slideContext: {
            title: slide.title,
            content: slide.content,
            narrationText: slide.narrationText,
            bulletPoints: slide.bulletPoints,
          },
          conversationHistory: messages,
          userMessage: text,
          language,
        }),
      });

      const data = await resp.json();
      const aiText = data.response || (isTR ? 'Bir hata oluştu.' : 'An error occurred.');
      setMessages((prev) => [...prev, { role: 'assistant', content: aiText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: isTR ? 'Bağlantı hatası oluştu.' : 'Connection error.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, slide, language, isTR]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const placeholderText = isTR
    ? `"${slide.title}" hakkında bir şey sor...`
    : `Ask about "${slide.title}"...`;

  const welcomeText = isTR
    ? `"${slide.title}" slaytındayım. Bu konu hakkında ne sormak istersin?`
    : `I'm on the "${slide.title}" slide. What would you like to ask?`;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-gray-200">
            {isTR ? 'AI Öğretmen' : 'AI Tutor'}
          </span>
          <span className="text-xs text-gray-500 truncate max-w-[200px]">
            — {slide.title}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.length === 0 && (
          <div className="text-xs text-gray-500 italic text-center py-2">{welcomeText}</div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-gray-800 text-gray-200 rounded-bl-sm'
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-xl rounded-bl-sm px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-2 border-t border-gray-700 shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          disabled={isLoading}
          className="flex-1 bg-gray-800 text-gray-200 text-xs rounded-lg px-3 py-1.5 outline-none placeholder:text-gray-600 focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <Button
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
