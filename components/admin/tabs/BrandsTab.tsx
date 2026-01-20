
import React from 'react';
import { Plus, Trash2, Tag, Layers, ChevronRight } from 'lucide-react';
import { Brand, ProductRange } from '../../../types';

interface BrandsTabProps {
  brands: Brand[];
  ranges: ProductRange[];
  brandMgr: any; // On passe le hook manager
}

const BrandsTab: React.FC<BrandsTabProps> = ({ brands, ranges, brandMgr }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-5">
        <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Gestion Marques & Gammes</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLONNE GAUCHE : MARQUES */}
            <div className="space-y-6">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                    <h3 className="text-white font-bold uppercase mb-4 text-sm flex items-center gap-2">
                        <Tag className="w-4 h-4 text-xeption-gold"/> Créer Marque
                    </h3>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={brandMgr.newBrandName} 
                            onChange={(e: any) => brandMgr.setNewBrandName(e.target.value)} 
                            placeholder="Ex: Samsung, Apple" 
                            className="flex-1 bg-black/50 border border-white/10 p-3 text-white rounded-sm text-sm"
                        />
                        <button 
                            onClick={brandMgr.addBrand}
                            className="bg-xeption-gold text-black font-bold uppercase px-4 rounded-sm text-xs tracking-widest hover:bg-white transition-all"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden h-[500px] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold sticky top-0 bg-[#09090b]">
                            <tr><th className="px-6 py-4">Marque</th><th className="px-6 py-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {brands.map(brand => (
                                <tr 
                                    key={brand.id} 
                                    className={`hover:bg-white/5 text-sm cursor-pointer transition-colors ${brandMgr.selectedBrandForRange === brand.id ? 'bg-xeption-gold/10' : ''}`}
                                    onClick={() => brandMgr.setSelectedBrandForRange(brand.id)}
                                >
                                    <td className="px-6 py-4 font-bold text-white flex items-center justify-between">
                                        {brand.name}
                                        {brandMgr.selectedBrandForRange === brand.id && <ChevronRight className="w-4 h-4 text-xeption-gold"/>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); brandMgr.deleteBrand(brand.id); }} 
                                            className="p-2 text-red-500 hover:bg-white/10 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* COLONNE DROITE : GAMMES (Dépend de la marque sélectionnée) */}
            <div className="space-y-6">
                <div className={`bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm transition-opacity ${!brandMgr.selectedBrandForRange ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <h3 className="text-white font-bold uppercase mb-4 text-sm flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-400"/> Ajouter Gamme pour <span className="text-xeption-gold">{brands.find(b => b.id === brandMgr.selectedBrandForRange)?.name || '...'}</span>
                    </h3>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={brandMgr.newRangeName} 
                            onChange={(e: any) => brandMgr.setNewRangeName(e.target.value)} 
                            placeholder="Ex: Galaxy S, iPhone Pro" 
                            className="flex-1 bg-black/50 border border-white/10 p-3 text-white rounded-sm text-sm"
                        />
                        <button 
                            onClick={brandMgr.addRange}
                            className="bg-blue-500 text-white font-bold uppercase px-4 rounded-sm text-xs tracking-widest hover:bg-blue-400 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden h-[500px] overflow-y-auto">
                    {!brandMgr.selectedBrandForRange ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                            <Tag className="w-12 h-12 mb-4 opacity-20"/>
                            <p>Sélectionnez une marque à gauche pour gérer ses gammes.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold sticky top-0 bg-[#09090b]">
                                <tr><th className="px-6 py-4">Gamme / Série</th><th className="px-6 py-4 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {ranges.filter(r => r.brand_id === brandMgr.selectedBrandForRange).length === 0 ? (
                                    <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-500 text-xs italic">Aucune gamme définie pour cette marque.</td></tr>
                                ) : (
                                    ranges.filter(r => r.brand_id === brandMgr.selectedBrandForRange).map(range => (
                                        <tr key={range.id} className="hover:bg-white/5 text-sm">
                                            <td className="px-6 py-4 font-bold text-gray-200">{range.name}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => brandMgr.deleteRange(range.id)} className="p-2 text-red-500 hover:bg-white/10 rounded">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};

export default BrandsTab;
