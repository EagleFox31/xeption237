
import React, { useState, useRef } from 'react';
import { Lock, User, Key, ShieldCheck, Loader2, AlertTriangle, ServerCrash, Quote, Sparkles, Terminal, ChevronRight } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import Logo from './Logo';
import { supabase } from '../services/supabaseClient';

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
        setError("Sécurité Supabase : Veuillez valider le captcha.");
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

        if (dbError || !data) {
            throw new Error('Identifiants incorrects.');
        }

        if (!data.email) {
            throw new Error("Compte staff incomplet (Email manquant).");
        }

        const { error: authError } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: password,
            options: { captchaToken }
        });

        if (authError) {
            console.warn("Supabase Auth Warning:", authError);
            if (authError.message.includes('Database error') || authError.message.includes('schema')) {
                 console.error("Infrastructure Error bypass: Auth service is down.");
            } else if (authError.message.includes('captcha')) {
                 throw new Error("Erreur Captcha : Veuillez réessayer.");
            }
        }

        captchaRef.current?.resetCaptcha();
        onLogin();

    } catch (err: any) {
        console.error("Erreur Connexion:", err);
        setError(err.message.includes('Identifiants') ? "Identifiants invalides." : (err.message || "Erreur système"));
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden selection:bg-xeption-gold selection:text-black">
        
        {/* --- LEFT SIDE: THE ERP FORM (Transparent/Glassy) --- */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-24 py-12 relative z-10 bg-black/10 backdrop-blur-md">
            
            {/* Background Texture for form side */}
            <div className="absolute inset-0 tech-pattern opacity-[0.05] pointer-events-none"></div>

            <div className="max-w-md w-full mx-auto relative">
                <div className="mb-12">
                    <Logo className="mb-8" />
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-[2px] w-8 bg-xeption-gold"></div>
                        <span className="text-xeption-gold text-xs font-bold uppercase tracking-[0.3em] font-tech">ERP Core System</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white font-tech uppercase tracking-tighter leading-none mb-2">
                        Staff <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Access</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-light">Authentification sécurisée requise pour accéder au catalogue Xeption.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <User className="w-3 h-3" /> Identifiant Staff
                        </label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 text-white px-5 py-4 outline-none focus:border-xeption-gold/50 transition-all placeholder-gray-700 font-mono text-sm rounded-sm"
                            placeholder="Entrez votre nom d'utilisateur"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Key className="w-3 h-3" /> Mot de passe chiffré
                        </label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 text-white px-5 py-4 outline-none focus:border-xeption-gold/50 transition-all placeholder-gray-700 font-mono text-sm rounded-sm"
                            placeholder="••••••••••••"
                            required
                        />
                    </div>

                    {/* HCaptcha Widget */}
                    <div className="flex justify-start py-2">
                        <HCaptcha
                            ref={captchaRef}
                            sitekey={HCAPTCHA_SITE_KEY}
                            onVerify={(token) => setCaptchaToken(token)}
                            onExpire={() => setCaptchaToken(null)}
                            theme="dark"
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 animate-in shake">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading || !captchaToken}
                        className="w-full bg-white text-black font-tech font-bold uppercase tracking-widest py-5 hover:bg-xeption-gold transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Déverrouiller le système
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 text-gray-600">
                        <Terminal className="w-4 h-4" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Xeption ERP v2.0.63</span>
                    </div>
                    <div className="text-center sm:text-right">
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] mr-2">by</span>
                        <span className="font-pinyon text-3xl text-gray-500 hover:text-xeption-gold transition-colors cursor-default">
                            Trigenys Group
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* --- RIGHT SIDE: THE CITATION PANEL (Semi-Transparent) --- */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black/20 backdrop-blur-sm items-center justify-center p-20">
            
            {/* Background Visuals */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?q=80&w=1632&auto=format&fit=crop')] bg-cover bg-center grayscale opacity-10 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-transparent to-xeption-gold/5"></div>
            
            {/* Floating Street Art Elements */}
            <div className="absolute top-20 right-20 w-64 h-64 bg-xeption-gold/5 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-xeption-red/5 rounded-full blur-[120px] animate-pulse delay-1000"></div>

            <div className="relative z-10 max-w-lg text-center lg:text-left">
                <div className="w-12 h-12 border-2 border-xeption-gold/20 flex items-center justify-center mb-8 mx-auto lg:mx-0">
                    <Quote className="w-6 h-6 text-xeption-gold/50 fill-xeption-gold/5" />
                </div>
                
                <h2 className="text-4xl md:text-5xl font-bold font-tech text-white uppercase leading-tight mb-6 drop-shadow-2xl">
                    L'excellence n'est pas une option, <br/>
                    <span className="text-xeption-gold italic">C'est une Xeption.</span>
                </h2>
                
                <div className="flex items-center gap-4 justify-center lg:justify-start">
                    <div className="w-10 h-[1px] bg-gray-700"></div>
                    <p className="text-gray-600 font-tech uppercase tracking-[0.4em] text-xs">Manifeste Staff 2026</p>
                </div>

                {/* Sub-card with Status */}
                <div className="mt-16 grid grid-cols-2 gap-4">
                    <div className="bg-black/40 backdrop-blur-md border border-white/5 p-4 rounded-sm">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Server Region</span>
                        <span className="text-gray-300 font-mono text-xs">CM-CENTRE-01</span>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md border border-white/5 p-4 rounded-sm">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Security Level</span>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-green-500/50" />
                            <span className="text-green-500/80 font-mono text-xs">MAXIMUM</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Signature Overlay */}
            <div className="absolute bottom-10 right-10 opacity-5 pointer-events-none">
                <span className="text-9xl font-tech font-black text-white/10 uppercase tracking-tighter">XPTN</span>
            </div>
        </div>
    </div>
  );
};

export default StaffLogin;
