import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Tag } from 'lucide-react';
import { adminUi } from '../shared/adminUi';
import { slugifyCatalogLabel } from '../../../hooks/admin/useBrandsManager';

interface ProductRangeCreateModalProps {
  isOpen: boolean;
  draftName: string;
  categoryLabel: string;
  categorySlug: string;
  brandLabel: string;
  brandId: string;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}

const ProductRangeCreateModal: React.FC<ProductRangeCreateModalProps> = ({
  isOpen,
  draftName,
  categoryLabel,
  categorySlug,
  brandLabel,
  brandId,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState(draftName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(draftName);
      setError(null);
      setSaving(false);
    }
  }, [isOpen, draftName]);

  const slugPreview = useMemo(() => slugifyCatalogLabel(name), [name]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Le nom de la gamme doit contenir au moins 2 caractères.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible de créer la gamme.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-lg ${adminUi.surface} p-6 border-xeption-gold/50 shadow-[0_0_30px_rgba(255,215,0,0.2)]`}
      >
        <div className="flex items-center gap-3 mb-5">
          <Tag className="w-7 h-7 text-xeption-gold shrink-0" />
          <div>
            <h3 className="text-xl font-bold font-tech uppercase text-white">Nouvelle gamme</h3>
            <p className="text-xs text-white/60 mt-0.5">
              Elle sera liée à la marque et au type du produit en cours.
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className={adminUi.label}>Nom de la gamme / série</label>
            <input
              autoFocus
              className={`${adminUi.input} mt-1.5`}
              placeholder="ex: Vivobook, Galaxy S, iPad Air…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2.5">
              <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">Type</p>
              <p className="text-sm text-white">{categoryLabel || categorySlug || '—'}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2.5">
              <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">Marque</p>
              <p className="text-sm text-white">{brandLabel || '—'}</p>
            </div>
          </div>

          <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2.5">
            <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">Identifiant catalogue</p>
            <p className="text-xs font-mono text-xeption-gold/90 break-all">
              {slugPreview || '—'}
            </p>
            <p className="text-[10px] text-white/45 mt-1">
              Généré automatiquement — sert au filtrage boutique et à la structure catalogue.
            </p>
          </div>

          {!brandId && (
            <p className="text-xs text-amber-300/90">
              Choisissez d’abord une marque sur le produit avant de créer une gamme.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving} className={adminUi.btnGhost}>
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !brandId}
            className={`${adminUi.btnPrimary} disabled:opacity-50`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Création…
              </>
            ) : (
              'Créer et sélectionner'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductRangeCreateModal;
