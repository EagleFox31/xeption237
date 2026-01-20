
import React, { useRef, useState } from 'react';
import { Pack, Product, PackItem } from '../../../types';
import { ArrowLeft, Gift, Search, Plus, Trash2, Calendar, Image as ImageIcon, Loader2, AlertTriangle, Calculator, Upload } from 'lucide-react';
import { uploadImageToCloudinary } from '../../../services/uploadService';

interface PackEditorOverlayProps {
  pack: Pack;
  allProducts: Product[];
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<Pack>) => void;
}

const PackEditorOverlay: React.FC<PackEditorOverlayProps> = ({ pack, allProducts, onClose, onSave, onChange }) => {
  const [productSearch, setProductSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Calculs valeur réelle
  const realValue = pack.items.reduce((sum, item) => {
      const prod = allProducts.find(p => p.id === item.productId);
      return sum + (prod ? prod.price * item.quantity : 0);
  }, 0);

  const discount = realValue > 0 ? Math.round(((realValue - pack.price) / realValue) * 100) : 0;

  const handleAddItem = (product: Product) => {
      const existing = pack.items.find(i => i.productId === product.id);
      if (existing) {
          const updatedItems = pack.items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
          onChange({ items: updatedItems });
      } else {
          onChange({ items: [...pack.items, { productId: product.id, quantity: 1, product }] });
      }
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
      const newItems = [...pack.items];
      const item = newItems[index];
      item.quantity += delta;
      
      if (item.quantity <= 0) {
          newItems.splice(index, 1);
      }
      onChange({ items: newItems });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return;
      setIsUploading(true);
      try {
          const url = await uploadImageToCloudinary(e.target.files[0]);
          onChange({ image: url });
      } finally { setIsUploading(false); }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-5 duration-300 w-full pb-20">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 sticky top-0 bg-[#09090b]/90 backdrop-blur-md z-40 pt-2">
            <div>
                <button onClick={onClose} className="flex items-center gap-2 text-gray-500 hover:text-xeption-gold text-xs font-bold uppercase tracking-widest mb-2">
                    <ArrowLeft className="w-4 h-4" /> Annuler
                </button>
                <h2 className="text-3xl font-tech font-bold text-white uppercase tracking-tight flex items-center gap-3">
                    <Gift className="w-8 h-8 text-xeption-gold" /> {pack.id.startsWith('new') ? 'Créer un Pack' : 'Éditer Pack'}
                </h2>
            </div>
            <button 
                type="button"
                onClick={onSave} 
                className="bg-xeption-gold text-black px-8 py-3 font-tech font-bold uppercase text-sm tracking-wider rounded-sm hover:bg-white transition-all shadow-lg"
            >
                Enregistrer le Pack
            </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE : CONFIG PACK */}
            <div className="space-y-6">
                <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                    <h3 className="text-white font-bold uppercase mb-4 text-sm">Informations Générales</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Nom du Pack</label>
                            <input 
                                className="w-full bg-black/40 border border-white/10 p-3 text-white focus:border-xeption-gold outline-none rounded-sm"
                                placeholder="Ex: Pack Gamer Ultimate"
                                value={pack.name}
                                onChange={e => onChange({ name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Description</label>
                            <textarea 
                                className="w-full bg-black/40 border border-white/10 p-3 text-white focus:border-xeption-gold outline-none rounded-sm h-24 resize-none"
                                placeholder="Ce pack contient..."
                                value={pack.description}
                                onChange={e => onChange({ description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block flex items-center gap-2"><Calendar className="w-3 h-3"/> Date Validité (Optionnel)</label>
                            <input 
                                type="date"
                                className="w-full bg-black/40 border border-white/10 p-3 text-white focus:border-xeption-gold outline-none rounded-sm"
                                value={pack.validUntil || ''}
                                onChange={e => onChange({ validUntil: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                    <h3 className="text-white font-bold uppercase mb-4 text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Visuel du Pack</h3>
                    <div className="aspect-video bg-black border border-white/10 flex items-center justify-center relative overflow-hidden rounded-sm group">
                        {pack.image ? (
                            <img src={pack.image} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-gray-600 text-xs text-center px-4">
                                Uploadez une image composite ou générez-la par IA (bientôt)
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => imageInputRef.current?.click()} className="bg-white text-black px-4 py-2 text-xs font-bold uppercase rounded-sm flex items-center gap-2">
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>} Changer
                            </button>
                        </div>
                        <input type="file" ref={imageInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" />
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                    <h3 className="text-white font-bold uppercase mb-4 text-sm flex items-center gap-2"><Calculator className="w-4 h-4 text-green-500"/> Prix & Réduction</h3>
                    
                    <div className="flex justify-between items-center mb-4 bg-white/5 p-3 rounded-sm">
                        <span className="text-gray-400 text-xs uppercase font-bold">Valeur Réelle</span>
                        <span className="text-white font-mono line-through decoration-red-500">{realValue.toLocaleString()} FCFA</span>
                    </div>

                    <div>
                        <label className="text-[10px] uppercase font-bold text-xeption-gold mb-1 block">Prix du Pack (Promo)</label>
                        <input 
                            type="number"
                            className="w-full bg-black/40 border border-xeption-gold/50 p-4 text-2xl font-mono text-white focus:border-xeption-gold outline-none rounded-sm"
                            value={pack.price}
                            onChange={e => onChange({ price: +e.target.value })}
                        />
                    </div>

                    {realValue > 0 && pack.price > 0 && (
                        <div className="mt-4 flex items-center justify-between text-xs">
                            <span className="text-gray-400">Économie Client</span>
                            <span className="text-green-500 font-bold font-mono">-{discount}% ({(realValue - pack.price).toLocaleString()} FCFA)</span>
                        </div>
                    )}
                </div>
            </div>

            {/* COLONNE DROITE : COMPOSITION */}
            <div className="xl:col-span-2 space-y-6">
                <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm h-full flex flex-col">
                    <h3 className="text-white font-bold uppercase mb-6 text-sm">Composition du Pack ({pack.items.length} articles)</h3>
                    
                    {/* LISTE ITEMS SÉLECTIONNÉS */}
                    <div className="flex-1 overflow-y-auto mb-6 bg-black/20 rounded-sm border border-white/5 p-2 space-y-2 min-h-[200px] max-h-[400px]">
                        {pack.items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                                <Gift className="w-12 h-12 mb-2" />
                                <span className="text-xs uppercase font-bold">Aucun produit ajouté</span>
                            </div>
                        ) : (
                            pack.items.map((item, idx) => {
                                const prod = allProducts.find(p => p.id === item.productId);
                                if (!prod) return null;
                                return (
                                    <div key={idx} className="flex items-center justify-between bg-black/40 p-3 rounded-sm border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <img src={prod.image} className="w-10 h-10 object-cover rounded bg-white/5" />
                                            <div>
                                                <div className="text-white text-xs font-bold">{prod.name}</div>
                                                <div className="text-[10px] text-gray-500">{prod.price.toLocaleString()} FCFA /u</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center bg-black border border-white/10 rounded">
                                                <button onClick={() => handleUpdateQuantity(idx, -1)} className="px-2 py-1 text-white hover:text-red-500">-</button>
                                                <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                                                <button onClick={() => handleUpdateQuantity(idx, 1)} className="px-2 py-1 text-white hover:text-green-500">+</button>
                                            </div>
                                            <div className="text-right w-24">
                                                <span className="block text-white font-bold font-mono text-xs">{(prod.price * item.quantity).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* SELECTEUR PRODUIT */}
                    <div className="border-t border-white/10 pt-6">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Ajouter un produit</h4>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="text"
                                placeholder="Rechercher dans le stock..."
                                className="w-full bg-black/50 border border-white/10 pl-10 p-3 text-sm text-white rounded-sm outline-none focus:border-xeption-gold"
                                value={productSearch}
                                onChange={e => setProductSearch(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-2">
                            {allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 12).map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => handleAddItem(p)}
                                    className="bg-white/5 hover:bg-xeption-gold hover:text-black border border-white/10 p-2 rounded-sm text-left group transition-all"
                                >
                                    <div className="text-[10px] font-bold truncate mb-1">{p.name}</div>
                                    <div className="text-[10px] opacity-60 group-hover:opacity-100">{p.price.toLocaleString()} FCFA</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default PackEditorOverlay;
