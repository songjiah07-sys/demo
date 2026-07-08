import React, { useRef, useEffect } from 'react';
import { ChatMessage, HRMetrics } from '../types/hr';
import { askGeminiAboutHR } from '../services/geminiService';
import { Send, Bot, User, Loader2, Sparkles, MessageCircleWarning } from 'lucide-react';

interface ChatInterfaceProps {
  metrics: HRMetrics;
  apiKey: string;
}

const SUGGESTED_QUESTIONS = [
  "Which department has highest attrition?",
  "What is the average salary and median salary?",
  "What should HR improve based on this data?",
  "How is training budget correlated with performance?",
  "Tell me about the gender ratio and diversity metrics."
];

export default function ChatInterface({ metrics, apiKey }: ChatInterfaceProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I am your HR Analytics AI Advisor. I have analyzed your uploaded dataset. Ask me anything like:\n\n* *'Why did turnover increase?'*\n* *'Which department has the highest attrition?'*\n* *'What is the average salary?'*\n\nHow can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history excluding timestamps for prompt convenience
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await askGeminiAboutHR(history, textToSend, metrics, apiKey);

      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to get answer from Gemini. Please verify your API Key.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl flex flex-col h-[600px] border border-border overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-accent/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary animate-pulse" />
          <div>
            <h4 className="text-sm font-semibold">HR Analytics AI Chat</h4>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
              Powered by Google Gemini
            </p>
          </div>
        </div>
      </div>

      {/* API Key Warning Overlay */}
      {!apiKey && (
        <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <MessageCircleWarning className="w-12 h-12 text-warning mb-4" />
          <h4 className="text-base font-bold mb-2">Gemini API Key Required</h4>
          <p className="text-xs text-muted-foreground max-w-xs mb-4">
            To enable the AI Chat, please enter your Gemini API Key in the Settings page. Your key is stored safely in your browser.
          </p>
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 max-w-[85%] ${
              m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-primary border-primary text-white' : 'glass text-foreground border-border'
            }`}>
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed border ${
              m.role === 'user'
                ? 'bg-primary/10 border-primary/20 text-foreground'
                : 'glass-card border-border text-foreground/90'
            }`}>
              {/* Very basic formatting helper for linebreaks and bold text */}
              {m.content.split('\n').map((line, idx) => {
                let formattedLine = line;
                
                // Bullet points
                if (line.trim().startsWith('* ')) {
                  return (
                    <li key={idx} className="ml-4 list-disc my-1">
                      {line.trim().substring(2)}
                    </li>
                  );
                }
                
                return (
                  <p key={idx} className={line === '' ? 'h-3' : 'my-1'}>
                    {formattedLine}
                  </p>
                );
              })}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl glass border border-border text-foreground flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="glass-card border border-border rounded-2xl px-4 py-3 text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (only show when no message is loading) */}
      {messages.length === 1 && !isLoading && apiKey && (
        <div className="px-6 py-2 bg-accent/5 border-t border-border/50">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Suggested Questions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-[10px] text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-full px-2.5 py-1 text-left transition-all font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-4 border-t border-border bg-accent/5 flex gap-2"
      >
        <input
          type="text"
          placeholder={apiKey ? "Ask about turnover, salaries, performance..." : "Configure Gemini API key to chat..."}
          disabled={!apiKey || isLoading}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-accent/30 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder-muted-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!apiKey || isLoading || !input.trim()}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
