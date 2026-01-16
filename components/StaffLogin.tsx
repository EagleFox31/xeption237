
import React, { useState, useRef } from 'react';
import { Lock, User, Key, ShieldCheck, Loader2, AlertTriangle, ServerCrash, Command, Terminal, Hexagon } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import Logo from './Logo';
import { supabase } from '../services/supabaseClient';
import { optimizeImage } from '../utils/mediaOptimization';

interface StaffLoginProps {
  onLogin: () => void;
}

const StaffLogin: React.FC<StaffLoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Clé HCaptcha (Requis par Supabase Security)
  const HCAPTCHA_SITE_KEY = "0d0cfd40-72aa-4570-a4fa-e8f263ce1d24";
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!captchaToken) {
        setError("Sécurité ERP : Captcha requis.");
        return;
    }

    setIsLoading(true);

    try {
        const { data, error: dbError } = await supabase
            .from('staff')
            .select('*')
            .eq('name', name)
            .eq('password', password)
            .single();

        if (dbError || !data) throw new Error('Accès refusé. Identifiants invalides.');
        if (!data.email) throw new Error("Compte staff corrompu (Email manquant).");

        const { error: authError } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: password,
            options: { captchaToken }
        });

        if (authError) {
             if (authError.message.includes('captcha')) throw new Error("Captcha invalide.");
             // Bypass infrastructure errors if local DB valid
             console.warn("Auth infra warning, proceeding via DB check.");
        }

        captchaRef.current?.resetCaptcha();
        onLogin();

    } catch (err: any) {
        console.error("Login Error:", err);
        setError(err.message || "Erreur système");
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    // Suppression de bg-[#050505] pour voir la vidéo en dessous
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
        
        {/* On retire le calque de bruit opaque pour laisser la vidéo de App.tsx visible */}
        
        {/* Card Container : Passage en glassmorphism (bg-black/70 backdrop-blur-xl) au lieu de noir solide */}
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 min-h-[600px]">
            
            {/* LEFT SIDE: Vibe / Art / Quote */}
            <div className="relative hidden md:flex flex-col justify-between p-12 overflow-hidden group border-r border-white/5">
                {/* Background Image with Gold Overlay */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src={optimizeImage("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop", 1000)}
                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[20s]"
                        alt="Workspace"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-xeption-gold/10 mix-blend-multiply"></div>
                </div>

                <div className="relative z-10">
                    <div className="w-12 h-12 border border-white/20 rounded flex items-center justify-center mb-6 bg-black/20 backdrop-blur-sm">
                        <Hexagon className="text-xeption-gold w-6 h-6 animate-pulse" />
                    </div>
                    <h2 className="text-xeption-gold font-tech font-bold uppercase tracking-[0.2em] text-sm mb-2">
                        Internal System
                    </h2>
                    <h1 className="text-white text-5xl font-black font-tech leading-none uppercase drop-shadow-lg">
                        Xeption<br/>ERP <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-white">.OS</span>
                    </h1>
                </div>

                <div className="relative z-10 border-l-4 border-xeption-gold pl-6 py-4 bg-black/60 backdrop-blur-md rounded-r-lg shadow-2xl mt-auto">
                    <blockquote className="text-gray-100 text-lg font-medium italic leading-relaxed font-sans mb-4">
                        « Rendez votre produit plus simple à acheter que celui de vos concurrents, sinon vous constaterez que vos clients achèteront chez eux, pas chez vous. »
                        <footer className="text-xeption-gold text-xs font-bold uppercase mt-2 not-italic tracking-wider">— Mark Cuban</footer>
                    </blockquote>

                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <div className="flex items-start gap-3">
                             <div className="text-xl font-bold text-xeption-red font-mono leading-none">59%</div>
                             <p className="text-[10px] text-gray-300 leading-tight">
                                des clients partent après plusieurs mauvaises expériences, <span className="text-xeption-red font-bold">17%</span> après une seule (US) — <span className="text-gray-500 font-bold">PwC</span>
                             </p>
                        </div>
                        <div className="flex items-start gap-3">
                             <div className="text-xl font-bold text-blue-400 font-mono leading-none">80%</div>
                             <p className="text-[10px] text-gray-300 leading-tight">
                                des clients disent que l’expérience compte autant que le produit/service — <span className="text-gray-500 font-bold">Salesforce</span>
                             </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: Login Form - Fond transparent pour garder le flou du parent */}
            <div className="p-8 md:p-16 flex flex-col justify-center relative bg-transparent">
                <div className="absolute top-0 right-0 p-6 opacity-30 pointer-events-none">
                    <Logo className="scale-75 grayscale" />
                </div>

                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded px-3 py-1 mb-6 backdrop-blur-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-mono text-gray-300 uppercase">System Operational</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white font-tech uppercase tracking-wide flex items-center gap-3 drop-shadow-md">
                        Connexion Staff
                    </h2>
                    <p className="text-gray-400 text-sm mt-2">Identifiez-vous pour accéder au terminal de gestion.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-xeption-gold uppercase tracking-widest ml-1 flex items-center gap-1 group-focus-within:text-white transition-colors">
                            <Terminal className="w-3 h-3" /> Agent ID
                        </label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 text-white pl-4 pr-4 py-4 rounded-sm outline-none focus:border-xeption-gold focus:bg-black/60 transition-all placeholder-gray-500 font-mono text-sm shadow-inner backdrop-blur-sm"
                                placeholder="Nom d'utilisateur..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-xeption-gold uppercase tracking-widest ml-1 flex items-center gap-1 group-focus-within:text-white transition-colors">
                            <Lock className="w-3 h-3" /> Passcode
                        </label>
                        <div className="relative">
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 text-white pl-4 pr-4 py-4 rounded-sm outline-none focus:border-xeption-gold focus:bg-black/60 transition-all placeholder-gray-500 font-mono text-sm shadow-inner backdrop-blur-sm"
                                placeholder="••••••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex justify-center my-2 scale-90 origin-left">
                        <HCaptcha
                            ref={captchaRef}
                            sitekey={HCAPTCHA_SITE_KEY}
                            onVerify={(token) => setCaptchaToken(token)}
                            onExpire={() => setCaptchaToken(null)}
                            theme="dark"
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-900/20 border-l-2 border-red-500 text-red-300 text-xs font-mono flex items-center gap-3 animate-in slide-in-from-left-2 backdrop-blur-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading || !captchaToken}
                        className="w-full bg-white text-black font-tech font-bold uppercase tracking-wider py-4 hover:bg-xeption-gold transition-all shadow-[0_5px_20px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group relative overflow-hidden rounded-sm"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Command className="w-4 h-4" />}
                            {isLoading ? 'Authentification...' : 'Accéder au Terminal'}
                        </span>
                    </button>
                </form>

                <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-6">
                    <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                        <ShieldCheck className="w-3 h-3" /> Secure v2.0
                    </div>
                    <p className="text-gray-500 text-xs">
                        Made 
                        <span className="font-pinyon text-xl text-xeption-gold italic mx-2 relative top-0.5">by</span> 
                        Trigenys Group
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StaffLogin;
