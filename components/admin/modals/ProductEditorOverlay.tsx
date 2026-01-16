
import React, { useRef } from 'react';
import { Product, Category } from '../../../types';
import { Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { uploadImageToCloudinary } from '../../../services/uploadService';
import { generateProductDetails } from '../../../services/geminiService';

interface ProductEditorOverlayProps {
  product: Product;
  categories: Category[];
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (updates: Partial<Product>) => void;
}

const ProductEditorOverlay: React.FC<ProductEditorOverlayProps> = ({ product, categories, onClose, onSave, onChange }) => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const mainImageInputRef = useRef<HTMLInputElement>(null);

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      setUploadingImage(true);
      try {
          const url = await uploadImageToCloudinary(e.target.files[0]);
          onChange({ image: url });
      } finally { setUploadingImage(false); }
  };

  const handleAiGeneration = async () => {
      if (!product.name) return;
      setIsGenerating(true);
      try {
          const details = await generateProductDetails(product.name, product.category);
          // Fusion intelligente des données générées
          onChange({
             ...details,
             pros: details.pros || [],
             cons: details.cons || [],
             specs: details.specs || []
          });
      } finally { setIsGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl overflow-y-auto animate-in slide-in-from-bottom-10">
        <div className="max-w-7xl mx-auto p-6 pb-20">
             <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 sticky top-0 bg-transparent z-10 pt-4">
                 <h2 className="text-2xl font-bold font-tech text-white uppercase">{product.id.startsWith('new') ? 'Création' : 'Édition'}</h2>
                 <div className="flex gap-4">
                     <button onClick={onClose} className="text-gray-400 font-bold text-sm uppercase">Annuler</button>
                     <button onClick={onSave} className="bg-white text-black px-6 py-2 font-bold uppercase text-sm rounded-sm">Sauvegarder</button>
                 </div>
             </div>
             <form className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                     <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                         <h3 className="text-white font-bold uppercase mb-4 text-sm">Base</h3>
                         <input className="w-full bg-black border border-white/10 p-3 mb-3 text-white" placeholder="Nom" value={product.name} onChange={e => onChange({ name: e.target.value })} />
                         <div className="grid grid-cols-2 gap-3 mb-3">
                             <input type="number" className="bg-black border border-white/10 p-3 text-white" placeholder="Prix" value={product.price} onChange={e => onChange({ price: +e.target.value })} />
                             <input type="number" className="bg-black border border-white/10 p-3 text-white" placeholder="Stock" value={product.stock} onChange={e => onChange({ stock: +e.target.value })} />
                         </div>
                         <div className="mb-3">
                             <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Type (Catégorie)</label>
                             <select 
                                className="w-full bg-black border border-white/10 p-3 text-white rounded-sm"
                                value={product.category}
                                onChange={e => onChange({ category: e.target.value })}
                             >
                                 <option value="">Sélectionner un type</option>
                                 {categories.map(c => (
                                     <option key={c.id} value={c.slug}>{c.name}</option>
                                 ))}
                             </select>
                         </div>
                         <button type="button" onClick={handleAiGeneration} disabled={isGenerating} className="text-xs text-xeption-gold border border-xeption-gold/30 px-3 py-2 rounded uppercase font-bold flex items-center gap-2">
                             {isGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} Auto-Fill IA
                         </button>
                     </div>
                     <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                        <h3 className="text-white font-bold uppercase mb-4 text-sm">Media</h3>
                        <div className="aspect-video bg-black mb-3 flex items-center justify-center border border-white/10 relative">
                            {product.image ? <img src={product.image} className="max-h-full" alt="Preview"/> : <ImageIcon className="text-gray-700"/>}
                            {uploadingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-8 h-8 text-xeption-gold animate-spin"/></div>}
                        </div>
                        <input type="file" ref={mainImageInputRef} className="hidden" onChange={handleMainImageUpload} />
                        <button type="button" onClick={() => mainImageInputRef.current?.click()} className="w-full border border-white/10 py-2 text-xs font-bold uppercase text-gray-400 hover:text-white">Uploader Image</button>
                     </div>
                 </div>
                 <div className="space-y-4">
                     <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                         <h3 className="text-white font-bold uppercase mb-4 text-sm">Marketing</h3>
                         <textarea className="w-full bg-black border border-white/10 p-3 h-32 text-white text-sm" placeholder="Description" value={product.description} onChange={e => onChange({ description: e.target.value })} />
                     </div>
                 </div>
             </form>
        </div>
    </div>
  );
};

export default ProductEditorOverlay;
