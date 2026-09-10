import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { TradeInModel } from '../../../types';
import { Plus, Smartphone, Laptop, Loader2, Trash2, ChevronDown } from 'lucide-react';
import TableShell from '../shared/TableShell';
import { DB_TABLES, DB_SCHEMA } from '../../../constants/dbSchema';

const ArgusTab: React.FC = () => {
  const [models, setModels] = useState<TradeInModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'phone' | 'laptop'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newModel, setNewModel] = useState({
    brand: '',
    model_name: '',
    category: 'phone' as 'phone' | 'laptop',
    base_price: '',
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    const { data } = await supabase.from(DB_TABLES.TRADE_IN_MODELS).select('*').order('brand', { ascending: true });
    if (data) {
      const mapped = data.map((m: Record<string, unknown>) => ({
        id: m[DB_SCHEMA.TRADE_IN_MODELS.ID] as string,
        category: m[DB_SCHEMA.TRADE_IN_MODELS.CATEGORY] as TradeInModel['category'],
        brand: m[DB_SCHEMA.TRADE_IN_MODELS.BRAND] as string,
        model_name: m[DB_SCHEMA.TRADE_IN_MODELS.MODEL_NAME] as string,
        base_price: m[DB_SCHEMA.TRADE_IN_MODELS.BASE_PRICE] as number,
      }));
      setModels(mapped);
    }
    setLoading(false);
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel.brand || !newModel.model_name || !newModel.base_price) return;

    const payload = {
      [DB_SCHEMA.TRADE_IN_MODELS.BRAND]: newModel.brand,
      [DB_SCHEMA.TRADE_IN_MODELS.MODEL_NAME]: newModel.model_name,
      [DB_SCHEMA.TRADE_IN_MODELS.CATEGORY]: newModel.category,
      [DB_SCHEMA.TRADE_IN_MODELS.BASE_PRICE]: parseInt(newModel.base_price, 10),
    };

    const { data } = await supabase.from(DB_TABLES.TRADE_IN_MODELS).insert([payload]).select();

    if (data?.[0]) {
      const saved = data[0];
      setModels([
        ...models,
        {
          id: saved[DB_SCHEMA.TRADE_IN_MODELS.ID] as string,
          brand: saved[DB_SCHEMA.TRADE_IN_MODELS.BRAND] as string,
          model_name: saved[DB_SCHEMA.TRADE_IN_MODELS.MODEL_NAME] as string,
          category: saved[DB_SCHEMA.TRADE_IN_MODELS.CATEGORY] as TradeInModel['category'],
          base_price: saved[DB_SCHEMA.TRADE_IN_MODELS.BASE_PRICE] as number,
        },
      ]);
      setNewModel({ brand: '', model_name: '', category: 'phone', base_price: '' });
      setShowAddForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce modèle de l'Argus ?")) return;
    const { error } = await supabase.from(DB_TABLES.TRADE_IN_MODELS).delete().eq('id', id);
    if (!error) setModels(models.filter((m) => m.id !== id));
  };

  const handlePriceUpdate = async (id: string, newPrice: number) => {
    const { error } = await supabase
      .from(DB_TABLES.TRADE_IN_MODELS)
      .update({ [DB_SCHEMA.TRADE_IN_MODELS.BASE_PRICE]: newPrice })
      .eq('id', id);

    if (!error) {
      setModels(models.map((m) => (m.id === id ? { ...m, base_price: newPrice } : m)));
    }
  };

  const filteredModels = models.filter((m) => {
    const matchSearch =
      m.model_name.toLowerCase().includes(search.toLowerCase()) ||
      m.brand.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || m.category === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="flex flex-col h-full min-h-0 gap-3 animate-in fade-in">
      {showAddForm && (
        <form
          onSubmit={handleAddModel}
          className="shrink-0 rounded-sm border border-white/10 bg-black/40 p-3 grid grid-cols-2 md:grid-cols-5 gap-2 items-end"
        >
          <div>
            <label className="text-[10px] text-white/70 font-bold uppercase block mb-1">Type</label>
            <select
              value={newModel.category}
              onChange={(e) => setNewModel({ ...newModel, category: e.target.value as 'phone' | 'laptop' })}
              className="w-full bg-black/50 border border-white/10 text-white p-2 rounded-sm text-sm"
            >
              <option value="phone">Smartphone</option>
              <option value="laptop">Ordinateur</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/70 font-bold uppercase block mb-1">Marque</label>
            <input
              type="text"
              placeholder="Apple, Samsung…"
              value={newModel.brand}
              onChange={(e) => setNewModel({ ...newModel, brand: e.target.value })}
              className="w-full bg-black/50 border border-white/10 text-white p-2 rounded-sm text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-white/70 font-bold uppercase block mb-1">Modèle</label>
            <input
              type="text"
              placeholder="iPhone 15 Pro Max 256Go"
              value={newModel.model_name}
              onChange={(e) => setNewModel({ ...newModel, model_name: e.target.value })}
              className="w-full bg-black/50 border border-white/10 text-white p-2 rounded-sm text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/70 font-bold uppercase block mb-1">Prix grade A</label>
            <input
              type="number"
              placeholder="FCFA"
              value={newModel.base_price}
              onChange={(e) => setNewModel({ ...newModel, base_price: e.target.value })}
              className="w-full bg-black/50 border border-white/10 text-white p-2 rounded-sm text-sm font-mono text-xeption-gold"
            />
          </div>
          <button
            type="submit"
            className="col-span-2 md:col-span-5 w-full bg-xeption-gold/15 hover:bg-xeption-gold text-white hover:text-black border border-xeption-gold/30 font-bold uppercase py-2 rounded-sm transition-all text-[10px] tracking-widest"
          >
            Enregistrer
          </button>
        </form>
      )}

      <TableShell
        className="flex-1 min-h-0"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Marque ou modèle…"
        filterOptions={[
          { id: 'all', label: 'Tout' },
          { id: 'phone', label: 'Phones' },
          { id: 'laptop', label: 'Laptops' },
        ]}
        filterValue={filterCategory}
        onFilterChange={(id) => setFilterCategory(id as 'all' | 'phone' | 'laptop')}
        resultCount={filteredModels.length}
        resultLabel="modèle"
        toolbarAddon={
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-white/20 bg-black/50 text-[10px] font-bold uppercase tracking-wider text-white hover:border-xeption-gold/50 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddForm ? 'Fermer' : 'Ajouter'}
            <ChevronDown className={`w-3 h-3 transition-transform ${showAddForm ? 'rotate-180' : ''}`} />
          </button>
        }
      >
        <table className="w-full text-left">
          <thead className="sticky top-0 z-20 bg-[#0c0c0e] text-gray-400 text-[10px] uppercase font-bold">
            <tr>
              <th className="px-4 py-3 w-10" />
              <th className="px-4 py-3">Marque</th>
              <th className="px-4 py-3">Modèle</th>
              <th className="px-4 py-3 text-right">Prix grade A</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : (
              filteredModels.map((model) => (
                <tr key={model.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-4 py-2.5 text-gray-500">
                    {model.category === 'phone' ? (
                      <Smartphone className="w-4 h-4" />
                    ) : (
                      <Laptop className="w-4 h-4" />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-white/90 font-bold uppercase text-xs">{model.brand}</td>
                  <td className="px-4 py-2.5 font-medium text-white">{model.model_name}</td>
                  <td className="px-4 py-2.5 text-right">
                    <input
                      type="number"
                      className="bg-transparent text-right font-mono text-xeption-gold font-bold focus:bg-black/50 outline-none w-28 py-0.5 border-b border-transparent focus:border-xeption-gold/50"
                      defaultValue={model.base_price}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!Number.isNaN(val) && val !== model.base_price) handlePriceUpdate(model.id, val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                    />
                    <span className="text-[10px] text-white/60 ml-1">F</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(model.id)}
                      className="text-gray-600 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
};

export default ArgusTab;
