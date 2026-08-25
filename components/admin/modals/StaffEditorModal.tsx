import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Mail,
  Shield,
  ShoppingBag,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { Staff, Store } from '../../../types';
import {
  STAFF_ROLES,
  StaffRoleDefinition,
  StaffRoleId,
  normalizeStaffRole,
} from '../../../constants/staffRoles';
import { adminUi } from '../shared/adminUi';

interface StaffEditorModalProps {
  staff: Staff;
  stores: Store[];
  onClose: () => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  onChange: (updates: Partial<Staff>) => void;
  isSaving?: boolean;
}

type WizardStep = 'profil' | 'identite' | 'confirmation';

const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'profil', label: 'Profil' },
  { id: 'identite', label: 'Identité' },
  { id: 'confirmation', label: 'Validation' },
];

const ROLE_ICONS: Record<StaffRoleId, React.ElementType> = {
  vendeur: ShoppingBag,
  responsable: Shield,
  direction: Crown,
  super_admin: Sparkles,
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const staffInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const RoleCard: React.FC<{
  role: StaffRoleDefinition;
  selected: boolean;
  onSelect: () => void;
}> = ({ role, selected, onSelect }) => {
  const Icon = ROLE_ICONS[role.id];
  const isStudio = role.id === 'super_admin';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full text-left rounded-lg border p-4 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xeption-gold/50 ${
        selected
          ? 'border-xeption-gold bg-xeption-gold/10 shadow-[0_0_24px_rgba(255,215,0,0.15)]'
          : 'border-white/10 bg-black/30 hover:border-white/25 hover:bg-white/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors ${
            selected ? 'bg-xeption-gold text-black' : 'bg-white/10 text-white'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white text-sm">{role.label}</p>
            {selected && <Check className="h-4 w-4 text-xeption-gold shrink-0" />}
          </div>
          <p className="mt-1 text-xs text-white/60 leading-snug">{role.idealFor}</p>
          {isStudio && (
            <span className="mt-2 inline-block rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
              Réservé dev
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {role.highlights.map((item) => (
          <span
            key={item}
            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
              selected ? 'bg-xeption-gold/20 text-xeption-gold' : 'bg-white/8 text-white/70'
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </button>
  );
};

const StepIndicator: React.FC<{ current: WizardStep; isNew: boolean }> = ({ current, isNew }) => {
  if (!isNew) return null;
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-2 mb-6">
      {WIZARD_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? 'bg-xeption-gold text-black'
                    : active
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white/50'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
              <span
                className={`hidden sm:block text-xs font-bold uppercase tracking-wide truncate ${
                  active ? 'text-white' : done ? 'text-xeption-gold' : 'text-white/45'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div className={`h-px flex-1 min-w-4 ${done ? 'bg-xeption-gold/60' : 'bg-white/10'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const ProfilePreview: React.FC<{ name: string; email: string; role: StaffRoleDefinition }> = ({
  name,
  email,
  role,
}) => {
  const Icon = ROLE_ICONS[role.id];
  return (
    <div className={`${adminUi.surface} p-4 border-xeption-gold/20`}>
      <p className={`${adminUi.label} mb-3`}>Aperçu</p>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-xeption-gold text-black font-tech font-bold text-lg">
          {staffInitials(name)}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white truncate">{name.trim() || 'Prénom Nom'}</p>
          <p className="text-xs text-white/55 truncate">{email.trim() || 'email@exemple.cm'}</p>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/8 px-2.5 py-1.5">
        <Icon className="h-3.5 w-3.5 text-xeption-gold" />
        <span className="text-xs font-bold text-white">{role.label}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {role.highlights.slice(0, 4).map((item) => (
          <span key={item} className="rounded bg-black/40 px-2 py-0.5 text-[10px] text-white/70">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

const StaffEditorModal: React.FC<StaffEditorModalProps> = ({
  staff,
  stores,
  onClose,
  onSave,
  onChange,
  isSaving = false,
}) => {
  const isNew = (staff.id || '').startsWith('new');
  const [step, setStep] = useState<WizardStep>('profil');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ name: false, email: false });

  const selectedRole = normalizeStaffRole(staff.role);
  const selectedDefinition = useMemo(
    () => STAFF_ROLES.find((r) => r.id === selectedRole) ?? STAFF_ROLES[0],
    [selectedRole],
  );

  const name = staff.name || '';
  const email = staff.email || '';
  const nameError = touched.name && name.trim().length < 2 ? 'Indiquez le nom complet.' : null;
  const emailError =
    touched.email && !isValidEmail(email) ? 'Email invalide — même adresse que le compte de connexion.' : null;

  const canGoIdentity = !!selectedDefinition;
  const canGoConfirm = name.trim().length >= 2 && isValidEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await onSave(e);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Enregistrement impossible. Vérifiez l’email ou réessayez.';
      setSaveError(message);
    }
  };

  const renderRolePicker = () => (
    <div className="grid gap-3 sm:grid-cols-2">
      {STAFF_ROLES.map((role) => (
        <RoleCard
          key={role.id}
          role={role}
          selected={selectedRole === role.id}
          onSelect={() => onChange({ role: role.id })}
        />
      ))}
    </div>
  );

  const renderIdentity = () => (
    <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
      <div className="space-y-4">
        <div>
          <label htmlFor="staff-name" className={`${adminUi.label} block mb-1.5`}>
            Nom affiché
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
            <input
              id="staff-name"
              autoFocus
              className={`${adminUi.input} pl-10 ${nameError ? 'border-red-400/60' : ''}`}
              placeholder="Ex. Marie Kamga"
              value={name}
              onChange={(e) => onChange({ name: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            />
          </div>
          {nameError && <p className="mt-1.5 text-xs text-red-400">{nameError}</p>}
        </div>
        <div>
          <label htmlFor="staff-email" className={`${adminUi.label} block mb-1.5`}>
            Email de connexion
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
            <input
              id="staff-email"
              type="email"
              className={`${adminUi.input} pl-10 ${emailError ? 'border-red-400/60' : ''}`}
              placeholder="marie@xeption237.com"
              value={email}
              onChange={(e) => onChange({ email: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            />
          </div>
          {emailError ? (
            <p className="mt-1.5 text-xs text-red-400">{emailError}</p>
          ) : (
            <p className="mt-1.5 text-xs text-white/55">
              Utilisé pour la connexion — le compte Auth sera créé automatiquement à l’enregistrement.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="staff-store" className={`${adminUi.label} block mb-1.5`}>
            Boutique
          </label>
          <select
            id="staff-store"
            className={adminUi.input}
            value={staff.store_id ?? ''}
            onChange={(e) => onChange({ store_id: e.target.value || null })}
          >
            <option value="">— Non assigné —</option>
            {stores.filter((s) => s.active).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.city ? ` (${s.city})` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-white/55">
            La caisse et les ventes seront rattachées à cette boutique (étape 5).
          </p>
        </div>
      </div>
      <ProfilePreview name={name} email={email} role={selectedDefinition} />
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-5">
      <ProfilePreview name={name} email={email} role={selectedDefinition} />

      <div className={`${adminUi.hintCard} space-y-3`}>
        <p className="text-sm font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-xeption-gold" />
          Connexion automatique
        </p>
        <p className="text-sm text-white/75">
          Compte Auth créé avec le nom <strong className="text-white">{name.trim() || '…'}</strong>. Un mot de
          passe <strong className="text-white">unique</strong> sera généré et affiché une seule fois, à
          l’enregistrement — note-le à ce moment-là.
        </p>
      </div>

      {saveError && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {saveError}
        </p>
      )}
    </div>
  );

  const renderEditForm = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <p className={`${adminUi.label} mb-3`}>Profil d’accès</p>
        {renderRolePicker()}
      </div>
      {renderIdentity()}
      {saveError && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {saveError}
        </p>
      )}
    </div>
  );

  const renderWizardBody = () => {
    if (step === 'profil') return renderRolePicker();
    if (step === 'identite') return renderIdentity();
    return renderConfirmation();
  };

  const goNext = () => {
    if (step === 'profil' && canGoIdentity) setStep('identite');
    else if (step === 'identite') {
      setTouched({ name: true, email: true });
      if (canGoConfirm) setStep('confirmation');
    }
  };

  const goBack = () => {
    if (step === 'identite') setStep('profil');
    else if (step === 'confirmation') setStep('identite');
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && !isSaving && onClose()}
    >
      <div
        className={`${adminUi.surface} w-full sm:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col rounded-t-xl sm:rounded-lg`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-modal-title"
      >
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-white/10 shrink-0">
          <div>
            <h3 id="staff-modal-title" className="text-xl font-bold font-tech text-white uppercase">
              {isNew ? 'Nouveau membre' : 'Modifier le membre'}
            </h3>
            <p className="mt-1 text-sm text-white/60">
              {isNew
                ? 'Choisissez le profil, puis renseignez l’identité.'
                : 'Mettez à jour le profil ou les coordonnées.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-5 sm:p-6 overflow-y-auto flex-1">
            <StepIndicator current={step} isNew={isNew} />
            {isNew ? renderWizardBody() : renderEditForm()}
          </div>

          <div className="flex items-center justify-between gap-3 p-5 sm:p-6 border-t border-white/10 shrink-0 bg-black/20">
            {isNew ? (
              <>
                <button
                  type="button"
                  onClick={step === 'profil' ? onClose : goBack}
                  disabled={isSaving}
                  className={`${adminUi.btnGhost} disabled:opacity-40`}
                >
                  {step === 'profil' ? (
                    'Annuler'
                  ) : (
                    <>
                      <ArrowLeft className="h-4 w-4" /> Retour
                    </>
                  )}
                </button>
                {step === 'confirmation' ? (
                  <button type="submit" disabled={isSaving} className={`${adminUi.btnPrimary} disabled:opacity-60`}>
                    {isSaving ? 'Enregistrement…' : 'Créer le membre'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={
                      (step === 'identite' && !canGoConfirm) ||
                      (step === 'profil' && !canGoIdentity)
                    }
                    className={`${adminUi.btnPrimary} disabled:opacity-40`}
                  >
                    Continuer <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className={`${adminUi.btnGhost} disabled:opacity-40`}
                >
                  Annuler
                </button>
                <button type="submit" disabled={isSaving || !canGoConfirm} className={`${adminUi.btnPrimary} disabled:opacity-40`}>
                  {isSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffEditorModal;
