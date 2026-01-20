
import React from 'react';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
import { Product } from '../../../types';
import TableShell from '../shared/TableShell';

interface InventoryTabProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onCreateProduct: () => void;
  onToggleFeatured: (product: Product) => void; // Nouvelle prop
}

const InventoryTab: React.FC<InventoryTabProps> = ({ products, onEditProduct, onDeleteProduct, onCreateProduct, onToggleFeatured }) => {
  return (
    <div className="animate-in fade-in h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-3xl font-tech font-bold uppercase text-white">Inventaire</h2>
            <button onClick={onCreateProduct} className="bg-xeption-gold text-black px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white rounded-sm">
                <Plus className="w-4 h-4" /> Nouveau
            </button>
        </div>
        
        <div className="flex-1 min-h-0 relative">
            <TableShell className="h-full overflow-y-auto border-t border-white/10">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="sticky top-0 z-20 bg-[#0c0c0e] text-gray-400 text-xs uppercase font-bold tracking-wider shadow-lg">
                        <tr>
                            <th className="px-6 py-4">Produit</th>
                            <th className="px-6 py-4">Prix</th>
                            <th className="px-6 py-4">Stock</th>
                            <th className="px-6 py-4 text-center">À la Une</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                        {products.map(product => (
                            <tr key={product.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-4">
                                    <div className="w-10 h-10 shrink-0 bg-black rounded p-1 border border-white/10">
                                        <img src={product.image} className="w-full h-full object-contain" alt={product.name}/>
                                    </div>
                                    <div><span className="font-bold text-white block line-clamp-1">{product.name}</span><span className="text-xs text-gray-500 capitalize">{product.category}</span></div>
                                </td>
                                <td className="px-6 py-4 font-mono text-white">{product.price.toLocaleString()}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${product.stock > 5 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>{product.stock}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => onToggleFeatured(product)}
                                        className={`p-2 rounded transition-all hover:bg-white/10 ${product.isFeatured ? 'text-xeption-gold' : 'text-gray-600 hover:text-gray-400'}`}
                                        title={product.isFeatured ? "Retirer des Pépites" : "Ajouter aux Pépites (Accueil)"}
                                    >
                                        <Star className={`w-4 h-4 ${product.isFeatured ? 'fill-xeption-gold' : ''}`} />
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onEditProduct(product)} className="p-2 text-xeption-gold hover:bg-white/10 rounded mr-2"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => onDeleteProduct(product.id)} className="p-2 text-red-500 hover:bg-white/10 rounded"><Trash2 className="w-4 h-4" /></button>
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

export default InventoryTab;
