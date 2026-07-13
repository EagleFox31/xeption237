
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { DeliveryZone } from '../../../types';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import TableShell from '../shared/TableShell';
import { adminUi } from '../shared/adminUi';
import { DB_TABLES, DB_SCHEMA } from '../../../constants/dbSchema';

const DeliveryTab: React.FC = () => {
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    
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
        const { data, error } = await supabase.from(DB_TABLES.DELIVERY_ZONES).select('*').order(DB_SCHEMA.DELIVERY_ZONES.PRICE, { ascending: true });
        if (data) {
            const mappedZones = data.map((z: any) => ({
                id: z[DB_SCHEMA.DELIVERY_ZONES.ID],
                name: z[DB_SCHEMA.DELIVERY_ZONES.NAME],
                delay: z[DB_SCHEMA.DELIVERY_ZONES.DELAY],
                price: z[DB_SCHEMA.DELIVERY_ZONES.PRICE],
                type: z[DB_SCHEMA.DELIVERY_ZONES.TYPE],
                active: z[DB_SCHEMA.DELIVERY_ZONES.ACTIVE]
            }));
            setZones(mappedZones);
        }
        setLoading(false);
    };

    const handleAddZone = async () => {
        if (!newZone.name || !newZone.delay) return;
        
        const payload = {
            [DB_SCHEMA.DELIVERY_ZONES.NAME]: newZone.name,
            [DB_SCHEMA.DELIVERY_ZONES.DELAY]: newZone.delay,
            [DB_SCHEMA.DELIVERY_ZONES.PRICE]: newZone.price,
            [DB_SCHEMA.DELIVERY_ZONES.TYPE]: newZone.type,
            [DB_SCHEMA.DELIVERY_ZONES.ACTIVE]: newZone.active
        };

        const { data, error } = await supabase.from(DB_TABLES.DELIVERY_ZONES).insert([payload]).select();
        
        if (data) {
            const created = data[0];
            setZones([...zones, {
                id: created[DB_SCHEMA.DELIVERY_ZONES.ID],
                name: created[DB_SCHEMA.DELIVERY_ZONES.NAME],
                delay: created[DB_SCHEMA.DELIVERY_ZONES.DELAY],
                price: created[DB_SCHEMA.DELIVERY_ZONES.PRICE],
                type: created[DB_SCHEMA.DELIVERY_ZONES.TYPE],
                active: created[DB_SCHEMA.DELIVERY_ZONES.ACTIVE]
            }]);
            setNewZone({ name: '', delay: '', price: 0, type: 'standard', active: true });
        }
    };

    // Modification locale uniquement (pour les inputs texte/nombre)
    const handleLocalChange = (id: string, updates: Partial<DeliveryZone>) => {
        setZones(zones.map(z => z.id === id ? { ...z, ...updates } : z));
    };

    // Sauvegarde en base de données (déclenchée par le bouton)
    const handleSaveZone = async (zone: DeliveryZone) => {
        setSavingId(zone.id);
        const payload = {
            [DB_SCHEMA.DELIVERY_ZONES.NAME]: zone.name,
            [DB_SCHEMA.DELIVERY_ZONES.DELAY]: zone.delay,
            [DB_SCHEMA.DELIVERY_ZONES.PRICE]: zone.price,
            [DB_SCHEMA.DELIVERY_ZONES.TYPE]: zone.type,
            [DB_SCHEMA.DELIVERY_ZONES.ACTIVE]: zone.active
        };

        const { error } = await supabase.from(DB_TABLES.DELIVERY_ZONES).update(payload).eq(DB_SCHEMA.DELIVERY_ZONES.ID, zone.id);
        
        setTimeout(() => setSavingId(null), 500);
        
        if (error) {
            alert("Erreur lors de la sauvegarde.");
        }
    };

    const handleToggleActive = async (zone: DeliveryZone) => {
        const newValue = !zone.active;
        handleLocalChange(zone.id, { active: newValue }); 
        await supabase.from(DB_TABLES.DELIVERY_ZONES)
            .update({ [DB_SCHEMA.DELIVERY_ZONES.ACTIVE]: newValue })
            .eq(DB_SCHEMA.DELIVERY_ZONES.ID, zone.id);
    };

    const handleDeleteZone = async (id: string) => {
        if (!window.confirm("Supprimer cette zone de livraison ?")) return;
        const { error } = await supabase.from(DB_TABLES.DELIVERY_ZONES).delete().eq(DB_SCHEMA.DELIVERY_ZONES.ID, id);
        if (!error) setZones(zones.filter(z => z.id !== id));
    };

    return (
        <div className="animate-in fade-in h-[calc(100vh-140px)] flex flex-col gap-6">
            <div className="shrink-0 space-y-6">
                <div className={`${adminUi.card} p-5 md:p-6`}>
                    <h3 className={`${adminUi.cardTitle} mb-4`}>
                        <Plus className="w-4 h-4 text-emerald-400" /> Ajouter une destination
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-2">
                            <label className={`${adminUi.label} block mb-1.5`}>Ville / Zone</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Ebolowa"
                                value={newZone.name}
                                onChange={e => setNewZone({...newZone, name: e.target.value})}
                                className={adminUi.input}
                            />
                        </div>
                        <div>
                            <label className={`${adminUi.label} block mb-1.5`}>Délai estimé</label>
                            <input 
                                type="text" 
                                placeholder="Ex: 48h"
                                value={newZone.delay}
                                onChange={e => setNewZone({...newZone, delay: e.target.value})}
                                className={adminUi.input}
                            />
                        </div>
                        <div>
                            <label className={`${adminUi.label} block mb-1.5`}>Prix (FCFA)</label>
                            <input 
                                type="number" 
                                placeholder="0"
                                value={newZone.price}
                                onChange={e => setNewZone({...newZone, price: parseInt(e.target.value) || 0})}
                                className={`${adminUi.input} font-mono text-xeption-gold`}
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={handleAddZone}
                            className={`${adminUi.btnGhost} w-full mt-2`}
                        >
                            Ajouter
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 relative">
                <TableShell className="h-full overflow-y-auto border-t border-white/10">
                    <table className="w-full text-left">
                        <thead className={adminUi.tableHead}>
                            <tr>
                                <th className="px-6 py-4">Destination</th>
                                <th className="px-6 py-4">Délai</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4 text-right">Tarif</th>
                                <th className="px-6 py-4 text-center">Actif</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={adminUi.tableBody}>
                            {loading ? (
                                <tr><td colSpan={6} className={adminUi.emptyCell}><Loader2 className="w-6 h-6 animate-spin mx-auto"/> Chargement…</td></tr>
                            ) : zones.map(zone => (
                                <tr key={zone.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <input 
                                            value={zone.name} 
                                            onChange={(e) => handleLocalChange(zone.id, { name: e.target.value })}
                                            className="bg-transparent border-b border-transparent focus:border-white/30 outline-none w-full font-bold text-white transition-colors"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input 
                                            value={zone.delay} 
                                            onChange={(e) => handleLocalChange(zone.id, { delay: e.target.value })}
                                            className="bg-transparent border-b border-transparent focus:border-white/30 outline-none w-full text-white/70 transition-colors"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <select 
                                            value={zone.type}
                                            onChange={(e) => handleLocalChange(zone.id, { type: e.target.value as any })}
                                            className="bg-black/20 border border-white/10 rounded text-xs px-2 py-1 outline-none text-gray-300"
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
                                                onChange={(e) => handleLocalChange(zone.id, { price: parseInt(e.target.value) || 0 })}
                                                className="bg-transparent text-right font-mono text-xeption-gold font-bold focus:bg-black/50 focus:border-b border-xeption-gold outline-none w-24 py-1 transition-colors"
                                            />
                                            <span className="text-xs text-gray-600">FCFA</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={zone.active}
                                            onChange={() => handleToggleActive(zone)}
                                            className="accent-xeption-gold w-4 h-4 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleSaveZone(zone)}
                                                className={`p-2 rounded transition-all ${
                                                    savingId === zone.id 
                                                    ? 'text-green-500 bg-green-500/10' 
                                                    : 'text-xeption-gold hover:bg-xeption-gold/10 hover:scale-110'
                                                }`}
                                                title="Enregistrer"
                                            >
                                                {savingId === zone.id ? <Plus className="w-4 h-4 rotate-45" /> : <Save className="w-4 h-4" />}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteZone(zone.id)} 
                                                className="text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all p-2 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
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

export default DeliveryTab;
