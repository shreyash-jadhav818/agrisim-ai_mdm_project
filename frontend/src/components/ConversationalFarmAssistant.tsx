import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  Sparkles,
  Info,
  Bot,
  User,
  HelpCircle,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ChatMessage, AIProviderStatus, SimulationResult } from '../types';
import { sendChatMessage, fetchAIProviderStatus } from '../services/api';

interface ConversationalFarmAssistantProps {
  simulationContext?: Record<string, any>;
  currentResult?: SimulationResult | null;
}

export const ConversationalFarmAssistant: React.FC<ConversationalFarmAssistantProps> = ({
  simulationContext = {},
  currentResult
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [providerStatus, setProviderStatus] = useState<AIProviderStatus | null>(null);
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([
    "Why is this strategy better than my baseline?",
    "How much water could this strategy save?",
    "What happens if rainfall decreases by 35%?",
    "Explain the Pareto frontier in simple language",
    "What are the biggest risks for this farm?",
    "Compare the low-water and high-yield strategies"
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAIProviderStatus()
      .then((st) => setProviderStatus(st))
      .catch((e) => console.error('Provider status error:', e));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Merge currentResult into context
  const fullContext = {
    ...simulationContext,
    crop_name: currentResult ? currentResult.crop_name : (simulationContext.crop_name || 'Wheat'),
    yield_kg_ha: currentResult ? currentResult.yield_kg_ha : (simulationContext.yield_kg_ha || 3200),
    irrigation_water_m3: currentResult ? currentResult.total_water_consumed_m3_acre * 2.471 : (simulationContext.irrigation_water_m3 || 3500),
    net_profit_inr: currentResult ? currentResult.net_profit_inr : simulationContext.net_profit_inr
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setLoading(true);

    try {
      const res = await sendChatMessage({
        message: text.trim(),
        history: newHistory,
        context: fullContext
      });

      const assistantMsg: ChatMessage = { role: 'assistant', content: res.reply };
      setMessages([...newHistory, assistantMsg]);
      if (res.suggested_followups && res.suggested_followups.length > 0) {
        setSuggestedFollowups(res.suggested_followups);
      }
    } catch (e: any) {
      console.error('Chat error:', e);
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: `I encountered an issue processing your query: ${e.message || 'Service unavailable'}. Please verify backend status.`
      };
      setMessages([...newHistory, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setSuggestedFollowups([
      "Why is this strategy better than my baseline?",
      "How much water could this strategy save?",
      "What happens if rainfall decreases by 35%?",
      "Explain the Pareto frontier in simple language",
      "What are the biggest risks for this farm?",
      "Compare the low-water and high-yield strategies"
    ]);
  };

  const getProviderBadge = () => {
    if (!providerStatus) return null;
    if (providerStatus.provider_mode === 'local_ollama') {
      return (
        <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-2.5 py-1 rounded-full border border-emerald-800 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Local AI (Ollama: {providerStatus.ollama_model})
        </span>
      );
    }
    if (providerStatus.provider_mode === 'external_ai') {
      return (
        <span className="text-[10px] bg-cyan-950 text-cyan-300 font-bold px-2.5 py-1 rounded-full border border-cyan-800 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          External AI ({providerStatus.external_provider})
        </span>
      );
    }
    return (
      <span className="text-[10px] bg-amber-950 text-amber-300 font-bold px-2.5 py-1 rounded-full border border-amber-800 flex items-center gap-1.5">
        <Cpu className="w-3 h-3 text-amber-400" />
        Rule-Based Deterministic Engine
      </span>
    );
  };

  return (
    <div className="agri-card flex flex-col h-[650px] border border-[#1b3d27] bg-[#06140b] shadow-2xl">
      {/* Top Header */}
      <div className="p-4 border-b border-[#183923] flex items-center justify-between bg-[#08180f]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-700/60">
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              AgriSim AI Conversational Farm Assistant
            </h4>
            <span className="text-[10px] text-slate-400">
              Context: {fullContext.crop_name} • Yield: {Math.round(fullContext.yield_kg_ha)} kg/ha
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getProviderBadge()}
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900 transition-all"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h5 className="text-sm font-bold text-white">Ask Anything About Your Simulation</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                I can explain why specific strategies outperform your baseline, quantify water savings, evaluate rainfall deficits, or describe Pareto trade-offs.
              </p>
            </div>

            {/* Starter Suggestion Chips */}
            <div className="w-full max-w-md pt-2 space-y-1.5 text-left">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block text-center mb-1">
                Suggested Questions:
              </span>
              <div className="flex flex-col gap-1.5">
                {suggestedFollowups.slice(0, 4).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="p-2 rounded-xl bg-[#081a10] hover:bg-[#0e2719] border border-[#183a24] text-left text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-950 border border-emerald-700/60 text-emerald-400'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    isUser
                      ? 'bg-emerald-700 text-white rounded-tr-none'
                      : 'bg-[#0a1e12] border border-[#1b3d27] text-slate-200 rounded-tl-none space-y-1'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="p-3 rounded-2xl bg-[#0a1e12] border border-[#1b3d27] text-xs text-slate-400 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing simulation telemetry...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Follow-up Question Chips */}
      {messages.length > 0 && suggestedFollowups.length > 0 && (
        <div className="px-4 py-2 border-t border-[#14331e] bg-[#07170e] flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[10px] text-slate-500 uppercase font-bold shrink-0">Follow-up:</span>
          {suggestedFollowups.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="px-2.5 py-1 rounded-full bg-[#0a1f13] hover:bg-[#0f2e1c] border border-[#1c472b] text-[11px] text-slate-300 hover:text-white shrink-0 transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-[#183923] bg-[#08180f] flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask about ${fullContext.crop_name} yield, water savings, trade-offs, or risks...`}
          className="flex-1 bg-[#06140b] border border-[#1b3d27] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          className="agri-btn-primary p-2.5 rounded-xl shrink-0 disabled:opacity-40"
          title="Send question"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
