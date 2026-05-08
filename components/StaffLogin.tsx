import React, { useEffect, useRef, useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertTriangle, Command, Terminal, Hexagon, Eye, EyeOff } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import Logo from './Logo';
import { supabase } from '../services/supabaseClient';
import { optimizeImage } from '../utils/mediaOptimization';

interface StaffLoginProps {
  onLogin: () => void;
}

const StaffLogin: React.FC<StaffLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const HCAPTCHA_SITE_KEY = '0d0cfd40-72aa-4570-a4fa-e8f263ce1d24';
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<any>(null);
  const isCaptchaRequired =
    typeof window !== 'undefined' &&
    !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  useEffect(() => {
    const isRecoveryLink = () => {
      if (typeof window === 'undefined') return false;
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      return searchParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
    };

    if (isRecoveryLink()) {
      setIsRecoveryMode(true);
      setInfo('Lien de reinitialisation detecte. Definissez un nouveau mot de passe.');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setError('');
        setInfo('Lien valide. Definissez un nouveau mot de passe.');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const mapAuthError = (rawMessage: string) => {
    const msg = (rawMessage || '').toLowerCase();
    if (msg.includes('database error querying schema')) {
      return "Erreur Auth Supabase: 'Database error querying schema'. Verifiez Authentication > Auth Hooks (desactivez les hooks actifs ou corrigez la fonction cible).";
    }
    if (msg.includes('database error loading user')) {
      return "Erreur Auth Supabase: 'Database error loading user'. Verifiez la coherence auth.users/auth.identities ou les hooks Auth.";
    }
    if (msg.includes('captcha')) {
      if (!isCaptchaRequired) {
        return 'Captcha actif cote Supabase: en local, desactive Bot Protection (Auth) ou configure une cle captcha de test.';
      }
      return 'Captcha invalide.';
    }
    if (msg.includes('email not confirmed')) return "Email non confirme. Validez d'abord le mail de confirmation.";
    if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
      return 'Acces refuse. Identifiants invalides.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'Trop de tentatives. Reessayez dans quelques minutes.';
    }
    return "Erreur d'authentification. Verifiez vos informations.";
  };

  const resolveEmailFromIdentifier = async (identifier: string): Promise<string | null> => {
    const rawIdentifier = identifier.trim();
    if (!rawIdentifier) return null;

    if (rawIdentifier.includes('@')) {
      return rawIdentifier.toLowerCase();
    }

    // Compatibility mode: current schema has no `staff.username`, so username maps to staff.name.
    const { data, error } = await supabase
      .from('staff')
      .select('email')
      .ilike('name', rawIdentifier)
      .maybeSingle();

    if (error) {
      console.error('Identifier resolution error:', error);
      throw new Error("Erreur systeme: impossible de verifier l'identifiant.");
    }

    return data?.email?.toLowerCase() || null;
  };

  const handleLogin = async () => {
    setError('');
    setInfo('');
    const rawIdentifier = email.trim();

    if (isCaptchaRequired && !captchaToken) {
      setError('Securite ERP: Captcha requis.');
      return;
    }
    if (!rawIdentifier || !password.trim()) {
      setError('Identifiant (email ou username) et mot de passe requis.');
      return;
    }

    setIsLoading(true);

    try {
      const resolvedEmail = await resolveEmailFromIdentifier(rawIdentifier);
      if (!resolvedEmail) {
        throw new Error('Acces refuse. Identifiants invalides.');
      }

      const signInPayload: Parameters<typeof supabase.auth.signInWithPassword>[0] = {
        email: resolvedEmail,
        password
      };
      if (isCaptchaRequired && captchaToken) {
        signInPayload.options = { captchaToken };
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword(signInPayload);

      if (authError) {
        console.error('Supabase signInWithPassword raw error:', authError);
        throw new Error(mapAuthError(authError.message));
      }

      // Defense in depth: authenticated user must also exist in staff table.
      const signedEmail = authData.user?.email || resolvedEmail;
      const { data: staffRow, error: staffError } = await supabase.from('staff').select('id').eq('email', signedEmail).maybeSingle();

      if (staffError || !staffRow) {
        await supabase.auth.signOut();
        throw new Error("Acces refuse. Compte non autorise pour l'ERP.");
      }

      captchaRef.current?.resetCaptcha();
      onLogin();
    } catch (err: any) {
      console.error('Login Error:', err);
      setError(err.message || 'Erreur systeme');
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    const rawIdentifier = email.trim();

    if (!rawIdentifier) {
      setError("Renseignez votre identifiant (email ou username).");
      return;
    }

    setIsResetLoading(true);
    try {
      const resolvedEmail = await resolveEmailFromIdentifier(rawIdentifier);
      if (resolvedEmail) {
        const resetOptions: Parameters<typeof supabase.auth.resetPasswordForEmail>[1] = {
          redirectTo: `${window.location.origin}/admin`,
        };
        if (isCaptchaRequired && captchaToken) {
          resetOptions.captchaToken = captchaToken;
        }
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(resolvedEmail, resetOptions);

        if (resetError) {
          throw new Error(mapAuthError(resetError.message));
        }
      }

      setInfo('Si le compte existe, un email de reinitialisation a ete envoye.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || "Impossible d'envoyer le mail de reinitialisation.");
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setError('');
    setInfo('');

    if (!newPassword || !confirmPassword) {
      setError('Renseignez le nouveau mot de passe et la confirmation.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        throw new Error(mapAuthError(updateError.message));
      }

      await supabase.auth.signOut();
      setIsRecoveryMode(false);
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setInfo('Mot de passe mis a jour. Connectez-vous avec le nouveau mot de passe.');

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, '/admin');
      }
    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err.message || 'Impossible de mettre a jour le mot de passe.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecoveryMode) {
      await handleUpdatePassword();
      return;
    }
    await handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 min-h-[600px]">
        <div className="relative hidden md:flex flex-col justify-between p-12 overflow-hidden group border-r border-white/5">
          <div className="absolute inset-0 z-0">
            <img
              src={optimizeImage('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop', 1000)}
              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[20s]"
              alt="Workspace"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-xeption-gold/10 mix-blend-multiply"></div>
          </div>

          <div className="relative z-10">
            <div className="w-12 h-12 border border-white/20 rounded flex items-center justify-center mb-6 bg-black/20 backdrop-blur-sm">
              <Hexagon className="text-xeption-gold w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xeption-gold font-tech font-bold uppercase tracking-[0.2em] text-sm mb-2">Internal System</h2>
            <h1 className="text-white text-5xl font-black font-tech leading-none uppercase drop-shadow-lg">
              Xeption
              <br />
              ERP <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-white">.OS</span>
            </h1>
          </div>

          <div className="relative z-10 border-l-4 border-xeption-gold pl-6 py-4 bg-black/60 backdrop-blur-md rounded-r-lg shadow-2xl mt-auto">
            <blockquote className="text-gray-100 text-lg font-medium italic leading-relaxed font-sans mb-4">
              "Rendez votre produit plus simple a acheter que celui de vos concurrents."
              <footer className="text-xeption-gold text-xs font-bold uppercase mt-2 not-italic tracking-wider">- Mark Cuban</footer>
            </blockquote>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-start gap-3">
                <div className="text-xl font-bold text-xeption-red font-mono leading-none">59%</div>
                <p className="text-[10px] text-gray-300 leading-tight">des clients partent apres plusieurs mauvaises experiences.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-xl font-bold text-blue-400 font-mono leading-none">80%</div>
                <p className="text-[10px] text-gray-300 leading-tight">des clients disent que l'experience compte autant que le produit.</p>
              </div>
            </div>
          </div>
        </div>

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
              {isRecoveryMode ? 'Reinitialisation Staff' : 'Connexion Staff'}
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              {isRecoveryMode
                ? 'Definissez un nouveau mot de passe pour votre compte staff.'
                : 'Identifiez-vous pour acceder au terminal de gestion.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isRecoveryMode && (
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold text-xeption-gold uppercase tracking-widest ml-1 flex items-center gap-1 group-focus-within:text-white transition-colors">
                  <Terminal className="w-3 h-3" /> Identifiant Staff
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 text-white pl-4 pr-4 py-4 rounded-sm outline-none focus:border-xeption-gold focus:bg-black/60 transition-all placeholder-gray-500 font-mono text-sm shadow-inner backdrop-blur-sm"
                    placeholder="email ou username"
                    autoComplete="username"
                  />
                </div>
              </div>
            )}

            {!isRecoveryMode ? (
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold text-xeption-gold uppercase tracking-widest ml-1 flex items-center gap-1 group-focus-within:text-white transition-colors">
                  <Lock className="w-3 h-3" /> Passcode
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 text-white pl-4 pr-12 py-4 rounded-sm outline-none focus:border-xeption-gold focus:bg-black/60 transition-all placeholder-gray-500 font-mono text-sm shadow-inner backdrop-blur-sm"
                    placeholder="************"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResetLoading}
                    className="text-xs text-xeption-gold hover:text-white transition-colors underline underline-offset-4 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isResetLoading ? 'Envoi du lien...' : 'Mot de passe oublie ?'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-xeption-gold uppercase tracking-widest ml-1 flex items-center gap-1 group-focus-within:text-white transition-colors">
                    <Lock className="w-3 h-3" /> Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 text-white pl-4 pr-12 py-4 rounded-sm outline-none focus:border-xeption-gold focus:bg-black/60 transition-all placeholder-gray-500 font-mono text-sm shadow-inner backdrop-blur-sm"
                      placeholder="Minimum 8 caracteres"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold text-xeption-gold uppercase tracking-widest ml-1 flex items-center gap-1 group-focus-within:text-white transition-colors">
                    <Lock className="w-3 h-3" /> Confirmer le mot de passe
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 text-white pl-4 pr-4 py-4 rounded-sm outline-none focus:border-xeption-gold focus:bg-black/60 transition-all placeholder-gray-500 font-mono text-sm shadow-inner backdrop-blur-sm"
                    placeholder="Retapez le mot de passe"
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            {!isRecoveryMode && isCaptchaRequired && (
              <div className="flex justify-center my-2 scale-90 origin-left">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={HCAPTCHA_SITE_KEY}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  theme="dark"
                />
              </div>
            )}
            {!isRecoveryMode && !isCaptchaRequired && (
              <div className="p-3 bg-green-900/20 border-l-2 border-green-500 text-green-200 text-xs font-mono backdrop-blur-sm">
                Mode local detecte: captcha desactive.
              </div>
            )}

            {info && (
              <div className="p-4 bg-blue-900/20 border-l-2 border-blue-500 text-blue-200 text-xs font-mono backdrop-blur-sm">{info}</div>
            )}

            {error && (
              <div className="p-4 bg-red-900/20 border-l-2 border-red-500 text-red-300 text-xs font-mono flex items-center gap-3 animate-in slide-in-from-left-2 backdrop-blur-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (!isRecoveryMode && isCaptchaRequired && !captchaToken)}
              className="w-full bg-white text-black font-tech font-bold uppercase tracking-wider py-4 hover:bg-xeption-gold transition-all shadow-[0_5px_20px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group relative overflow-hidden rounded-sm"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Command className="w-4 h-4" />}
                {isLoading
                  ? isRecoveryMode
                    ? 'Mise a jour...'
                    : 'Authentification...'
                  : isRecoveryMode
                    ? 'Mettre a jour le mot de passe'
                    : 'Acceder au Terminal'}
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
