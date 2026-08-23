import React from 'react';
import { MapPin, X } from 'lucide-react';
import { Store } from '../../../types';
import { adminUi } from '../shared/adminUi';

interface StoreEditorModalProps {
  store: Partial<Store>;
  onClose: () => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  onChange: (updates: Partial<Store>) => void;
  isSaving?: boolean;
}

const StoreEditorModal: React.FC<StoreEditorModalProps> = ({
  store,
  onClose,
  onSave,
  onChange,
  isSaving = false,
}) => {
  const isNew = (store.id ?? '').startsWith('new_');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !isSaving && onClose()}
    >
      <div className={`${adminUi.surface} w-full sm:max-w-lg rounded-t-xl sm:rounded-lg`} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
          <div>
            <h3 className="text-xl font-bold font-tech text-white uppercase">
              {isNew ? 'Nouvelle boutique' : 'Modifier la boutique'}
            </h3>
            <p className="mt-1 text-sm text-white/60">Point de vente pour le stock et les ventes.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="p-2 text-white/60 hover:text-white" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="p-5 space-y-4">
          <div>
            <label className={`${adminUi.label} block mb-1.5`}>Nom</label>
            <input
              className={adminUi.input}
              value={store.name ?? ''}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Ex. Xeption Douala Akwa"
              required
            />
          </div>
          <div>
            <label className={`${adminUi.label} block mb-1.5`}>Code (URL interne)</label>
            <input
              className={adminUi.input}
              value={store.code ?? ''}
              onChange={(e) => onChange({ code: e.target.value })}
              placeholder="douala-akwa"
            />
          </div>
          <div>
            <label className={`${adminUi.label} block mb-1.5`}>Ville</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
              <input
                className={`${adminUi.input} pl-10`}
                value={store.city ?? ''}
                onChange={(e) => onChange({ city: e.target.value })}
                placeholder="Yaoundé, Douala…"
              />
            </div>
          </div>
          <div>
            <label className={`${adminUi.label} block mb-1.5`}>Adresse</label>
            <input
              className={adminUi.input}
              value={store.address ?? ''}
              onChange={(e) => onChange({ address: e.target.value })}
              placeholder="Quartier, repère…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={store.active !== false}
              onChange={(e) => onChange({ active: e.target.checked })}
              className="rounded border-white/20"
            />
            Boutique active
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
            <button type="button" onClick={onClose} disabled={isSaving} className={adminUi.btnGhost}>
              Annuler
            </button>
            <button type="submit" disabled={isSaving} className={adminUi.btnPrimary}>
              {isSaving ? 'Enregistrement…' : isNew ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreEditorModal;
