import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, TrendingDown, MapPin, Calendar } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { adminUi } from '../shared/adminUi';

/**
 * Prix marché constatés — saisie boutique.
 *
 * Pourquoi cet onglet existe : le prix de référence du Smart Troc venait
 * exclusivement de boutiques qui vendent du NEUF. Tout l'écart neuf → occasion
 * devait donc être absorbé par le ratio de reprise, alors qu'il varie
 * énormément selon le modèle. Sur un marché où la donnée web est pauvre, ce que
 * la boutique constate au comptoir est la source la plus fiable qui existe —
 * et elle est datée et attribuée, donc vérifiable.
 *
 * ⚠️ On saisit ici ce qu'un appareil **se vend ailleurs**, jamais notre propre
 * prix de reprise : ancrer sur nos prix rendrait l'évaluation circulaire.
 */

interface ReferenceRow {
  id: string;
  brand: string;
  model_name: string;
  storage: string | null;
  price_xaf: number;
  condition: 'used' | 'refurbished' | 'new';
  observed_at: string;
  observed_from: string;
  note: string | null;
}

const CONDITIONS: Array<{ value: ReferenceRow['condition']; label: string }> = [
  { value: 'used', label: 'Occasion' },
  { value: 'refurbished', label: 'Reconditionné' },
  { value: 'new', label: 'Neuf' },
];

const emptyForm = () => ({
  brand: '',
  model_name: '',
  storage: '',
  price_xaf: '',
  condition: 'used' as ReferenceRow['condition'],
  observed_from: '',
  note: '',
});

const formatXaf = (n: number): string =>
  new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, '.') + ' FCFA';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Au-delà de 180 jours la RPC ignore le relevé : autant le signaler à l'écran. */
const isStale = (iso: string): boolean => {
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  return Number.isFinite(days) && days > 180;
};

const MarketReferenceTab: React.FC = () => {
  const [rows, setRows] = useState<ReferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('market_reference_prices')
      .select('id, brand, model_name, storage, price_xaf, condition, observed_at, observed_from, note')
      .order('observed_at', { ascending: false })
      .limit(200);

    if (err) setError(err.message);
    else {
      setError(null);
      setRows((data ?? []) as ReferenceRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const priceNumber = Number(String(form.price_xaf).replace(/[^\d]/g, ''));

  const canSubmit =
    form.brand.trim().length >= 2 &&
    form.model_name.trim().length >= 2 &&
    form.observed_from.trim().length >= 2 &&
    Number.isFinite(priceNumber) &&
    priceNumber > 0;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);

    const { data: session } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('market_reference_prices').insert({
      brand: form.brand.trim(),
      model_name: form.model_name.trim(),
      storage: form.storage.trim() || null,
      price_xaf: priceNumber,
      condition: form.condition,
      observed_from: form.observed_from.trim(),
      note: form.note.trim() || null,
      created_by: session?.user?.id ?? null,
    });

    if (err) setError(err.message);
    else {
      setForm(emptyForm());
      await load();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('market_reference_prices').delete().eq('id', id);
    if (err) setError(err.message);
    else setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const staleCount = useMemo(() => rows.filter((r) => isStale(r.observed_at)).length, [rows]);

  const inputCls =
    'w-full bg-black/40 border border-white/15 text-white px-3 py-2 text-sm rounded-sm ' +
    'placeholder-white/40 focus:border-xeption-gold/60 outline-none transition-colors';

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-xeption-gold/30 bg-xeption-gold/[0.06] p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-4 h-4 text-xeption-gold" />
          <p className={adminUi.label}>Ce qu'on note ici</p>
        </div>
        <p className="text-sm text-white/80">
          Le prix auquel un appareil <strong className="text-white">se vend ailleurs</strong> —
          chez un concurrent, au marché, ou ce qu'un client dit avoir vu. Jamais notre propre
          prix de reprise : l'estimation tournerait en rond.
        </p>
        <p className="text-xs text-white/60 mt-2">
          Un relevé de plus de 180 jours n'est plus pris en compte dans l'estimation.
          {staleCount > 0 && (
            <span className="text-amber-300"> {staleCount} relevé(s) dans ce cas ci-dessous.</span>
          )}
        </p>
      </div>

      {/* ── Saisie ─────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-white/15 bg-white/[0.04] p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input
            className={inputCls}
            placeholder="Marque *"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Modèle *"
            value={form.model_name}
            onChange={(e) => setForm({ ...form, model_name: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Stockage (128 Go)"
            value={form.storage}
            onChange={(e) => setForm({ ...form, storage: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Prix constaté *"
            inputMode="numeric"
            value={form.price_xaf}
            onChange={(e) => setForm({ ...form, price_xaf: e.target.value })}
          />
          <select
            className={inputCls}
            value={form.condition}
            onChange={(e) =>
              setForm({ ...form, condition: e.target.value as ReferenceRow['condition'] })
            }
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value} className="bg-black">
                {c.label}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            placeholder="Vu où ? *"
            value={form.observed_from}
            onChange={(e) => setForm({ ...form, observed_from: e.target.value })}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-3">
          <input
            className={inputCls}
            placeholder="Remarque (facultatif)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="shrink-0 flex items-center justify-center gap-2 bg-xeption-gold hover:bg-white
                       text-black font-tech font-bold uppercase tracking-widest px-6 py-2 text-xs
                       rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>

        {!canSubmit && (form.brand || form.model_name || form.price_xaf) && (
          <p className="text-xs text-white/60 mt-2">
            Il manque : marque, modèle, prix et l'endroit où tu l'as vu.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-sm border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* ── Relevés ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement des relevés…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-white/70">
          Aucun relevé pour l'instant. Le premier prix noté ici prendra le pas sur la table figée
          dans le code.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/15">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.06]">
              <tr className="text-left">
                <th className="px-4 py-3 font-tech text-[10px] uppercase tracking-widest text-white/70">Appareil</th>
                <th className="px-4 py-3 font-tech text-[10px] uppercase tracking-widest text-white/70">État</th>
                <th className="px-4 py-3 font-tech text-[10px] uppercase tracking-widest text-white/70">Prix</th>
                <th className="px-4 py-3 font-tech text-[10px] uppercase tracking-widest text-white/70">Vu</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-t border-white/10 ${isStale(r.observed_at) ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3 text-white">
                    {r.brand} {r.model_name}
                    {r.storage && <span className="text-white/60"> · {r.storage}</span>}
                    {r.note && <div className="text-xs text-white/60 mt-0.5">{r.note}</div>}
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {CONDITIONS.find((c) => c.value === r.condition)?.label ?? r.condition}
                  </td>
                  <td className="px-4 py-3 font-tech text-xeption-gold tabular-nums">
                    {formatXaf(r.price_xaf)}
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-white/50" /> {r.observed_from}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-white/60 mt-0.5">
                      <Calendar className="w-3 h-3" /> {formatDate(r.observed_at)}
                      {isStale(r.observed_at) && <span className="text-amber-300">· périmé</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-2 rounded-sm text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      title="Supprimer ce relevé"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MarketReferenceTab;
