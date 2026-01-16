
import React from 'react';
import { TrendingUp, Package, Users, AlertCircle, ShoppingBag } from 'lucide-react';
import { Order, Staff, Customer, Product } from '../../../types';
import StatCard from '../shared/StatCard';

interface DashboardTabProps {
  orders: Order[];
  staffMembers: Staff[];
  customers: Customer[];
  products: Product[];
}

const DashboardTab: React.FC<DashboardTabProps> = ({ orders, staffMembers, customers, products }) => {
  const revenue = orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.total, 0).toLocaleString();
  const pending = orders.filter(o => o.status === 'pending').length.toString();
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5">
        <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Tableau de bord</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard label="Revenu Total" value={revenue} sub="FCFA" icon={TrendingUp} color="text-green-500" />
            <StatCard label="Commandes" value={pending} sub="En attente" icon={Package} color="text-xeption-gold" />
            <StatCard label="Staff Actif" value={staffMembers.length.toString()} sub="Membres" icon={Users} color="text-blue-500" />
            <StatCard label="Base Clients" value={customers.length.toString()} sub="Enregistrés" icon={Users} color="text-purple-500" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Alertes Stock */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm shadow-xl">
                <h3 className="text-white font-tech uppercase font-bold mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-xeption-red" /> Alertes Rupture
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {products.filter(p => p.stock < 5).length === 0 ? (
                        <p className="text-gray-500 italic text-sm">Stock optimal.</p>
                    ) : (
                        products.filter(p => p.stock < 5).map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-white/5 p-3 rounded hover:bg-black/60 transition-colors border border-white/5">
                                <span className="text-gray-200 text-sm font-bold truncate pr-2">{p.name}</span>
                                <span className="text-xeption-red font-bold text-xs px-2 py-1 bg-xeption-red/10 rounded whitespace-nowrap">Reste: {p.stock}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Dernières Ventes */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm shadow-xl">
                <h3 className="text-white font-tech uppercase font-bold mb-4 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-xeption-gold" /> Dernières Ventes
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                     {orders.slice(0,5).map((o) => (
                        <div key={o.id} className="flex items-center justify-between bg-white/5 p-3 rounded hover:bg-black/60 transition-colors border border-white/5">
                            <div className="flex-1 min-w-0">
                                <span className="text-gray-200 text-sm block font-bold truncate">{o.customerName}</span>
                                <span className={`text-[10px] font-bold uppercase ${o.status === 'delivered' ? 'text-green-500' : 'text-gray-500'}`}>{o.status}</span>
                            </div>
                            <span className="text-white font-mono text-sm ml-4">{o.total.toLocaleString()} FCFA</span>
                        </div>
                     ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default DashboardTab;
