
import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, Users, AlertCircle, Edit, Trash2, Plus, Search, Tag, Check, X, Image as ImageIcon, Box, ShoppingBag, Truck, Store, Video, UserPlus, Key, Mail, Phone, MapPin } from 'lucide-react';
import { Product, Order, Staff, Customer } from '../types';
import { supabase } from '../services/supabaseClient';

interface AdminPanelProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ products, onUpdateProducts }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'orders' | 'staff' | 'clients'>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Staff State
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Clients State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Fetch data on tab change
  useEffect(() => {
      if (activeTab === 'orders' || activeTab === 'dashboard') {
          fetchOrders();
      }
      if (activeTab === 'staff') {
          fetchStaff();
      }
      if (activeTab === 'clients') {
          fetchCustomers();
      }
  }, [activeTab]);

  const fetchOrders = async () => {
      setLoadingOrders(true);
      const { data, error } = await supabase.from('orders').select('*').order('date', { ascending: false });
      if (data) {
          const formattedOrders = data.map((o: any) => ({
              id: o.id,
              items: o.items,
              total: o.total,
              status: o.status,
              paymentMethod: o.payment_method,
              customerName: o.customer_name,
              customerEmail: o.customer_email,
              customerPhone: o.customer_phone,
              customerCity: o.customer_city,
              deliveryMode: o.delivery_mode || 'delivery',
              date: new Date(o.date).toLocaleDateString('fr-FR')
          }));
          setOrders(formattedOrders);
      }
      setLoadingOrders(false);
  };

  const fetchStaff = async () => {
      const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
      if (data) {
          setStaffMembers(data as Staff[]);
      }
  };

  const fetchCustomers = async () => {
      setLoadingCustomers(true);
      const { data, error } = await supabase.from('customers').select('*').order('total_spent', { ascending: false });
      if (data) {
          setCustomers(data as Customer[]);
      }
      setLoadingCustomers(false);
  };

  // --- Product Handlers ---

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Supprimer ce produit définitivement ?')) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
           onUpdateProducts(products.filter(p => p.id !== id));
      } else {
          alert("Erreur lors de la suppression");
      }
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const isNew = editingProduct.id.startsWith('new_');
    const productData = {
        ...editingProduct,
        id: isNew ? crypto.randomUUID() : editingProduct.id
    };

    const { error } = await supabase.from('products').upsert(productData);

    if (!error) {
        if (!isNew) {
            onUpdateProducts(products.map(p => p.id === productData.id ? productData : p));
        } else {
            onUpdateProducts([...products, productData]);
        }
        setEditingProduct(null);
    } else {
        alert("Erreur sauvegarde Supabase: " + error.message);
    }
  };

  // --- Staff Handlers ---

  const handleDeleteStaff = async (id: string) => {
      if (confirm('Retirer ce membre du staff ?')) {
          const { error } = await supabase.from('staff').delete().eq('id', id);
          if (!error) {
              setStaffMembers(staffMembers.filter(s => s.id !== id));
          }
      }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingStaff) return;

      const isNew = editingStaff.id.startsWith('new_');
      const staffData = {
          ...editingStaff,
          id: isNew ? undefined : editingStaff.id
      };
      
      if (isNew) delete (staffData as any).id;

      const { data, error } = await supabase.from('staff').upsert(staffData).select();

      if (!error && data) {
          fetchStaff();
          setEditingStaff(null);
      } else {
          alert("Erreur: " + (error?.message || "Inconnue"));
      }
  };

  const toggleOrderStatus = async (orderId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'delivered' : 'pending';
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    }
  };

  const handleAddImage = () => {
      if (!editingProduct) return;
      const currentImages = editingProduct.images || [];
      setEditingProduct({ ...editingProduct, images: [...currentImages, ''] });
  };

  const handleImageChange = (index: number, value: string) => {
      if (!editingProduct) return;
      const currentImages = [...(editingProduct.images || [])];
      currentImages[index] = value;
      setEditingProduct({ ...editingProduct, images: currentImages });
  };

  const handleRemoveImage = (index: number) => {
      if (!editingProduct) return;
      const currentImages = [...(editingProduct.images || [])];
      currentImages.splice(index, 1);
      setEditingProduct({ ...editingProduct, images: currentImages });
  };

  const renderDashboard = () => (
    <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 animate-in slide-in-from-bottom-5">
            {[
                { label: 'Revenu Total', value: orders.reduce((acc, o) => acc + o.total, 0).toLocaleString(), sub: 'FCFA', icon: TrendingUp, color: 'text-green-500' },
                { label: 'Commandes', value: orders.filter(o => o.status === 'pending').length.toString(), sub: 'En attente', icon: Package, color: 'text-xeption-gold' },
                { label: 'Staff', value: staffMembers.length > 0 ? staffMembers.length.toString() : '-', sub: 'Actifs', icon: Users, color: 'text-blue-500' },
                { label: 'Clients', value: customers.length > 0 ? customers.length.toString() : '-', sub: 'Dans le CRM', icon: Users, color: 'text-purple-500' },
            ].map((stat, i) => (
                <div key={i} className="bg-xeption-highlight border border-white/5 p-6 relative overflow-hidden group hover:border-white/20 transition-all rounded-sm">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-black/40 border border-white/10 p-6 rounded-sm">
                <h3 className="text-white font-tech uppercase font-bold mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-xeption-red" /> Alertes Rupture
                </h3>
                <div className="space-y-3">
                    {products.filter(p => p.stock < 5).length === 0 ? (
                        <p className="text-gray-500 italic">Tout est sous contrôle.</p>
                    ) : (
                        products.filter(p => p.stock < 5).map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-white/5 p-3 rounded hover:bg-white/10 transition-colors">
                                <span className="text-white text-sm">{p.name}</span>
                                <span className="text-xeption-red font-bold text-xs px-2 py-1 bg-xeption-red/10 rounded">Reste: {p.stock}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <div className="bg-black/40 border border-white/10 p-6 rounded-sm">
                <h3 className="text-white font-tech uppercase font-bold mb-4 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-xeption-gold" /> Dernières Commandes
                </h3>
                <div className="space-y-3">
                     {orders.slice(0,5).map((o) => (
                        <div key={o.id} className="flex items-center justify-between bg-white/5 p-3 rounded hover:bg-white/10 transition-colors">
                            <div>
                                <span className="text-white text-sm block font-bold">{o.customerName}</span>
                                <span className="text-gray-500 text-xs block">{o.items.length} article(s)</span>
                            </div>
                            <span className="text-white font-mono text-sm">{o.total.toLocaleString()} FCFA</span>
                        </div>
                     ))}
                </div>
            </div>
        </div>
    </>
  );

  const renderInventory = () => (
    <div className="animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input type="text" placeholder="Chercher un produit..." className="bg-black/50 border border-white/10 pl-10 pr-4 py-2 text-sm text-white focus:border-xeption-gold outline-none rounded-sm w-64" />
            </div>
            <button 
                onClick={() => setEditingProduct({
                    id: `new_${Date.now()}`,
                    name: '',
                    description: '',
                    price: 0,
                    category: 'accessory',
                    image: 'https://via.placeholder.com/400',
                    images: [],
                    video: '',
                    stock: 0,
                    isPromo: false
                })}
                className="bg-xeption-gold text-black px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-colors"
            >
                <Plus className="w-4 h-4" /> Nouveau Produit
            </button>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 text-gray-400 text-xs uppercase font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Image</th>
                        <th className="px-6 py-4">Produit</th>
                        <th className="px-6 py-4">Catégorie</th>
                        <th className="px-6 py-4">Prix / Promo</th>
                        <th className="px-6 py-4">Stock</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                    {products.map(product => (
                        <tr key={product.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="w-12 h-12 bg-white/5 rounded p-1 overflow-hidden relative">
                                    <img src={product.image} alt="" className="w-full h-full object-contain" />
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-bold text-white block">{product.name}</span>
                                {product.isPromo && <span className="text-[10px] text-xeption-red bg-xeption-red/10 px-1 rounded uppercase font-bold">Promo</span>}
                            </td>
                            <td className="px-6 py-4 capitalize text-gray-500">{product.category}</td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="font-mono text-white">{product.price.toLocaleString()}</span>
                                    {product.oldPrice && <span className="font-mono text-gray-600 line-through text-xs">{product.oldPrice.toLocaleString()}</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${product.stock > 5 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                    <Box className="w-3 h-3 mr-1" />
                                    {product.stock}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => setEditingProduct(product)}
                                        className="p-2 hover:bg-white/10 rounded text-xeption-gold transition-colors" title="Modifier"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="p-2 hover:bg-red-500/20 rounded text-red-500 transition-colors" title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderOrders = () => (
    <div className="animate-in fade-in">
        <h3 className="text-xl text-white font-tech font-bold uppercase mb-6 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-xeption-gold" />
            Gestion des Commandes
        </h3>
        
        {loadingOrders ? (
             <div className="flex justify-center py-20">
                 <div className="w-8 h-8 border-2 border-xeption-gold border-t-transparent rounded-full animate-spin"></div>
             </div>
        ) : (
            <div className="bg-black/40 border border-white/10 rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">ID / Date</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Détails</th>
                            <th className="px-6 py-4">Total & Paiement</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                        {orders.map(order => (
                            <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="font-bold text-white block text-xs font-mono mb-1">#{order.id}</span>
                                    <span className="text-gray-500 text-xs">{order.date}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="block text-white font-bold">{order.customerName}</span>
                                    <span className="text-xs text-gray-500 block font-mono">{order.customerPhone}</span>
                                    {order.customerEmail && <span className="text-[10px] text-xeption-gold block font-mono mt-1">{order.customerEmail}</span>}
                                    <div className="flex items-center gap-1 mt-1 text-[10px] uppercase text-gray-400">
                                        {order.deliveryMode === 'delivery' ? <Truck className="w-3 h-3"/> : <Store className="w-3 h-3"/>}
                                        <span className="truncate max-w-[150px]">{order.customerCity || 'Retrait Boutique'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        {order.items.map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                <span className="text-xeption-gold font-bold">{item.quantity}x</span>
                                                <span className="text-gray-300">{item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-white font-bold block mb-1">{order.total.toLocaleString()} FCFA</span>
                                    <span className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                        order.paymentMethod === 'OM' ? 'text-orange-500 border-orange-500/30 bg-orange-500/5' : 
                                        order.paymentMethod === 'MOMO' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5' : 
                                        'text-green-500 border-green-500/30 bg-green-500/5'
                                    }`}>
                                        {order.paymentMethod}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => toggleOrderStatus(order.id, order.status)}
                                        className={`px-3 py-1 rounded text-xs uppercase font-bold border transition-all ${
                                        order.status === 'delivered' 
                                            ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' 
                                            : order.status === 'paid'
                                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
                                    }`}>
                                        {order.status === 'pending' ? 'En Attente' : order.status === 'delivered' ? 'Livré' : order.status}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   {order.status === 'pending' && (
                                       <button 
                                            onClick={() => toggleOrderStatus(order.id, order.status)}
                                            className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-wider flex items-center gap-1 justify-end w-full"
                                       >
                                           <Check className="w-3 h-3" /> Valider
                                       </button>
                                   )}
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-20 text-center text-gray-500 italic flex flex-col items-center justify-center">
                                    <ShoppingBag className="w-8 h-8 mb-2 opacity-20" />
                                    Aucune commande trouvée.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
    </div>
  );

  const renderClients = () => (
      <div className="animate-in fade-in">
        <h3 className="text-xl text-white font-tech font-bold uppercase mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Carnet d'Adresses (CRM)
        </h3>
        
        {loadingCustomers ? (
             <div className="flex justify-center py-20">
                 <div className="w-8 h-8 border-2 border-xeption-gold border-t-transparent rounded-full animate-spin"></div>
             </div>
        ) : (
            <div className="bg-black/40 border border-white/10 rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Contacts</th>
                            <th className="px-6 py-4">Ville</th>
                            <th className="px-6 py-4">Commandes</th>
                            <th className="px-6 py-4 text-right">Total Dépensé</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                        {customers.map(client => (
                            <tr key={client.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="font-bold text-white block">{client.name}</span>
                                    <span className="text-xs text-gray-500">Depuis le {new Date(client.created_at || '').toLocaleDateString()}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-xs">
                                            <Mail className="w-3 h-3 text-gray-500" />
                                            <span className="text-white hover:text-xeption-gold cursor-pointer">{client.email}</span>
                                        </div>
                                        {client.phone && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <Phone className="w-3 h-3 text-gray-500" />
                                                <span className="font-mono">{client.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <MapPin className="w-3 h-3" />
                                        {client.city || '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-white/5 rounded text-xs font-bold">{client.total_orders}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="font-mono text-xeption-gold font-bold">{(client.total_spent || 0).toLocaleString()} FCFA</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
  );

  const renderStaff = () => (
    <div className="animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl text-white font-tech font-bold uppercase">Équipe Xeption</h3>
            <button 
                onClick={() => setEditingStaff({
                    id: `new_${Date.now()}`,
                    username: '', // Added username for new staff
                    name: '',
                    email: '',
                    password: '123456',
                    role: 'editor',
                    phone: ''
                })}
                className="bg-white/10 text-white px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white hover:text-black transition-colors"
            >
                <UserPlus className="w-4 h-4" /> Ajouter Membre
            </button>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 text-gray-400 text-xs uppercase font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Username</th>
                        <th className="px-6 py-4">Nom Réel</th>
                        <th className="px-6 py-4">Rôle</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                    {staffMembers.map(staff => (
                        <tr key={staff.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-mono text-xeption-gold font-bold">{staff.username}</td>
                            <td className="px-6 py-4 font-bold text-white">{staff.name}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${
                                    staff.role === 'admin' ? 'bg-xeption-red/20 text-xeption-red' : 
                                    staff.role === 'manager' ? 'bg-xeption-gold/20 text-xeption-gold' : 
                                    'bg-blue-500/20 text-blue-500'
                                }`}>
                                    {staff.role}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-gray-500">{staff.email || staff.phone || '-'}</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingStaff(staff)} className="p-2 hover:bg-white/10 rounded text-xeption-gold"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteStaff(staff.id)} className="p-2 hover:bg-red-500/20 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1 bg-xeption-red"></div>
                <h2 className="text-4xl font-bold text-white font-tech uppercase">Staff Portal <span className="text-gray-600 text-lg align-middle ml-2">Manager</span></h2>
            </div>
            <p className="text-gray-500 text-sm">Gérez le stock, les commandes et le catalogue en temps réel.</p>
          </div>
          
          <div className="flex bg-black/50 border border-white/10 rounded-sm p-1 mt-4 md:mt-0 overflow-x-auto">
            {[
                { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                { id: 'inventory', label: 'Inventaire', icon: Package },
                { id: 'orders', label: 'Commandes', icon: ShoppingBag },
                { id: 'clients', label: 'Clients (CRM)', icon: Users },
                { id: 'staff', label: 'Staff & Rôles', icon: Key },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-all rounded-sm whitespace-nowrap ${activeTab === tab.id ? 'bg-xeption-gold text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                </button>
            ))}
          </div>
      </div>

      {/* Content Area */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'inventory' && renderInventory()}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'clients' && renderClients()}
      {activeTab === 'staff' && renderStaff()}


      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111] border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl flex flex-col">
                <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#111] z-10">
                    <h3 className="text-xl font-bold text-white font-tech uppercase">
                        {products.find(p => p.id === editingProduct.id) ? 'Modifier Produit' : 'Nouveau Produit'}
                    </h3>
                    <button onClick={() => setEditingProduct(null)} className="text-gray-500 hover:text-white"><X className="w-6 h-6" /></button>
                </div>
                
                <form onSubmit={handleSaveProduct} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Nom du produit</label>
                            <input 
                                type="text" 
                                required
                                value={editingProduct.name}
                                onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 text-white p-3 focus:border-xeption-gold outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Prix (FCFA)</label>
                            <input 
                                type="number" 
                                required
                                value={editingProduct.price}
                                onChange={e => setEditingProduct({...editingProduct, price: parseInt(e.target.value) || 0})}
                                className="w-full bg-black/50 border border-white/10 text-white p-3 focus:border-xeption-gold outline-none font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Stock</label>
                            <input 
                                type="number" 
                                required
                                value={editingProduct.stock}
                                onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})}
                                className="w-full bg-black/50 border border-white/10 text-white p-3 focus:border-xeption-gold outline-none font-mono"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Catégorie</label>
                            <select 
                                value={editingProduct.category}
                                onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})}
                                className="w-full bg-black/50 border border-white/10 text-white p-3 focus:border-xeption-gold outline-none appearance-none"
                            >
                                <option value="phone">Smartphone</option>
                                <option value="computer">Ordinateur</option>
                                <option value="accessory">Accessoire</option>
                                <option value="consumable">Consommable</option>
                            </select>
                        </div>

                        <div className="md:col-span-2 space-y-4 border-t border-white/10 pt-4">
                             <h4 className="text-white font-bold uppercase text-sm">Galerie & Média</h4>
                             
                             <div>
                                <label className="block text-xs text-gray-500 uppercase font-bold mb-2 flex items-center gap-2"><ImageIcon className="w-3 h-3 text-xeption-gold" /> Image Principale (URL)</label>
                                <div className="flex gap-4">
                                    <input 
                                        type="text" 
                                        value={editingProduct.image}
                                        onChange={e => setEditingProduct({...editingProduct, image: e.target.value})}
                                        className="flex-1 bg-black/50 border border-white/10 text-white p-3 focus:border-xeption-gold outline-none text-xs"
                                        placeholder="https://..."
                                    />
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        {editingProduct.image ? <img src={editingProduct.image} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-600" />}
                                    </div>
                                </div>
                             </div>

                             <div>
                                <label className="block text-xs text-gray-500 uppercase font-bold mb-2 flex items-center gap-2"><Video className="w-3 h-3 text-blue-500" /> Vidéo (URL MP4)</label>
                                <input 
                                    type="text" 
                                    value={editingProduct.video || ''}
                                    onChange={e => setEditingProduct({...editingProduct, video: e.target.value})}
                                    className="w-full bg-black/50 border border-white/10 text-white p-3 focus:border-xeption-gold outline-none text-xs"
                                    placeholder="https://.../video.mp4"
                                />
                             </div>

                             <div>
                                 <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Images Supplémentaires</label>
                                 <div className="space-y-2">
                                     {(editingProduct.images || []).map((img, idx) => (
                                         <div key={idx} className="flex gap-2">
                                             <input 
                                                type="text" 
                                                value={img}
                                                onChange={(e) => handleImageChange(idx, e.target.value)}
                                                className="flex-1 bg-black/50 border border-white/10 text-white p-2 text-xs focus:border-xeption-gold outline-none"
                                             />
                                             <button type="button" onClick={() => handleRemoveImage(idx)} className="text-red-500 hover:text-red-400 p-2"><X className="w-4 h-4" /></button>
                                         </div>
                                     ))}
                                     <button type="button" onClick={handleAddImage} className="text-xs text-xeption-gold hover:underline flex items-center gap-1">+ Ajouter une image</button>
                                 </div>
                             </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Description courte</label>
                            <textarea 
                                value={editingProduct.description}
                                onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 text-white p-3 focus:border-xeption-gold outline-none h-24 resize-none"
                            />
                        </div>

                        <div className="md:col-span-2 bg-xeption-gold/5 border border-xeption-gold/20 p-4 rounded-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Tag className="w-4 h-4 text-xeption-gold" />
                                <span className="text-xeption-gold font-bold uppercase text-sm">Gestion Promo</span>
                            </div>
                            <div className="flex items-center gap-8">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={editingProduct.isPromo || false}
                                        onChange={e => setEditingProduct({...editingProduct, isPromo: e.target.checked})}
                                        className="w-5 h-5 accent-xeption-gold rounded cursor-pointer"
                                    />
                                    <span className="text-white text-sm font-bold">Activer Promo</span>
                                </label>
                                
                                {editingProduct.isPromo && (
                                    <div className="flex-1">
                                         <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Ancien Prix (barré)</label>
                                         <input 
                                            type="number" 
                                            value={editingProduct.oldPrice || ''}
                                            onChange={e => setEditingProduct({...editingProduct, oldPrice: parseInt(e.target.value)})}
                                            className="w-full bg-black/50 border border-white/10 text-white p-2 focus:border-xeption-gold outline-none font-mono"
                                            placeholder="Ex: 100000"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
                        <button 
                            type="button"
                            onClick={() => setEditingProduct(null)}
                            className="px-6 py-3 text-gray-400 hover:text-white transition-colors font-bold uppercase text-xs tracking-widest"
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit"
                            className="px-8 py-3 bg-white text-black font-tech font-bold uppercase tracking-wider hover:bg-xeption-gold transition-colors shadow-lg"
                        >
                            Sauvegarder
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-[#111] border border-white/10 w-full max-w-md p-6 rounded-sm shadow-2xl">
                 <h3 className="text-xl font-bold text-white font-tech uppercase mb-6">
                     {editingStaff.id.startsWith('new_') ? 'Nouveau Membre' : 'Modifier Membre'}
                 </h3>
                 <form onSubmit={handleSaveStaff} className="space-y-4">
                     <div>
                         <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Username (Login)</label>
                         <input required type="text" value={editingStaff.username} onChange={e => setEditingStaff({...editingStaff, username: e.target.value})} className="w-full bg-black/50 border border-white/10 p-2 text-white outline-none focus:border-xeption-gold font-mono"/>
                     </div>
                     <div>
                         <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Nom complet (Réel)</label>
                         <input required type="text" value={editingStaff.name} onChange={e => setEditingStaff({...editingStaff, name: e.target.value})} className="w-full bg-black/50 border border-white/10 p-2 text-white outline-none focus:border-xeption-gold"/>
                     </div>
                     <div>
                         <label className="block text-xs text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Key className="w-3 h-3" /> Mot de Passe</label>
                         <input required type="text" value={editingStaff.password || ''} onChange={e => setEditingStaff({...editingStaff, password: e.target.value})} className="w-full bg-black/50 border border-white/10 p-2 text-white outline-none focus:border-xeption-gold font-mono"/>
                     </div>
                     <div>
                         <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Rôle</label>
                         <select value={editingStaff.role} onChange={e => setEditingStaff({...editingStaff, role: e.target.value as any})} className="w-full bg-black/50 border border-white/10 p-2 text-white outline-none focus:border-xeption-gold">
                             <option value="admin">Administrateur</option>
                             <option value="manager">Manager</option>
                             <option value="editor">Éditeur</option>
                         </select>
                     </div>
                     <div className="flex justify-end gap-2 pt-4">
                         <button type="button" onClick={() => setEditingStaff(null)} className="px-4 py-2 text-gray-500 text-xs font-bold uppercase">Annuler</button>
                         <button type="submit" className="px-4 py-2 bg-xeption-gold text-black text-xs font-bold uppercase">Enregistrer</button>
                     </div>
                 </form>
             </div>
          </div>
      )}

    </div>
  );
};

export default AdminPanel;
