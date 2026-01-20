
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { DeliveryZone } from '../../../types';
import { Truck, Plus, Trash2, MapPin, Save, Loader2 } from 'lucide-react';
import TableShell from '../shared/TableShell';

const DeliveryTab: React.FC = () => {
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [loading, setLoading] = useState(false);
    
    // State pour création
    const [newZone, setNewZone] = useState<Partial<DeliveryZone>>({
        name: '',
        delay: '',
        price: 0,
        type: 'standard',
        active: true
    });

    useEffect(() => {
        fetchZones();
    }, []);

    const fetchZones = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('delivery_zones').select('*').order('price', { ascending: true });
        if (data) setZones(data as DeliveryZone[]);
        setLoading(false);
    };

    const handleAddZone = async () => {
        if (!newZone.name || !newZone.delay) return;
        const { data, error } = await supabase.from('delivery_zones').insert([newZone]).select();
        if (data) {
            setZones([...zones, data[0] as DeliveryZone]);
            setNewZone({ name: '', delay: '', price: 0, type: 'standard', active: true });
        }
    };

    const handleUpdateZone = async (id: string, updates: Partial<DeliveryZone>) => {
        // Optimistic UI update
        setZones(zones.map(z => z.id === id ? { ...z, ...updates } : z));
        
        // DB update (debounce could be better, but direct update for admin is fine)
        await supabase.from('delivery_zones').update(updates).eq('id', id);
    };

    const handleDeleteZone = async (id: string) => {
        if (!window.confirm("Supprimer cette zone de livraison ?")) return;
        const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
        if (!error) setZones(zones.filter(z => z.id !== id));
    };

    return (
        <div className="animate-in fade-in space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-tech font-bold uppercase text-white flex items-center gap-3">
                        <Truck className="text-xeption-gold w-8 h-8" /> Zones de Livraison
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Configurez les villes, délais et tarifs qui apparaissent dans l'estimateur client.
                    </p>
                </div>
            </div>

            {/* ADD FORM */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <h3 className="text-white font-bold uppercase mb-4 text-xs flex items-center gap-2">
                    <Plus className="w-4 h-4 text-green-500" /> Ajouter une destination
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Ville / Zone</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Ebolowa"
                            value={newZone.name}
                            onChange={e => setNewZone({...newZone, name: e.target.value})}
                            className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Délai estimé</label>
                        <input 
                            type="text" 
                            placeholder="Ex: 48h"
                            value={newZone.delay}
                            onChange={e => setNewZone({...newZone, delay: e.target.value})}
                            className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Prix (FCFA)</label>
                        <input 
                            type="number" 
                            placeholder="0"
                            value={newZone.price}
                            onChange={e => setNewZone({...newZone, price: parseInt(e.target.value) || 0})}
                            className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-sm text-sm font-mono text-xeption-gold"
                        />
                    </div>
                    <button 
                        onClick={handleAddZone}
                        className="w-full bg-white/10 hover:bg-xeption-gold hover:text-black text-white font-bold uppercase py-3 rounded-sm transition-all text-xs tracking-widest mt-2"
                    >
                        Ajouter
                    </button>
                </div>
            </div>

            {/* LISTING */}
            <TableShell>
                <table className="w-full text-left">
                    <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold">
                        <tr>
                            <th className="px-6 py-4">Destination</th>
                            <th className="px-6 py-4">Délai</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4 text-right">Tarif</th>
                            <th className="px-6 py-4 text-center">Actif</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto"/> Chargement...</td></tr>
                        ) : zones.map(zone => (
                            <tr key={zone.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <input 
                                        value={zone.name} 
                                        onChange={(e) => handleUpdateZone(zone.id, { name: e.target.value })}
                                        className="bg-transparent border-b border-transparent focus:border-white/30 outline-none w-full font-bold text-white"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input 
                                        value={zone.delay} 
                                        onChange={(e) => handleUpdateZone(zone.id, { delay: e.target.value })}
                                        className="bg-transparent border-b border-transparent focus:border-white/30 outline-none w-full text-gray-400"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <select 
                                        value={zone.type}
                                        onChange={(e) => handleUpdateZone(zone.id, { type: e.target.value as any })}
                                        className="bg-black/20 border border-white/10 rounded text-xs px-2 py-1 outline-none"
                                    >
                                        <option value="standard">Standard</option>
                                        <option value="express">Express</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={zone.price}
                                            onChange={(e) => handleUpdateZone(zone.id, { price: parseInt(e.target.value) || 0 })}
                                            className="bg-transparent text-right font-mono text-xeption-gold font-bold focus:bg-black/50 focus:border-b border-xeption-gold outline-none w-24 py-1"
                                        />
                                        <span className="text-xs text-gray-600">FCFA</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={zone.active}
                                        onChange={(e) => handleUpdateZone(zone.id, { active: e.target.checked })}
                                        className="accent-xeption-gold w-4 h-4 cursor-pointer"
                                    />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleDeleteZone(zone.id)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
        </div>
    );
};

export default DeliveryTab;
