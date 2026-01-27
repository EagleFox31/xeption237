
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { TradeInModel } from '../../../types';
import { RefreshCw, Plus, Search, Trash2, Smartphone, Laptop, Save, Loader2 } from 'lucide-react';
import TableShell from '../shared/TableShell';

const ArgusTab: React.FC = () => {
    const [models, setModels] = useState<TradeInModel[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<'all' | 'phone' | 'laptop'>('all');
    
    // New Model State
    const [newModel, setNewModel] = useState({
        brand: '',
        model_name: '',
        category: 'phone' as 'phone' | 'laptop',
        base_price: ''
    });

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('trade_in_models').select('*').order('brand', { ascending: true });
        if (data) {
            // Mapping DB -> Front (supporte les deux cas)
            const mapped = data.map((m: any) => ({
                ...m,
                model_name: m.modelName || m.model_name,
                base_price: m.basePrice || m.base_price
            }));
            setModels(mapped as TradeInModel[]);
        }
        setLoading(false);
    };

    const handleAddModel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newModel.brand || !newModel.model_name || !newModel.base_price) return;

        // Essai CamelCase en premier
        const payload = {
            brand: newModel.brand,
            modelName: newModel.model_name, // CAMELCASE
            category: newModel.category,
            basePrice: parseInt(newModel.base_price) // CAMELCASE
        };

        let { data, error } = await supabase.from('trade_in_models').insert([payload]).select();

        // Fallback SnakeCase
        if (error && error.message.includes('column')) {
             const snakePayload = {
                brand: newModel.brand,
                model_name: newModel.model_name,
                category: newModel.category,
                base_price: parseInt(newModel.base_price)
            };
            const res = await supabase.from('trade_in_models').insert([snakePayload]).select();
            data = res.data;
            error = res.error;
        }

        if (data) {
            const saved = data[0];
            setModels([...models, {
                ...saved,
                model_name: saved.modelName || saved.model_name,
                base_price: saved.basePrice || saved.base_price
            } as TradeInModel]);
            setNewModel({ brand: '', model_name: '', category: 'phone', base_price: '' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Supprimer ce modèle de l'Argus ?")) return;
        const { error } = await supabase.from('trade_in_models').delete().eq('id', id);
        if (!error) setModels(models.filter(m => m.id !== id));
    };

    const handlePriceUpdate = async (id: string, newPrice: number) => {
        // Try CamelCase Update
        let { error } = await supabase.from('trade_in_models').update({ basePrice: newPrice } as any).eq('id', id);
        
        // Fallback SnakeCase
        if (error && error.message.includes('column')) {
            const res = await supabase.from('trade_in_models').update({ base_price: newPrice } as any).eq('id', id);
            error = res.error;
        }

        if (!error) {
            setModels(models.map(m => m.id === id ? { ...m, base_price: newPrice } : m));
        }
    };

    const filteredModels = models.filter(m => {
        const matchSearch = m.model_name.toLowerCase().includes(search.toLowerCase()) || m.brand.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCategory === 'all' || m.category === filterCategory;
        return matchSearch && matchCat;
    });

    return (
        <div className="animate-in fade-in h-[calc(100vh-140px)] flex flex-col gap-6">
            <div className="shrink-0 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h2 className="text-3xl font-tech font-bold uppercase text-white flex items-center gap-3">
                            <RefreshCw className="text-xeption-gold w-8 h-8" /> Gestion Argus
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Base de prix pour le simulateur de reprise. Le "Prix de Base" correspond au <strong>Grade A</strong>.
                        </p>
                    </div>
                </div>

                {/* ADD FORM */}
                <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                    <h3 className="text-white font-bold uppercase mb-4 text-xs flex items-center gap-2">
                        <Plus className="w-4 h-4 text-green-500" /> Ajouter un modèle
                    </h3>
                    <form onSubmit={handleAddModel} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Type</label>
                            <select 
                                value={newModel.category}
                                onChange={e => setNewModel({...newModel, category: e.target.value as any})}
                                className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm text-sm"
                            >
                                <option value="phone">Smartphone</option>
                                <option value="laptop">Ordinateur</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Marque</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Apple, Samsung"
                                value={newModel.brand}
                                onChange={e => setNewModel({...newModel, brand: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm text-sm"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Modèle</label>
                            <input 
                                type="text" 
                                placeholder="Ex: iPhone 15 Pro Max 256Go"
                                value={newModel.model_name}
                                onChange={e => setNewModel({...newModel, model_name: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Prix Base (Grade A)</label>
                            <input 
                                type="number" 
                                placeholder="FCFA"
                                value={newModel.base_price}
                                onChange={e => setNewModel({...newModel, base_price: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm text-sm font-mono text-xeption-gold"
                            />
                        </div>
                        <button type="submit" className="md:col-span-5 w-full bg-white/10 hover:bg-xeption-gold hover:text-black text-white font-bold uppercase py-3 rounded-sm transition-all text-xs tracking-widest mt-2">
                            Enregistrer dans l'Argus
                        </button>
                    </form>
                </div>

                {/* FILTERS & SEARCH */}
                <div className="flex justify-between items-center bg-black/40 p-4 border border-white/10 rounded-sm">
                    <div className="flex gap-2">
                        <button onClick={() => setFilterCategory('all')} className={`px-4 py-2 text-xs font-bold uppercase rounded-sm ${filterCategory === 'all' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>Tout</button>
                        <button onClick={() => setFilterCategory('phone')} className={`px-4 py-2 text-xs font-bold uppercase rounded-sm ${filterCategory === 'phone' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>Phones</button>
                        <button onClick={() => setFilterCategory('laptop')} className={`px-4 py-2 text-xs font-bold uppercase rounded-sm ${filterCategory === 'laptop' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>Laptops</button>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                        <input 
                            type="text" 
                            placeholder="Rechercher..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-black/50 border border-white/10 text-white pl-9 pr-4 py-2 rounded-sm text-sm focus:border-xeption-gold outline-none w-64"
                        />
                    </div>
                </div>
            </div>

            {/* LISTING */}
            <div className="flex-1 min-h-0 relative">
                <TableShell className="h-full overflow-y-auto border-t border-white/10">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 z-20 bg-[#0c0c0e] text-gray-400 text-xs uppercase font-bold shadow-md">
                            <tr>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Marque</th>
                                <th className="px-6 py-4">Modèle</th>
                                <th className="px-6 py-4 text-right">Prix Base (Grade A)</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto"/> Chargement...</td></tr>
                            ) : filteredModels.map(model => (
                                <tr key={model.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 text-gray-500">
                                        {model.category === 'phone' ? <Smartphone className="w-4 h-4"/> : <Laptop className="w-4 h-4"/>}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 font-bold uppercase">{model.brand}</td>
                                    <td className="px-6 py-4 font-bold text-white">{model.model_name}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <input 
                                                type="number" 
                                                className="bg-transparent text-right font-mono text-xeption-gold font-bold focus:bg-black/50 focus:border-b border-xeption-gold outline-none w-32 py-1"
                                                defaultValue={model.base_price}
                                                onBlur={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (val !== model.base_price) handlePriceUpdate(model.id, val);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                }}
                                            />
                                            <span className="text-xs text-gray-600">FCFA</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(model.id)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableShell>
            </div>
        </div>
    );
};

export default ArgusTab;
