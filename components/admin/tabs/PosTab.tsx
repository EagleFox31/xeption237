
import React from 'react';
import { Box } from 'lucide-react';
import { Product, CartItem } from '../../../types';

interface PosTabProps {
  products: Product[];
  posCart: CartItem[];
  posSearch: string;
  setPosSearch: (val: string) => void;
  posCustomer: { name: string; phone: string; email: string };
  setPosCustomer: (val: { name: string; phone: string; email: string }) => void;
  addToPosCart: (product: Product) => void;
  onPosSubmit: () => void;
}

const PosTab: React.FC<PosTabProps> = ({ 
    products, posCart, posSearch, setPosSearch, 
    posCustomer, setPosCustomer, addToPosCart, onPosSubmit 
}) => {
  return (
    <div className="animate-in fade-in h-[calc(100vh-100px)] grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-sm shadow-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
                <h3 className="text-white font-bold uppercase text-sm flex items-center gap-2"><Box className="w-4 h-4 text-blue-400" /> Catalogue</h3>
                <input type="text" value={posSearch} onChange={(e) => setPosSearch(e.target.value)} placeholder="Chercher..." className="bg-black/50 border border-white/10 px-3 py-1 text-sm text-white rounded-sm w-48" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
                {products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())).map(p => (
                    <button key={p.id} onClick={() => addToPosCart(p)} disabled={p.stock<=0} className="bg-black/40 border border-white/5 p-3 rounded-sm hover:border-xeption-gold/50 text-left flex flex-col h-full">
                    <div className="aspect-square bg-black rounded-sm mb-2 relative overflow-hidden"><img src={p.image} className="w-full h-full object-cover" alt={p.name}/>{p.stock<=0 && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs text-red-500 font-bold">Rupture</div>}</div>
                    <h4 className="text-xs font-bold text-gray-200 line-clamp-1">{p.name}</h4>
                    <span className="text-[10px] text-gray-500">Stock: {p.stock}</span>
                    </button>
                ))}
            </div>
        </div>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm shadow-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-black/40"><h3 className="text-white font-bold uppercase text-sm">Panier</h3></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {posCart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-black/40 p-2 rounded-sm border border-white/5">
                        <div className="flex-1"><div className="text-xs font-bold text-white line-clamp-1">{item.name}</div><div className="text-[10px] text-gray-500">{item.price.toLocaleString()} x {item.quantity}</div></div>
                    </div>
                ))}
        </div>
        <div className="p-4 bg-black/20 border-t border-white/10 space-y-3">
            <input type="text" placeholder="Client" className="w-full bg-black/50 border border-white/10 px-3 py-2 text-xs text-white rounded-sm" value={posCustomer.name} onChange={e => setPosCustomer({...posCustomer, name: e.target.value})} />
            <div className="flex justify-between items-end"><span className="text-gray-400 text-xs font-bold uppercase">Total</span><span className="text-xl font-bold font-mono text-white">{posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} <span className="text-xs text-xeption-gold">FCFA</span></span></div>
            <button onClick={onPosSubmit} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold uppercase py-3 rounded-sm">Valider</button>
        </div>
        </div>
    </div>
  );
};

export default PosTab;
