
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Loader2, Sparkles } from 'lucide-react';
import { getShoppingAdvice } from '../services/geminiService';
import { ChatMessage } from '../types';

const AiConsultant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Salut le Boss ! C'veut dire quoi aujourd'hui ?\n\nC'est Xeption AI. Tu cherches un téléphone ou un PC ?\n\nDonne-moi ton budget, je te sors les meilleures pépites du Mboa." }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Client-side cleaning in case the AI fails the system instruction
  const cleanFormat = (text: string) => {
    return text
      .replace(/\*\*/g, '') // Remove double asterisks
      .replace(/__/g, '')   // Remove double underscores
      .replace(/#/g, '')    // Remove hashtags (markdown titles)
      .trim();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const response = await getShoppingAdvice(userMsg, messages);
    
    setTimeout(() => {
        setMessages(prev => [...prev, { role: 'model', text: response || "Réseau un peu lent, mais on est là." }]);
        setIsLoading(false);
    }, 500);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 bg-black border border-xeption-gold text-xeption-gold p-4 shadow-[0_0_20px_rgba(255,215,0,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] hover:scale-105 transition-all duration-300 group ${isOpen ? 'hidden' : 'flex'}`}
      >
        <div className="absolute inset-0 bg-xeption-gold/10 animate-pulse"></div>
        <Bot className="h-6 w-6 relative z-10" />
        <span className="absolute -top-3 -right-3 bg-xeption-red text-white text-[10px] font-bold px-2 py-1 font-tech uppercase tracking-widest shadow-lg">
          IA
        </span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[420px] h-[85vh] sm:h-[650px] z-50 bg-[#070707] border border-white/5 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-black/90 backdrop-blur-xl border-b border-white/5 p-5 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent opacity-50"></div>
            
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-10 h-10 border border-xeption-gold/20 bg-xeption-gold/5 flex items-center justify-center rounded-sm">
                <Sparkles className="h-5 w-5 text-xeption-gold animate-pulse" />
              </div>
              <div>
                <h3 className="font-tech font-bold text-xl text-white uppercase tracking-widest">Xeption AI</h3>
                <p className="text-[10px] text-green-500 font-mono flex items-center mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-500 mr-2 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                  SYSTEM ONLINE
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-xeption-gold transition-colors p-2"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-tech-pattern bg-repeat scroll-smooth">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}
              >
                {msg.role === 'model' && (
                  <span className="text-[9px] text-xeption-gold/60 font-bold font-tech mb-2 uppercase tracking-widest ml-1">
                    Xeption Assistant
                  </span>
                )}
                
                <div 
                  className={`max-w-[90%] p-4 text-sm leading-relaxed whitespace-pre-wrap transition-all ${
                    msg.role === 'user' 
                      ? 'bg-xeption-highlight border border-white/10 text-white rounded-sm rounded-tr-none' 
                      : 'bg-xeption-gold/5 border border-xeption-gold/10 text-gray-100 rounded-sm rounded-tl-none shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  <div className="space-y-4">
                    {cleanFormat(msg.text).split('\n\n').map((para, pIdx) => (
                        <p key={pIdx}>{para}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col items-start">
                 <span className="text-[9px] text-xeption-gold/60 font-bold font-tech mb-2 uppercase tracking-widest ml-1">
                    Analyse en cours...
                  </span>
                <div className="bg-xeption-gold/5 border border-xeption-gold/10 p-4 rounded-sm flex items-center gap-3">
                  <Loader2 className="h-4 w-4 text-xeption-gold animate-spin" />
                  <span className="text-xs text-gray-500 font-tech uppercase tracking-widest animate-pulse">Réflexion...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-5 bg-black border-t border-white/5">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Dis-moi ton budget ou ta recherche..."
                className="flex-1 bg-xeption-dark border border-white/5 text-white px-5 py-4 focus:outline-none focus:border-xeption-gold/40 font-mono text-sm placeholder-gray-700 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-xeption-gold hover:bg-white text-black p-4 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,215,0,0.1)] active:scale-95"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="text-[9px] text-gray-600 mt-3 text-center uppercase tracking-widest font-bold opacity-50">
              Propulsé par Gemini &bull; Trigenys Expert AI
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AiConsultant;
