
import React, { useState } from 'react';
import { Lock, User, Key, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import Logo from './Logo';
import { supabase } from '../services/supabaseClient';

interface StaffLoginProps {
  onLogin: () => void;
}

const StaffLogin: React.FC<StaffLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
        // Query Supabase 'staff' table by username
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !data) {
            throw new Error('Identifiants incorrects');
        }

        // Login success
        onLogin();
    } catch (err) {
        setError('Username ou mot de passe incorrect');
        console.error("Login failed", err);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 relative overflow-hidden">
        
        {/* Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-xeption-gold/5 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-xeption-red/5 rounded-full blur-[100px] animate-pulse delay-700"></div>

        <div className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/10 p-8 sm:p-10 rounded-sm shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
            
            <div className="text-center mb-10">
                <div className="flex justify-center mb-6 transform scale-125">
                    <Logo />
                </div>
                <h2 className="text-xl font-bold text-white font-tech uppercase tracking-widest flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4 text-xeption-gold" />
                    Accès Staff
                </h2>
                <p className="text-gray-500 text-xs mt-2">Identifiants requis pour l'administration</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Username</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-xeption-gold transition-colors" />
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 text-white pl-12 pr-4 py-4 outline-none focus:border-xeption-gold transition-colors placeholder-gray-700 font-mono text-sm"
                            placeholder="Ex: samuel_admin"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Mot de passe</label>
                    <div className="relative group">
                        <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-xeption-gold transition-colors" />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 text-white pl-12 pr-4 py-4 outline-none focus:border-xeption-gold transition-colors placeholder-gray-700 font-mono text-sm"
                            placeholder="••••••••••••"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-bold uppercase tracking-wide animate-in shake flex items-center justify-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-xeption-gold text-black font-tech font-bold uppercase tracking-wider py-4 hover:bg-white transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Vérification...
                        </>
                    ) : (
                        'Se Connecter'
                    )}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 text-center">
                <div className="inline-flex items-center gap-2 text-gray-600">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                        Secured by <span className="text-gray-400 hover:text-white transition-colors cursor-help">Trigenys Group</span>
                    </span>
                </div>
            </div>

        </div>
    </div>
  );
};

export default StaffLogin;
