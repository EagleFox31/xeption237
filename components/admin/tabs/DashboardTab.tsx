
import React from 'react';
import { TrendingUp, Package, Users, AlertCircle, ShoppingBag } from 'lucide-react';
import { Order, Staff, Customer, Product } from '../../../types';
import { getProductDisplayName } from '../../../utils/productDisplay';
import { getOrderStatusLabel } from '../../../utils/orderWorkflow';
import StatCard from '../shared/StatCard';
import { adminUi } from '../shared/adminUi';

interface DashboardTabProps {
  orders: Order[];
  staffMembers: Staff[];
  customers: Customer[];
  products: Product[];
}

const DashboardTab: React.FC<DashboardTabProps> = ({ orders, staffMembers, customers, products }) => {
  const revenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((acc, o) => acc + o.total, 0)
    .toLocaleString('fr-FR');
  const pending = orders.filter((o) => o.status === 'pending').length.toString();
  const lowStock = products.filter((p) => p.stock < 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Revenu livré" value={revenue} sub="FCFA" icon={TrendingUp} tone="green" />
            <StatCard label="Commandes en attente" value={pending} sub="À traiter" icon={Package} tone="gold" />
            <StatCard label="Équipe active" value={staffMembers.length.toString()} sub="Membres staff" icon={Users} tone="cyan" />
            <StatCard label="Clients enregistrés" value={customers.length.toString()} sub="CRM" icon={Users} tone="neutral" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className={adminUi.card}>
                <h3 className={`${adminUi.cardTitle} mb-4`}>
                    <AlertCircle className="w-4 h-4 text-xeption-red" /> Alertes rupture
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {lowStock.length === 0 ? (
                        <p className={adminUi.muted}>Stock confortable sur l’ensemble du catalogue.</p>
                    ) : (
                        lowStock.map((p) => (
                            <div key={p.id} className={`flex justify-between items-center gap-3 p-3 rounded-md border border-white/10 bg-black/20 backdrop-blur-sm ${adminUi.surfaceHover}`}>
                                <span className="text-white text-sm font-medium truncate">{getProductDisplayName(p)}</span>
                                <span className="text-xeption-red font-bold text-[10px] uppercase tracking-wider px-2 py-1 bg-xeption-red/10 rounded shrink-0">
                                  Reste {p.stock}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className={adminUi.card}>
                <h3 className={`${adminUi.cardTitle} mb-4`}>
                    <ShoppingBag className="w-4 h-4 text-xeption-gold" /> Dernières ventes
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                     {orders.slice(0, 5).map((o) => (
                        <div key={o.id} className={`flex items-center justify-between gap-3 p-3 rounded-md border border-white/10 bg-black/20 backdrop-blur-sm ${adminUi.surfaceHover}`}>
                            <div className="flex-1 min-w-0">
                                <span className="text-white text-sm block font-medium truncate">{o.customerName}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${o.status === 'delivered' ? 'text-emerald-400' : 'text-white/55'}`}>
                                  {getOrderStatusLabel(o.status)}
                                </span>
                            </div>
                            <span className="text-white font-mono text-sm shrink-0 tabular-nums">{o.total.toLocaleString('fr-FR')} F</span>
                        </div>
                     ))}
                     {orders.length === 0 && <p className={adminUi.muted}>Aucune commande pour le moment.</p>}
                </div>
            </section>
        </div>
    </div>
  );
};

export default DashboardTab;
