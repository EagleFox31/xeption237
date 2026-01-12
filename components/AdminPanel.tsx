import React from 'react';
import { Package, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { PRODUCTS } from '../constants';

const AdminPanel: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="flex items-center gap-3 mb-10">
          <div className="h-8 w-1 bg-xeption-red"></div>
          <h2 className="text-4xl font-bold text-white font-tech uppercase">Command Center <span className="text-gray-600 text-lg align-middle ml-2">v2.0</span></h2>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
            { label: 'Revenu Journalier', value: '450.000', sub: 'FCFA', icon: TrendingUp, color: 'text-green-500' },
            { label: 'Commandes', value: '12', sub: 'Pending', icon: Package, color: 'text-xeption-gold' },
            { label: 'Trafic', value: '1.2k', sub: 'Visites', icon: Users, color: 'text-blue-500' },
            { label: 'Alertes Stock', value: '3', sub: 'Urgent', icon: AlertCircle, color: 'text-xeption-red' },
        ].map((stat, i) => (
            <div key={i} className="bg-xeption-highlight border border-white/5 p-6 relative overflow-hidden group hover:border-white/20 transition-all">
                <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/3 -translate-y-1/3">
                    <stat.icon className={`w-32 h-32 ${stat.color}`} />
                </div>
                <div className="relative z-10">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                    <h3 className="text-4xl font-bold text-white font-tech">{stat.value} <span className="text-sm text-gray-600">{stat.sub}</span></h3>
                </div>
            </div>
        ))}
      </div>

      {/* Quick Stock View */}
      <div className="bg-xeption-highlight border border-white/5">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-bold text-white font-tech uppercase tracking-wide">État des Stocks</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-black text-gray-500 text-xs uppercase font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Produit</th>
                        <th className="px-6 py-4">Prix</th>
                        <th className="px-6 py-4">Stock</th>
                        <th className="px-6 py-4">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                    {PRODUCTS.slice(0, 5).map(product => (
                        <tr key={product.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-medium text-white">{product.name}</td>
                            <td className="px-6 py-4 font-mono">{product.price.toLocaleString('fr-FR')}</td>
                            <td className="px-6 py-4">
                                <span className={`${product.stock < 5 ? 'text-xeption-red font-bold' : ''}`}>
                                    {product.stock}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border ${product.stock > 0 ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'}`}>
                                    {product.stock > 0 ? 'OK' : 'OUT'}
                                </span>
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

export default AdminPanel;