
import React from 'react';
import { Pack, Product } from '../../../types';
import { Plus, Edit, Trash2, Calendar, Package } from 'lucide-react';

interface PacksTabProps {
  packs: Pack[];
  products: Product[];
  onCreatePack: () => void;
  onEditPack: (pack: Pack) => void;
  onDeletePack: (id: string) => void;
  getHydratedItems: (items: any) => any[];
}

const PacksTab: React.FC<PacksTabProps> = ({ packs, products, onCreatePack, onEditPack, onDeletePack, getHydratedItems }) => {
  return (
    <div className="animate-in fade-in">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-3xl font-tech font-bold uppercase text-white">Gestion des Packs</h2>
                <p className="text-gray-400 text-sm mt-1">Créez des bundles pour augmenter le panier moyen.</p>
            </div>
            <button onClick={onCreatePack} className="bg-xeption-gold text-black px-6 py-3 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white rounded-sm shadow-lg transition-all">
                <Plus className="w-4 h-4" /> Nouveau Pack
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {packs.length === 0 ? (
                <div className="col-span-full text-center py-20 bg-black/20 border border-white/10 rounded-sm">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Aucun pack actif. Créez-en un pour booster les ventes !</p>
                </div>
            ) : (
                packs.map(pack => {
                    const items = getHydratedItems(pack.items);
                    const realValue = items.reduce((sum, item) => sum + (item.product ? item.product.price * item.quantity : 0), 0);
                    const discount = realValue > 0 ? Math.round(((realValue - pack.price) / realValue) * 100) : 0;

                    return (
                        <div key={pack.id} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden group hover:border-xeption-gold/50 transition-all">
                            {/* Image Header */}
                            <div className="h-40 bg-black relative overflow-hidden">
                                {pack.image && <img src={pack.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />}
                                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg uppercase">
                                    -{discount}%
                                </div>
                                {pack.validUntil && (
                                    <div className="absolute bottom-2 left-2 bg-black/80 text-gray-300 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 border border-white/10">
                                        <Calendar className="w-3 h-3" /> Fin: {new Date(pack.validUntil).toLocaleDateString()}
                                    </div>
                                )}
                            </div>

                            <div className="p-5">
                                <h3 className="text-xl font-bold text-white font-tech uppercase mb-2 truncate">{pack.name}</h3>
                                <p className="text-xs text-gray-400 line-clamp-2 mb-4 h-8">{pack.description}</p>

                                {/* Items Preview */}
                                <div className="flex gap-2 mb-4 overflow-hidden">
                                    {items.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="relative w-8 h-8 rounded bg-white/10 border border-white/10 flex-shrink-0" title={item.product?.name}>
                                            <img src={item.product?.image} className="w-full h-full object-cover rounded" />
                                            <span className="absolute -bottom-1 -right-1 bg-black text-white text-[8px] font-bold w-3 h-3 flex items-center justify-center rounded-full border border-gray-500">{item.quantity}</span>
                                        </div>
                                    ))}
                                    {items.length > 3 && (
                                        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-[10px] text-gray-500 font-bold">
                                            +{items.length - 3}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center border-t border-white/10 pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500 line-through decoration-red-500">{realValue.toLocaleString()}</span>
                                        <span className="text-lg font-bold text-xeption-gold font-mono">{pack.price.toLocaleString()} FCFA</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => onEditPack(pack)} className="p-2 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDeletePack(pack.id)} className="p-2 hover:bg-red-500/20 rounded text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
};

export default PacksTab;
