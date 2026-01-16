
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Category } from '../../../types';

interface CategoriesTabProps {
  categories: Category[];
  newCatName: string;
  setNewCatName: (name: string) => void;
  onAddCategory: () => void;
  onDeleteCategory: (id: string) => void;
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({ categories, newCatName, setNewCatName, onAddCategory, onDeleteCategory }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-5">
        <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Gestion des Types (Types de Produits)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <h3 className="text-white font-bold uppercase mb-4 text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-xeption-gold"/> Nouveau Type</h3>
                <input 
                    type="text" 
                    value={newCatName} 
                    onChange={e => setNewCatName(e.target.value)} 
                    placeholder="Ex: Gaming Laptops" 
                    className="w-full bg-black/50 border border-white/10 p-3 text-white rounded-sm mb-4"
                />
                <button 
                    onClick={onAddCategory}
                    className="w-full bg-xeption-gold text-black font-bold uppercase py-3 rounded-sm text-xs tracking-widest hover:bg-white transition-all"
                >
                    Ajouter au Catalogue
                </button>
            </div>

            <div className="md:col-span-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold">
                        <tr><th className="px-6 py-4">Nom</th><th className="px-6 py-4">Slug</th><th className="px-6 py-4 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {categories.map(cat => (
                            <tr key={cat.id} className="hover:bg-white/5 text-sm">
                                <td className="px-6 py-4 font-bold text-white">{cat.name}</td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{cat.slug}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onDeleteCategory(cat.id)} className="p-2 text-red-500 hover:bg-white/10 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default CategoriesTab;
