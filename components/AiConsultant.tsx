import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Loader2, Sparkles } from 'lucide-react';
import { getShoppingAdvice } from '../services/geminiService';
import { ChatMessage } from '../types';

const AiConsultant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Salut le Boss ! C'est Xeption AI. Tu cherches un téléphone ou un PC ? Donne-moi ton budget, je te sors les meilleures pépites." }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

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
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[400px] h-[80vh] sm:h-[600px] z-50 bg-[#0a0a0a] border border-gray-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in">
          
          {/* Header */}
          <div className="bg-black/80 backdrop-blur border-b border-gray-800 p-4 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent opacity-50"></div>
            
            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-10 h-10 border border-xeption-gold/30 bg-xeption-gold/5 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-xeption-gold" />
              </div>
              <div>
                <h3 className="font-tech font-bold text-xl text-white uppercase tracking-wider">Xeption AI</h3>
                <p className="text-[10px] text-green-500 font-mono flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 mr-2 animate-pulse"></span>
                  SYSTEM ONLINE
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-tech-pattern bg-repeat">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-4 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-xeption-highlight border border-gray-700 text-white' 
                      : 'bg-xeption-gold/10 border border-xeption-gold/20 text-gray-200'
                  }`}
                >
                  {msg.role === 'model' && <p className="text-[10px] text-xeption-gold font-bold font-tech mb-1 uppercase tracking-wider">Xeption Bot</p>}
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-xeption-gold/5 border border-xeption-gold/20 p-3">
                  <Loader2 className="h-4 w-4 text-xeption-gold animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black border-t border-gray-800">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Dis-moi ton budget..."
                className="flex-1 bg-[#111] border border-gray-800 text-white px-4 py-3 focus:outline-none focus:border-xeption-gold/50 font-mono text-sm placeholder-gray-600"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-xeption-gold hover:bg-white text-black p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiConsultant;