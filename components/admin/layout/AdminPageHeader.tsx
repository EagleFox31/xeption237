import React, { useCallback, useState } from 'react';
import { Info, X, type LucideIcon } from 'lucide-react';
import { adminUi } from '../shared/adminUi';

/**
 * Bandeau doré de titre de page — repliable à la demande.
 *
 * COMPORTEMENT : il reste affiché tant qu'on ne le ferme pas. La croix le replie
 * en une pastille « i » qui permet de le rouvrir, et la page s'en souvient — on
 * ferme une fois, pas à chaque navigation.
 *
 * Pas de repli automatique : un bandeau qui disparaît tout seul pendant qu'on le
 * lit est plus gênant qu'un bandeau qui reste.
 *
 * ⚠️ Les ACTIONS de la page restent visibles dans les DEUX états. Elles vivent
 * dans ce bandeau mais n'en font pas partie : les masquer rendrait certaines
 * pages inutilisables.
 *
 * Stockage en `localStorage` (contrairement au mode test de la caisse, en
 * `sessionStorage`) : c'est une préférence d'affichage, pas un garde-fou. Rien
 * de fâcheux ne découle d'un bandeau replié plus longtemps que prévu.
 */

const STORAGE_PREFIX = 'xeption.admin.header.';

const readCollapsed = (key?: string): boolean => {
  if (!key || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === '1';
  } catch {
    return false;
  }
};

const persistCollapsed = (key: string | undefined, collapsed: boolean): void => {
  if (!key || typeof window === 'undefined') return;
  try {
    if (collapsed) window.localStorage.setItem(STORAGE_PREFIX + key, '1');
    else window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* stockage indisponible : le repli reste valable pour la session en cours */
  }
};

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  /** Identifiant de page — sert à mémoriser le repli. Sans lui, pas de mémoire. */
  storageKey?: string;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  actions,
  storageKey,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed(storageKey));

  const collapse = useCallback(() => {
    setCollapsed(true);
    persistCollapsed(storageKey, true);
  }, [storageKey]);

  const expand = useCallback(() => {
    setCollapsed(false);
    persistCollapsed(storageKey, false);
  }, [storageKey]);

  if (collapsed) {
    return (
      <div className="mb-3 md:mb-4 flex items-center justify-between gap-2 animate-in fade-in duration-300">
        <button
          type="button"
          onClick={expand}
          aria-label={`Afficher la description : ${title}`}
          title={description ? `${title} — ${description}` : title}
          className="flex items-center gap-2 rounded-full border border-xeption-gold/40 bg-xeption-gold/10 px-3 py-1.5 text-xs text-xeption-gold hover:bg-xeption-gold/20 hover:border-xeption-gold/70 transition-colors"
        >
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span className="font-tech font-bold uppercase tracking-tight">{title}</span>
        </button>

        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    );
  }

  return (
    <header
      className={`mb-4 md:mb-6 ${adminUi.pageHeaderCard} group animate-in fade-in slide-in-from-top-2 duration-500 fill-mode-both`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.35)_50%,transparent_65%)] -translate-x-full motion-safe:group-hover:translate-x-full transition-transform duration-[1400ms] ease-out"
        aria-hidden
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="min-w-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
            {Icon && (
              <Icon
                className="w-4 h-4 md:w-[18px] md:h-[18px] text-black shrink-0 self-center -translate-y-px animate-in zoom-in-95 duration-400 delay-75 fill-mode-both motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-6 transition-transform duration-300"
                aria-hidden
              />
            )}
            <h1
              className={`text-lg md:text-xl leading-tight ${adminUi.pageHeaderTitle} shrink-0 animate-in fade-in slide-in-from-left-2 duration-400 delay-100 fill-mode-both`}
            >
              {title}
            </h1>
            {description && (
              <>
                <span
                  className="text-black/35 font-bold shrink-0 animate-in fade-in duration-300 delay-150 fill-mode-both"
                  aria-hidden
                >
                  :
                </span>
                <p
                  className={`${adminUi.pageHeaderDesc} min-w-[10rem] flex-1 animate-in fade-in slide-in-from-left-1 duration-400 delay-200 fill-mode-both`}
                >
                  {description}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 sm:pl-2">
          {actions && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in zoom-in-95 duration-400 delay-300 fill-mode-both">
              {actions}
            </div>
          )}
          <button
            type="button"
            onClick={collapse}
            aria-label="Réduire le bandeau"
            title="Réduire — réaffichable par le bouton i"
            className="p-1.5 rounded-sm text-black/60 hover:text-black hover:bg-black/10 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminPageHeader;
