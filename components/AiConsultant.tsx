import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Bot, X, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { sendAiChatMessage, ensureChatAuth, AI_CHAT_CAPTCHA_AFTER } from '../services/aiChatService';
import { getAiChatSessionKey } from '../utils/aiChatSessionKey';
import { HCAPTCHA_SITE_KEY } from '../constants/hCaptcha';
import type { ChatMessage } from '../types';

const WELCOME_MESSAGE =
  "Salut le Boss ! C'veut dire quoi aujourd'hui ?\n\nC'est Xeption AI. Tu cherches un téléphone ou un PC ?\n\nDonne-moi ton budget, je te sors les meilleures pépites du Mboa.";

const AiConsultant: React.FC = () => {
  const location = useLocation();
  const isProductPage = location.pathname.startsWith('/product/');
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const captchaRef = useRef<HCaptcha>(null);
  const sessionKey = useMemo(() => getAiChatSessionKey(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: WELCOME_MESSAGE },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userTurnCount = useMemo(
    () => messages.filter((msg) => msg.role === 'user').length,
    [messages],
  );

  const needsCaptcha = captchaRequired || userTurnCount >= AI_CHAT_CAPTCHA_AFTER;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    captchaRef.current?.resetCaptcha();
  };

  const cleanFormat = (text: string) =>
    text
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/#/g, '')
      .trim();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    const history = messages;

    setIsLoading(true);

    if (userTurnCount >= AI_CHAT_CAPTCHA_AFTER) {
      const auth = await ensureChatAuth(captchaToken);
      if (!auth.ok) {
        setIsLoading(false);
        if (auth.needsCaptcha) {
          setCaptchaRequired(true);
          if (!captchaToken) return;
          resetCaptcha();
        }
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: auth.message || 'Valide le captcha pour continuer.' },
        ]);
        return;
      }
    }

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);

    const result = await sendAiChatMessage({
      message: userMsg,
      history,
      sessionKey,
    });

    if (result.ok) {
      setCaptchaRequired(false);
      setMessages((prev) => [...prev, { role: 'model', text: result.text }]);
    } else if (result.code === 'captcha_required') {
      setCaptchaRequired(true);
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: result.message },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: result.message },
      ]);
    }

    setIsLoading(false);
  };

  const sendBlocked = isLoading || !input.trim();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed right-4 sm:right-6 z-40 bg-black border border-xeption-gold text-xeption-gold p-3.5 sm:p-4 shadow-[0_0_20px_rgba(255,215,0,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] hover:scale-105 transition-all duration-300 group ${
          isProductPage ? 'bottom-24 md:bottom-6' : 'bottom-6'
        } ${isOpen ? 'hidden' : 'flex'}`}
      >
        <div className="absolute inset-0 bg-xeption-gold/10 animate-pulse" />
        <Bot className="h-6 w-6 relative z-10" />
        <span className="absolute -top-3 -right-3 bg-xeption-red text-white text-[10px] font-bold px-2 py-1 font-tech uppercase tracking-widest shadow-lg">
          IA
        </span>
      </button>

      {isOpen && (
        <div className="fixed bottom-0 right-0 w-full h-[85dvh] landscape:h-[100dvh] sm:w-[400px] sm:h-[600px] sm:landscape:h-[600px] sm:max-h-[calc(100vh-32px)] sm:bottom-4 sm:right-4 z-50 bg-[#070707] border border-white/5 sm:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-black/90 backdrop-blur-xl border-b border-white/5 p-4 sm:p-5 flex justify-between items-center relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent opacity-50" />

            <div className="flex items-center space-x-3 relative z-10">
              <div className="w-10 h-10 border border-xeption-gold/20 bg-xeption-gold/5 flex items-center justify-center rounded-sm">
                <Sparkles className="h-5 w-5 text-xeption-gold animate-pulse" />
              </div>
              <div>
                <h3 className="font-tech font-bold text-xl text-white uppercase tracking-widest">Xeption AI</h3>
                <p className="text-[10px] text-green-500 font-mono flex items-center mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-500 mr-2 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
                  SYSTEM ONLINE
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-xeption-gold transition-colors p-2 bg-white/5 rounded-full hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-tech-pattern bg-repeat scroll-smooth">
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

          <div className="p-4 sm:p-5 bg-black border-t border-white/5 shrink-0 space-y-3">
            {needsCaptcha && (
              <div className="rounded-sm border border-white/10 bg-white/5 p-3 space-y-2">
                <p className="text-[10px] font-tech uppercase tracking-widest text-white/80 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-xeption-gold" />
                  Vérification anti-robot
                </p>
                <div className="flex justify-center">
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={HCAPTCHA_SITE_KEY}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Dis-moi ton budget ou ta recherche..."
                className="flex-1 bg-xeption-dark border border-white/5 text-white px-4 sm:px-5 py-3 sm:py-4 focus:outline-none focus:border-xeption-gold/40 font-mono text-xs sm:text-sm placeholder-gray-700 transition-all rounded-sm"
              />
              <button
                onClick={handleSend}
                disabled={sendBlocked}
                className="bg-xeption-gold hover:bg-white text-black p-3 sm:p-4 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,215,0,0.1)] active:scale-95 rounded-sm"
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <p className="text-[9px] text-gray-600 text-center uppercase tracking-widest font-bold opacity-50">
              Propulsé par Xeption AI
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AiConsultant;
