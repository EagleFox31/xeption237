import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  User,
} from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import Logo from './Logo';
import { supabase } from '../services/supabaseClient';
import { optimizeImage } from '../utils/mediaOptimization';
import { resolveSuperAdminAccess, isSuperAdminEmail, getSuperAdminEmails } from '../utils/superAdmin';
import {
  getStaffRoleLabel,
  normalizeStaffRole,
  STAFF_ROLES,
  StaffRoleId,
} from '../constants/staffRoles';
import { adminUi } from './admin/shared/adminUi';
import { HCAPTCHA_SITE_KEY } from '../constants/hCaptcha';

interface StaffLoginProps {
  onLogin: () => void;
  /** erp = staff table requis ; studio = super admin uniquement */
  mode?: 'erp' | 'studio';
}

type LoginStep = 'identify' | 'password' | 'recovery';

type StaffPreview = {
  name: string;
  email: string;
  role: StaffRoleId;
};

const ERP_TIPS = [
  { emoji: '🛒', text: 'Encaissez une vente en boutique en quelques clics.' },
  { emoji: '📦', text: 'Mettez à jour le stock ou ajoutez un produit au catalogue.' },
  { emoji: '🔔', text: 'Les nouvelles commandes web apparaissent en direct.' },
  { emoji: '🤝', text: 'Retrouvez vos clients et leurs achats en un endroit.' },
];

const LOADING_MESSAGES = [
  'On vérifie votre accès…',
  'Ouverture de l’espace équipe…',
  'Encore une seconde…',
];

const staffInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const StaffLogin: React.FC<StaffLoginProps> = ({ onLogin, mode = 'erp' }) => {
  const [step, setStep] = useState<LoginStep>('identify');
  const [email, setEmail] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [staffPreview, setStaffPreview] = useState<StaffPreview | null>(null);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [tipIndex, setTipIndex] = useState(0);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCaptchaRequired =
    typeof window !== 'undefined' &&
    !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  const isStudio = mode === 'studio';

  const roleDefinition = useMemo(() => {
    if (!staffPreview) return null;
    return STAFF_ROLES.find((r) => r.id === staffPreview.role) ?? STAFF_ROLES[0];
  }, [staffPreview]);

  useEffect(() => {
    const isRecoveryLink = () => {
      if (typeof window === 'undefined') return false;
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      return searchParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
    };

    if (isRecoveryLink()) {
      setStep('recovery');
      setInfo('Lien de réinitialisation détecté. Choisissez un nouveau mot de passe.');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep('recovery');
        setError('');
        setInfo('Lien valide. Choisissez un nouveau mot de passe.');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (isStudio || step !== 'identify') return;
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % ERP_TIPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isStudio, step]);

  const mapAuthError = (rawMessage: string, resolved?: string) => {
    const msg = (rawMessage || '').toLowerCase();
    if (msg.includes('database error querying schema')) {
      return 'Erreur Auth Supabase. Vérifiez Authentication → Auth Hooks dans le dashboard.';
    }
    if (msg.includes('database error loading user')) {
      return 'Erreur Auth Supabase lors du chargement du compte. Vérifiez auth.users ou les hooks Auth.';
    }
    if (msg.includes('captcha')) {
      if (!isCaptchaRequired) {
        return 'Captcha actif côté Supabase : en local, désactivez Bot Protection ou configurez une clé de test.';
      }
      return 'Captcha invalide — réessayez.';
    }
    if (msg.includes('email not confirmed')) return 'Email non confirmé. Validez d’abord le mail de confirmation.';
    if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
      if (isStudio && resolved && isSuperAdminEmail(resolved)) {
        return 'Mot de passe incorrect ou compte absent dans Supabase Auth. Créez l’utilisateur (même email) ou utilisez « Mot de passe oublié ».';
      }
      // Il n'y a plus de mot de passe d'équipe : chaque compte a le sien.
      return 'Mot de passe incorrect. Utilisez « Mot de passe oublié », ou demandez à votre responsable d’en régénérer un.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'Trop de tentatives. Patientez quelques minutes.';
    }
    return 'Connexion impossible. Vérifiez vos informations.';
  };

  const resolveEmailFromIdentifier = async (identifier: string): Promise<string | null> => {
    const rawIdentifier = identifier.trim();
    if (!rawIdentifier) return null;

    if (rawIdentifier.includes('@')) {
      return rawIdentifier.toLowerCase();
    }

    const { data, error: lookupError } = await supabase
      .from('staff')
      .select('email')
      .ilike('name', rawIdentifier)
      .maybeSingle();

    if (lookupError) {
      console.error('Identifier resolution error:', lookupError);
      throw new Error('Impossible de vérifier l’identifiant pour le moment.');
    }

    return data?.email?.toLowerCase() || null;
  };

  const fetchStaffPreview = async (identifier: string): Promise<StaffPreview | null> => {
    const resolved = await resolveEmailFromIdentifier(identifier);
    if (!resolved) return null;

    const { data, error: staffError } = await supabase
      .from('staff')
      .select('name, email, role')
      .eq('email', resolved)
      .maybeSingle();

    if (staffError || !data) return null;

    return {
      name: data.name,
      email: data.email,
      role: normalizeStaffRole(data.role),
    };
  };

  const runStaffLookup = async (identifier: string) => {
    if (isStudio || !identifier.trim()) {
      setStaffPreview(null);
      return;
    }

    setIsLookingUp(true);
    try {
      const preview = await fetchStaffPreview(identifier);
      setStaffPreview(preview);
    } catch {
      setStaffPreview(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleIdentifierChange = (value: string) => {
    setEmail(value);
    setError('');
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    lookupTimerRef.current = setTimeout(() => {
      void runStaffLookup(value);
    }, 450);
  };

  const handleIdentifyContinue = async () => {
    setError('');
    setInfo('');
    const rawIdentifier = email.trim();

    if (!rawIdentifier) {
      setError(isStudio ? 'Entrez votre email créateur.' : 'Entrez votre email ou votre prénom.');
      return;
    }

    setIsLoading(true);
    try {
      const resolved = await resolveEmailFromIdentifier(rawIdentifier);
      if (!resolved) {
        throw new Error(
          isStudio
            ? 'Utilisez l’email super admin enregistré dans Supabase.'
            : 'Aucun membre trouvé avec cet identifiant. Vérifiez l’email ou demandez à la direction.',
        );
      }

      if (isStudio) {
        const studioAllowed = await resolveSuperAdminAccess(resolved);
        if (!studioAllowed) {
          const configured = getSuperAdminEmails();
          throw new Error(
            configured.length === 0
              ? 'Studio : ajoutez VITE_SUPER_ADMIN_EMAILS=ton@email.com dans .env puis redémarrez le serveur.'
              : `Email non autorisé pour Studio. Emails configurés : ${configured.join(', ')}`,
          );
        }
        setResolvedEmail(resolved);
        setStep('password');
        return;
      }

      const preview = await fetchStaffPreview(rawIdentifier);
      if (!preview) {
        throw new Error('Ce compte n’est pas autorisé pour l’ERP. Contactez la direction.');
      }

      setStaffPreview(preview);
      setResolvedEmail(resolved);
      setStep('password');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Identifiant invalide.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setInfo('');

    if (isCaptchaRequired && !captchaToken) {
      setError(isStudio ? 'Captcha requis pour le Studio.' : 'Validez le captcha pour continuer.');
      return;
    }
    if (!password.trim()) {
      setError('Entrez votre mot de passe.');
      return;
    }

    setIsLoading(true);

    try {
      const signInPayload: Parameters<typeof supabase.auth.signInWithPassword>[0] = {
        email: resolvedEmail,
        password,
      };
      if (isCaptchaRequired && captchaToken) {
        signInPayload.options = { captchaToken };
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword(signInPayload);

      if (authError) {
        console.error('Supabase signInWithPassword raw error:', authError);
        throw new Error(mapAuthError(authError.message, resolvedEmail));
      }

      const signedEmail = authData.user?.email || resolvedEmail;

      if (mode === 'studio') {
        const allowed = await resolveSuperAdminAccess(signedEmail);
        if (!allowed) {
          await supabase.auth.signOut();
          throw new Error('Accès Studio réservé au créateur / super admin.');
        }
      } else {
        const { data: staffRow, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('email', signedEmail)
          .maybeSingle();

        if (staffError || !staffRow) {
          await supabase.auth.signOut();
          throw new Error('Compte non autorisé pour l’ERP.');
        }
      }

      captchaRef.current?.resetCaptcha();
      setShowSuccess(true);
      setTimeout(() => onLogin(), 900);
    } catch (err: unknown) {
      console.error('Login Error:', err);
      setError(err instanceof Error ? err.message : 'Erreur système');
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    const rawIdentifier = email.trim() || resolvedEmail;

    if (!rawIdentifier) {
      setError('Indiquez d’abord votre email ou prénom.');
      return;
    }

    setIsResetLoading(true);
    try {
      const resolved = await resolveEmailFromIdentifier(rawIdentifier);
      if (resolved) {
        const resetOptions: Parameters<typeof supabase.auth.resetPasswordForEmail>[1] = {
          redirectTo: `${window.location.origin}/admin`,
        };
        if (isCaptchaRequired && captchaToken) {
          resetOptions.captchaToken = captchaToken;
        }
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(resolved, resetOptions);

        if (resetError) {
          throw new Error(mapAuthError(resetError.message));
        }
      }

      setInfo('Si le compte existe, un email de réinitialisation vient d’être envoyé.');
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Impossible d’envoyer le mail de réinitialisation.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const passwordStrength = useMemo(() => {
    const value = newPassword;
    if (!value) return { score: 0, label: '', color: 'bg-white/10' };
    let score = 0;
    if (value.length >= 8) score += 1;
    if (value.length >= 12) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    if (score <= 2) return { score: 1, label: 'Faible', color: 'bg-red-400' };
    if (score <= 3) return { score: 2, label: 'Correct', color: 'bg-amber-400' };
    return { score: 3, label: 'Solide', color: 'bg-emerald-400' };
  }, [newPassword]);

  const handleUpdatePassword = async () => {
    setError('');
    setInfo('');

    if (!newPassword || !confirmPassword) {
      setError('Renseignez le nouveau mot de passe et sa confirmation.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        throw new Error(mapAuthError(updateError.message));
      }

      await supabase.auth.signOut();
      setStep('identify');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setInfo('Mot de passe mis à jour. Reconnectez-vous avec le nouveau mot de passe.');

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, '/admin');
      }
    } catch (err: unknown) {
      console.error('Password update error:', err);
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour le mot de passe.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'recovery') {
      await handleUpdatePassword();
      return;
    }
    if (step === 'identify') {
      await handleIdentifyContinue();
      return;
    }
    await handleLogin();
  };

  const goBackToIdentify = () => {
    setStep('identify');
    setPassword('');
    setError('');
    setInfo('');
    setCaptchaToken(null);
    captchaRef.current?.resetCaptcha();
  };

  const displayName = staffPreview?.name || (isStudio ? 'Créateur' : 'Équipe Xeption');
  const currentTip = ERP_TIPS[tipIndex];

  const leftHighlights = roleDefinition?.highlights ?? ['Commandes', 'Vente boutique', 'Clients', 'Catalogue'];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${adminUi.surface} p-8 text-center max-w-sm mx-4 border-xeption-gold/40 animate-in zoom-in-95 duration-300`}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-xeption-gold text-black">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <p className="text-xl font-bold font-tech text-white uppercase">Bienvenue</p>
            <p className="mt-2 text-sm text-white/70">
              {staffPreview?.name ? `${staffPreview.name}, c’est parti !` : 'Ouverture en cours…'}
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 min-h-[620px]">
        {/* Panneau gauche — ambiance boutique */}
        <div className="relative hidden md:flex flex-col justify-between p-10 overflow-hidden group border-r border-white/5">
          <div className="absolute inset-0 z-0">
            <img
              src={optimizeImage(
                'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop',
                1000,
              )}
              className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-[20s]"
              alt="Boutique Xeption"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-xeption-gold/10" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/40 border border-white/15 px-3 py-1.5 mb-6">
              {isStudio ? (
                <Sparkles className="h-4 w-4 text-violet-300" />
              ) : (
                <Store className="h-4 w-4 text-xeption-gold" />
              )}
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                {isStudio ? 'Espace Studio' : 'Espace équipe'}
              </span>
            </div>
            <h1 className="text-white text-4xl font-black font-tech leading-tight uppercase">
              {isStudio ? (
                <>
                  Console
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-white">
                    créateur
                  </span>
                </>
              ) : (
                <>
                  Bienvenue
                  <br />
                  <span className="text-xeption-gold">chez Xeption</span>
                </>
              )}
            </h1>
            <p className="mt-3 text-sm text-white/70 max-w-xs leading-relaxed">
              {isStudio
                ? 'Paramètres avancés et outils catalogue — réservé à l’équipe technique.'
                : 'Connectez-vous pour gérer la boutique : caisse, commandes, stock et clients.'}
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            {staffPreview && roleDefinition ? (
              <div className={`${adminUi.surface} p-4 border-xeption-gold/25 animate-in slide-in-from-bottom-2 duration-300`}>
                <p className={`${adminUi.label} mb-3`}>Votre profil</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-xeption-gold text-black font-bold">
                    {staffInitials(staffPreview.name)}
                  </div>
                  <div>
                    <p className="font-bold text-white">{staffPreview.name}</p>
                    <p className="text-xs text-xeption-gold">{getStaffRoleLabel(staffPreview.role)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {leftHighlights.slice(0, 4).map((item) => (
                    <span key={item} className="rounded bg-white/8 px-2 py-0.5 text-[10px] text-white/75">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`${adminUi.hintCard} animate-in fade-in duration-500`} key={tipIndex}>
                <p className="text-2xl mb-2">{currentTip.emoji}</p>
                <p className="text-sm text-white/80 leading-relaxed">{currentTip.text}</p>
              </div>
            )}

            {!isStudio && (
              <div className="flex flex-wrap gap-2">
                {['Commandes', 'Caisse', 'Stock', 'SAV'].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white/60"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Formulaire */}
        <div className="p-8 md:p-12 flex flex-col justify-center relative bg-transparent">
          <div className="absolute top-0 right-0 p-5 opacity-40 pointer-events-none">
            <Logo className="scale-75 grayscale" />
          </div>

          {step !== 'recovery' && (
            <div className="flex items-center gap-2 mb-8">
              {(['identify', 'password'] as const).map((s, index) => {
                const active = step === s;
                const done = step === 'password' && s === 'identify';
                return (
                  <React.Fragment key={s}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          done
                            ? 'bg-xeption-gold text-black'
                            : active
                              ? 'bg-white text-black'
                              : 'bg-white/10 text-white/45'
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : index + 1}
                      </div>
                      <span className={`text-xs font-bold uppercase ${active || done ? 'text-white' : 'text-white/40'}`}>
                        {s === 'identify' ? 'Qui êtes-vous ?' : 'Mot de passe'}
                      </span>
                    </div>
                    {index === 0 && <div className={`h-px flex-1 min-w-6 ${done ? 'bg-xeption-gold/50' : 'bg-white/10'}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white font-tech uppercase tracking-wide">
              {step === 'recovery'
                ? 'Nouveau mot de passe'
                : step === 'identify'
                  ? isStudio
                    ? 'Bonjour créateur'
                    : 'Bonjour !'
                  : `Bonjour ${displayName.split(' ')[0]}`}
            </h2>
            <p className="text-white/60 text-sm mt-2 leading-relaxed">
              {step === 'recovery'
                ? 'Choisissez un mot de passe d’au moins 8 caractères.'
                : step === 'identify'
                  ? isStudio
                    ? 'Entrez l’email configuré pour le Studio.'
                    : 'Votre email ou prénom — on vous reconnaît dans l’équipe.'
                  : 'Entrez votre mot de passe pour ouvrir l’ERP.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 'identify' && (
              <div>
                <label htmlFor="staff-identifier" className={`${adminUi.label} block mb-1.5`}>
                  {isStudio ? 'Email créateur' : 'Email ou prénom'}
                </label>
                <div className="relative">
                  {isStudio ? (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                  ) : (
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                  )}
                  <input
                    id="staff-identifier"
                    type="text"
                    value={email}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    className={`${adminUi.input} pl-10 py-3.5`}
                    placeholder={isStudio ? 'fondateur@xeption237.com' : 'marie@… ou Marie'}
                    autoComplete="username"
                    autoFocus
                  />
                  {isLookingUp && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 animate-spin" />
                  )}
                </div>

                {staffPreview && !isStudio && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-xeption-gold/30 bg-xeption-gold/10 px-3 py-2.5 animate-in slide-in-from-top-1 duration-200 md:hidden">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-xeption-gold text-black text-xs font-bold">
                      {staffInitials(staffPreview.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{staffPreview.name}</p>
                      <p className="text-xs text-xeption-gold">{getStaffRoleLabel(staffPreview.role)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'password' && (
              <>
                {staffPreview && (
                  <div className="hidden md:flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 mb-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-xeption-gold/20 text-xeption-gold text-xs font-bold">
                      {staffInitials(staffPreview.name)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{staffPreview.name}</p>
                      <p className="text-xs text-white/55">{getStaffRoleLabel(staffPreview.role)}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="staff-password" className={`${adminUi.label} block mb-1.5`}>
                    Mot de passe
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                    <input
                      id="staff-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${adminUi.input} pl-10 pr-12 py-3.5`}
                      placeholder="Votre mot de passe"
                      autoComplete="current-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white transition-colors"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isResetLoading}
                      className="text-xs text-xeption-gold hover:text-white transition-colors underline underline-offset-4 disabled:opacity-60"
                    >
                      {isResetLoading ? 'Envoi en cours…' : 'Mot de passe oublié ?'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 'recovery' && (
              <>
                <div>
                  <label htmlFor="new-password" className={`${adminUi.label} block mb-1.5`}>
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`${adminUi.input} pl-10 pr-12 py-3.5`}
                      placeholder="Minimum 8 caractères"
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white transition-colors"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((bar) => (
                          <div
                            key={bar}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              bar <= passwordStrength.score ? passwordStrength.color : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-white/50">Force : {passwordStrength.label}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm-password" className={`${adminUi.label} block mb-1.5`}>
                    Confirmer
                  </label>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${adminUi.input} py-3.5 ${
                      confirmPassword && confirmPassword === newPassword ? 'border-emerald-400/50' : ''
                    }`}
                    placeholder="Retapez le mot de passe"
                    autoComplete="new-password"
                  />
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Les mots de passe correspondent
                    </p>
                  )}
                </div>
              </>
            )}

            {(step === 'password' || (step === 'identify' && isCaptchaRequired)) && isCaptchaRequired && (
              <div className="flex justify-center scale-95 origin-center">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={HCAPTCHA_SITE_KEY}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  theme="dark"
                />
              </div>
            )}

            {!isStudio && step === 'identify' && !isCaptchaRequired && (
              <p className="text-xs text-emerald-300/80 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                Mode local : captcha désactivé pour faciliter les tests.
              </p>
            )}

            {info && (
              <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2.5 text-sm text-blue-200">
                {info}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-200 animate-in slide-in-from-top-1 duration-200">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              {step === 'password' && (
                <button
                  type="button"
                  onClick={goBackToIdentify}
                  disabled={isLoading}
                  className={`${adminUi.btnGhost} shrink-0 disabled:opacity-40`}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}

              <button
                type="submit"
                disabled={
                  isLoading ||
                  (step === 'password' && isCaptchaRequired && !captchaToken) ||
                  (step === 'recovery' && newPassword.length < 8)
                }
                className={`${adminUi.btnPrimary} flex-1 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {LOADING_MESSAGES[loadingMessageIndex]}
                  </>
                ) : step === 'recovery' ? (
                  'Enregistrer le mot de passe'
                ) : step === 'identify' ? (
                  <>
                    Continuer <ArrowRight className="h-4 w-4" />
                  </>
                ) : isStudio ? (
                  <>
                    <Sparkles className="h-4 w-4" /> Ouvrir le Studio
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" /> Ouvrir la boutique
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-5">
            <div className="flex items-center gap-2 text-white/45 text-[10px] uppercase font-bold tracking-widest">
              <ShieldCheck className="w-3 h-3" /> Connexion sécurisée
            </div>
            <p className="text-white/45 text-xs">
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
