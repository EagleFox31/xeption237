
import React, { useState, useEffect, useRef } from 'react';
import { Package, TrendingUp, Users, AlertCircle, Edit, Trash2, Plus, Search, Tag, Check, X, Image as ImageIcon, Box, ShoppingBag, Truck, Store, Video, UserPlus, Key, Mail, Phone, MapPin, ArrowLeft, Sparkles, Loader2, List, Minus, Upload, Film, Play, Download, Clapperboard, Printer, CreditCard, Calculator, Wrench, ShieldCheck, ArrowRight, XCircle, RotateCcw, BookOpen, Info, AlertTriangle, Menu, LogOut, LayoutDashboard, HelpCircle, FileText, Smartphone, Shield, Layers, Eye } from 'lucide-react';
import { Product, Order, Staff, Customer, CartItem, Category } from '../types';
import { supabase } from '../services/supabaseClient';
import { generateProductDetails, generateMarketingVideo } from '../services/geminiService';
import { uploadImageToCloudinary, uploadVideoToCloudinary } from '../services/uploadService';
import { generateInvoiceHTML } from '../utils/invoiceGenerator';
import RepairTicketManagement from './RepairTicketManagement';
import Logo from './Logo';

interface AdminPanelProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
}

// --- MODALE DE CONFIRMATION ---
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'info' | 'success';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel, type = 'info' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md bg-black/90 backdrop-blur-xl border p-6 rounded-lg shadow-2xl transform transition-all scale-100 ${
        type === 'danger' ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-xeption-gold/50 shadow-[0_0_30px_rgba(255,215,0,0.2)]'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {type === 'danger' ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <Info className="w-8 h-8 text-xeption-gold" />}
          <h3 className={`text-xl font-bold font-tech uppercase ${type === 'danger' ? 'text-red-500' : 'text-white'}`}>{title}</h3>
        </div>
        <p className="text-gray-300 text-sm mb-8 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Annuler
          </button>
          <button 
            onClick={onConfirm}
            className={`px-6 py-2 text-black font-bold font-tech uppercase tracking-wider rounded-sm transition-all shadow-lg ${
                type === 'danger' ? 'bg-red-500 hover:bg-white' : 'bg-xeption-gold hover:bg-white'
            }`}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ products, onUpdateProducts }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'orders' | 'staff' | 'clients' | 'marketing' | 'sav' | 'guide' | 'categories'>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  
  // Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  
  // Loading States
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // POS State
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCustomer, setPosCustomer] = useState({ name: '', phone: '', email: '' });
  const [posPaymentMethod, setPosPaymentMethod] = useState<'CASH' | 'OM' | 'MOMO'>('CASH');

  // Modal State
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' | 'success'} | null>(null);

  // --- INITIAL DATA FETCHING ---
  useEffect(() => {
      const initData = async () => {
          setIsLoadingData(true);
          await Promise.all([fetchOrders(), fetchStaff(), fetchCustomers(), fetchCategories()]);
          setIsLoadingData(false);
      };
      initData();
  }, []);

  const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*').order('date', { ascending: false });
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
  };

  const fetchStaff = async () => {
      const { data } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
      if (data) setStaffMembers(data as Staff[]);
  };

  const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('*').order('total_spent', { ascending: false });
      if (data) setCustomers(data as Customer[]);
  };

  const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (data) setCategories(data as Category[]);
  };

  const showConfirm = (title: string, message: string, action: () => void, type: 'danger' | 'info' | 'success' = 'info') => {
      setModalConfig({
          isOpen: true,
          title,
          message,
          onConfirm: () => {
              action();
              setModalConfig(null);
          },
          type
      });
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (viewingOrder?.id === orderId) {
            setViewingOrder({ ...viewingOrder, status: newStatus });
        }
    }
  };

  const handlePrintInvoice = (order: Order) => {
    const html = generateInvoiceHTML(order);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }
  };

  const handleDownloadPdf = async (order: Order) => {
    setIsPdfGenerating(true);
    try {
        const html = generateInvoiceHTML(order);
        const element = document.createElement('div');
        element.innerHTML = html;
        element.style.width = '700px'; 
        element.style.padding = '20px';
        element.style.background = 'white';

        const opt = {
            margin: 10,
            filename: `Facture_Xeption_${order.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // @ts-ignore
        await window.html2pdf().set(opt).from(element).save();
    } catch (err) {
        console.error(err);
    } finally {
        setIsPdfGenerating(false);
    }
  };

  const handlePosSubmit = () => {
      if (posCart.length === 0) return alert("Panier vide");
      if (!posCustomer.name || !posCustomer.phone) return alert("Nom et Téléphone requis");

      showConfirm(
          "Valider la Vente",
          `Confirmer la vente de ${posCart.reduce((a,b)=>a+b.quantity,0)} articles pour ${posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} FCFA ?`,
          async () => {
              const total = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              const newOrderId = `POS-${Date.now().toString().slice(-6)}`;
              
              try {
                  await supabase.from('orders').insert([{
                      id: newOrderId,
                      customer_name: posCustomer.name,
                      customer_email: posCustomer.email,
                      customer_phone: posCustomer.phone,
                      customer_city: 'Retrait Boutique (POS)',
                      delivery_mode: 'pickup',
                      total: total,
                      status: 'delivered', 
                      payment_method: posPaymentMethod,
                      items: posCart,
                      date: new Date().toISOString()
                  }]);

                  for (const item of posCart) {
                      const product = products.find(p => p.id === item.id);
                      if (product) {
                          const newStock = Math.max(0, product.stock - item.quantity);
                          await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                          onUpdateProducts(products.map(p => p.id === item.id ? { ...p, stock: newStock } : p));
                      }
                  }

                  const { data: existingCustomer } = await supabase
                    .from('customers')
                    .select('*')
                    .or(`phone.eq.${posCustomer.phone}${posCustomer.email ? `,email.eq.${posCustomer.email}` : ''}`)
                    .maybeSingle();

                  if (existingCustomer) {
                    await supabase.from('customers').update({
                      total_orders: (existingCustomer.total_orders || 0) + 1,
                      total_spent: (existingCustomer.total_spent || 0) + total,
                      name: posCustomer.name,
                      phone: posCustomer.phone
                    }).eq('id', existingCustomer.id);
                  } else {
                    await supabase.from('customers').insert([{
                      id: crypto.randomUUID(),
                      name: posCustomer.name,
                      email: posCustomer.email || null,
                      phone: posCustomer.phone,
                      city: 'Yaoundé',
                      total_orders: 1,
                      total_spent: total,
                      created_at: new Date().toISOString()
                    }]);
                  }

                  const invoiceData = {
                      id: newOrderId,
                      items: posCart,
                      total: total,
                      status: 'delivered',
                      paymentMethod: posPaymentMethod,
                      customerName: posCustomer.name,
                      customerEmail: posCustomer.email,
                      customerPhone: posCustomer.phone,
                      customerCity: 'Yaoundé',
                      deliveryMode: 'pickup',
                      date: new Date().toLocaleDateString('fr-FR')
                  };
                  handlePrintInvoice(invoiceData as any);

                  setPosCart([]);
                  setPosCustomer({ name: '', phone: '', email: '' });
                  fetchOrders();
                  fetchCustomers();
              } catch (err: any) {
                  alert("Erreur critique POS: " + err.message);
              }
          },
          'success'
      );
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const isNew = editingProduct.id.startsWith('new_');
    const productData = { ...editingProduct, id: isNew ? crypto.randomUUID() : editingProduct.id };
    const { error } = await supabase.from('products').upsert(productData);
    if (!error) {
        onUpdateProducts(isNew ? [...products, productData] : products.map(p => p.id === productData.id ? productData : p));
        setEditingProduct(null);
    }
  };
  
  const MENU_ITEMS = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pos', label: 'Caisse (POS)', icon: CreditCard },
      { id: 'orders', label: 'Invoices & Suivi', icon: FileText },
      { id: 'inventory', label: 'Inventaire', icon: Package },
      { id: 'categories', label: 'Types (Dynamic)', icon: Layers },
      { id: 'sav', label: 'Atelier SAV', icon: Wrench },
      { id: 'clients', label: 'Clients CRM', icon: Users },
      { id: 'staff', label: 'Équipe', icon: Key },
      { id: 'guide', label: 'Guide Staff', icon: BookOpen }
  ];

  return (
    <div className="min-h-screen text-white font-sans selection:bg-xeption-gold selection:text-black">
        {modalConfig && <ConfirmationModal {...modalConfig} onCancel={() => setModalConfig(null)} />}
        {isPdfGenerating && <div className="fixed inset-0 z-[200] bg-black/80 flex flex-col items-center justify-center"><Loader2 className="w-12 h-12 text-xeption-gold animate-spin mb-4" /><p className="font-tech uppercase tracking-widest text-white">Génération du PDF...</p></div>}

        {/* SIDEBAR */}
        <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-black/40 backdrop-blur-xl border-r border-white/10 z-50">
            <div className="p-6 border-b border-white/10 flex justify-center">
                <div className="scale-75 origin-center"><Logo /></div>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {MENU_ITEMS.map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-bold uppercase tracking-wider transition-all ${activeTab === item.id ? 'bg-xeption-gold text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        <item.icon className="w-4 h-4" /> {item.label}
                    </button>
                ))}
            </div>
        </aside>

        <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8 min-h-screen relative overflow-x-hidden">
            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in">
                    <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Tableau de bord</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Revenu Total', value: orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.total, 0).toLocaleString(), sub: 'FCFA', icon: TrendingUp, color: 'text-green-500' },
                            { label: 'Commandes Web', value: orders.filter(o => o.status === 'pending').length.toString(), sub: 'En attente', icon: ShoppingBag, color: 'text-xeption-gold' },
                            { label: 'Base Clients', value: customers.length.toString(), sub: 'Enregistrés', icon: Users, color: 'text-purple-500' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-black/40 backdrop-blur-md border border-white/5 p-6 rounded-sm shadow-lg relative overflow-hidden">
                                <stat.icon className={`absolute right-0 bottom-0 w-24 h-24 opacity-5 ${stat.color} translate-x-1/4 translate-y-1/4`} />
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                                <h3 className="text-3xl font-bold text-white font-tech">{stat.value} <span className="text-xs text-gray-600 block sm:inline">{stat.sub}</span></h3>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'pos' && (
                <div className="animate-in fade-in h-[calc(100vh-120px)] grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <div className="lg:col-span-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-sm shadow-xl flex flex-col overflow-hidden">
                         <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
                             <h3 className="text-white font-bold uppercase text-sm flex items-center gap-2"><Box className="w-4 h-4 text-blue-400" /> Boutique Catalogue</h3>
                             <input type="text" value={posSearch} onChange={(e) => setPosSearch(e.target.value)} placeholder="Chercher un article..." className="bg-black/50 border border-white/10 px-3 py-2 text-xs text-white rounded-sm w-48 outline-none focus:border-xeption-gold" />
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
                             {products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())).map(p => (
                                 <button key={p.id} onClick={() => {
                                    if(p.stock > 0) {
                                        setPosCart(prev => {
                                            const exists = prev.find(item => item.id === p.id);
                                            if (exists) return prev.map(item => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item);
                                            return [...prev, { ...p, quantity: 1 }];
                                        });
                                    }
                                 }} disabled={p.stock<=0} className="bg-black/40 border border-white/5 p-3 rounded-sm hover:border-xeption-gold transition-all text-left flex flex-col group">
                                    <div className="aspect-square bg-black rounded-sm mb-2 relative overflow-hidden">
                                        <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform"/>
                                        {p.stock<=0 && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-[10px] text-red-500 font-bold uppercase tracking-tighter">Rupture</div>}
                                    </div>
                                    <h4 className="text-[10px] font-bold text-gray-300 line-clamp-1 uppercase">{p.name}</h4>
                                    <span className="text-[10px] text-xeption-gold font-mono">{p.price.toLocaleString()} FCFA</span>
                                 </button>
                             ))}
                         </div>
                     </div>
                     <div className="bg-black/40 backdrop-blur-md border border-xeption-gold/20 rounded-sm shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-black/60"><h3 className="text-white font-bold uppercase text-sm tracking-widest">Facture en cours</h3></div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                             {posCart.map(item => (
                                 <div key={item.id} className="flex justify-between items-center bg-black/40 p-3 rounded-sm border border-white/5">
                                     <div className="flex-1"><div className="text-[11px] font-bold text-white uppercase">{item.name}</div><div className="text-[10px] text-gray-500 font-mono">{item.price.toLocaleString()} x {item.quantity}</div></div>
                                     <button onClick={()=>setPosCart(posCart.filter(i=>i.id!==item.id))} className="text-red-500/50 hover:text-red-500"><X className="w-4 h-4"/></button>
                                 </div>
                             ))}
                             {posCart.length === 0 && <p className="text-gray-600 text-center py-20 text-xs italic">Panier vide...</p>}
                        </div>
                        <div className="p-4 bg-black/40 border-t border-white/10 space-y-3">
                            <input type="text" placeholder="Nom Client" className="w-full bg-black border border-white/10 px-3 py-3 text-xs text-white rounded-sm" value={posCustomer.name} onChange={e => setPosCustomer({...posCustomer, name: e.target.value})} />
                            <input type="tel" placeholder="Téléphone (WhatsApp)" className="w-full bg-black border border-white/10 px-3 py-3 text-xs text-white rounded-sm" value={posCustomer.phone} onChange={e => setPosCustomer({...posCustomer, phone: e.target.value})} />
                            <div className="flex justify-between items-end border-t border-white/10 pt-3"><span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Total Net</span><span className="text-2xl font-bold font-tech text-white">{posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} <span className="text-xs text-xeption-gold">FCFA</span></span></div>
                            <button onClick={handlePosSubmit} className="w-full bg-xeption-gold hover:bg-white text-black font-bold uppercase py-4 rounded-sm tracking-[0.2em] transition-all">Valider & Imprimer</button>
                        </div>
                     </div>
                </div>
            )}

            {activeTab === 'orders' && (
                <div className="animate-in fade-in">
                    <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Invoices & Commandes</h2>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden shadow-2xl overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                             <thead className="bg-black/40 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                                <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Client</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Total</th><th className="px-6 py-4 text-right">Facture</th><th className="px-6 py-4 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                                {orders.map(o => (
                                    <tr key={o.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => setViewingOrder(o)}>
                                        <td className="px-6 py-4 font-mono text-xs font-bold text-white group-hover:text-xeption-gold transition-colors">#{o.id}</td>
                                        <td className="px-6 py-4"><div><span className="block font-bold text-white uppercase text-xs">{o.customerName}</span><span className="text-[10px] text-gray-500">{o.customerPhone}</span></div></td>
                                        <td className="px-6 py-4"><span className={`uppercase font-bold text-[9px] px-2 py-1 rounded bg-white/5 ${o.status === 'delivered' ? 'text-green-500' : 'text-gray-400'}`}>{o.status}</span></td>
                                        <td className="px-6 py-4 font-mono text-white text-xs">{o.total.toLocaleString()} FCFA</td>
                                        <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => handlePrintInvoice(o)} className="p-2 text-gray-400 hover:text-xeption-gold" title="Imprimer"><Printer className="w-4 h-4" /></button>
                                            <button onClick={() => handleDownloadPdf(o)} className="p-2 text-gray-400 hover:text-xeption-gold" title="Télécharger PDF"><Download className="w-4 h-4" /></button>
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setViewingOrder(o)} className="p-2 text-gray-400 hover:text-white"><Eye className="w-4 h-4" /></button>
                                                {o.status === 'pending' && <button onClick={() => updateOrderStatus(o.id, 'confirmed')} className="text-[9px] bg-purple-600 text-white px-2 py-1 rounded-sm uppercase font-bold">Valider</button>}
                                                {o.status === 'confirmed' && <button onClick={() => updateOrderStatus(o.id, 'delivered')} className="text-[9px] bg-green-600 text-white px-2 py-1 rounded-sm uppercase font-bold">Livré</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB INVENTORY */}
            {activeTab === 'inventory' && (
                <div className="animate-in fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-tech font-bold uppercase text-white">Inventaire</h2>
                        <button onClick={() => setEditingProduct({id: `new_${Date.now()}`, name: '', description: '', price: 0, category: categories[0]?.slug || '', image: '', images: [], video: '', stock: 0, isPromo: false, specs: [], pros: [], cons: [], warrantyMonths: 0})} className="bg-xeption-gold text-black px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white rounded-sm"><Plus className="w-4 h-4" /> Nouveau</button>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden shadow-2xl">
                        <table className="w-full text-left"><thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-bold"><tr><th className="px-6 py-4">Article</th><th className="px-6 py-4">Prix</th><th className="px-6 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-white/5">{products.map(p => (<tr key={p.id} className="hover:bg-white/5"><td className="px-6 py-4"><span className="text-white font-bold text-xs uppercase">{p.name}</span><div className="text-[10px] text-gray-500">Stock: {p.stock}</div></td><td className="px-6 py-4 text-xs font-mono">{p.price.toLocaleString()}</td><td className="px-6 py-4 text-right space-x-2"><button onClick={()=>setEditingProduct(p)} className="text-gray-500 hover:text-white"><Edit className="w-4 h-4"/></button></td></tr>))}</tbody></table>
                    </div>
                </div>
            )}
            
            {activeTab === 'sav' && <RepairTicketManagement />}
            {activeTab === 'clients' && (
                 <div className="animate-in fade-in">
                    <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Clients CRM</h2>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden shadow-2xl">
                         <table className="w-full text-left border-collapse">
                            <thead className="bg-black/40 text-gray-400 text-[10px] uppercase font-bold tracking-wider"><tr><th className="px-6 py-4">Nom</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4">Dépenses</th><th className="px-6 py-4">Achats</th></tr></thead>
                            <tbody className="divide-y divide-white/5 text-gray-300 text-sm">{customers.map(c => (<tr key={c.id} className="hover:bg-white/5"><td className="px-6 py-4 font-bold text-white uppercase text-xs">{c.name}</td><td className="px-6 py-4 text-xs">{c.phone}<br/><span className="text-[10px] text-gray-500">{c.email}</span></td><td className="px-6 py-4 font-mono text-xeption-gold text-xs">{(c.total_spent||0).toLocaleString()}</td><td className="px-6 py-4 font-bold text-white">{c.total_orders||0}</td></tr>))}</tbody>
                         </table>
                    </div>
                 </div>
            )}
            {activeTab === 'staff' && (
                <div className="animate-in fade-in">
                    <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-tech font-bold uppercase text-white">Équipe</h2></div>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm">
                        <table className="w-full text-left"><thead className="bg-black/40 text-gray-500 text-[10px] uppercase font-bold"><tr><th className="px-6 py-4">Nom</th><th className="px-6 py-4">Rôle</th></tr></thead><tbody className="divide-y divide-white/5">{staffMembers.map(s => (<tr key={s.id} className="hover:bg-white/5"><td className="px-6 py-4 font-bold text-white uppercase text-xs">{s.name}</td><td className="px-6 py-4"><span className="text-[9px] px-2 py-1 bg-white/10 rounded uppercase font-bold">{s.role}</span></td></tr>))}</tbody></table>
                    </div>
                </div>
            )}
        </main>

        {/* --- ORDER DEEP VIEW MODAL --- */}
        {viewingOrder && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl overflow-y-auto p-4 md:p-12 animate-in fade-in duration-300">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <button onClick={() => setViewingOrder(null)} className="flex items-center gap-2 text-gray-500 hover:text-white uppercase font-tech font-bold text-sm tracking-widest"><ArrowLeft className="w-4 h-4"/> Retour liste</button>
                        <div className="flex gap-4">
                            <button onClick={() => handlePrintInvoice(viewingOrder)} className="bg-white/10 hover:bg-white hover:text-black p-3 rounded-sm transition-all"><Printer className="w-5 h-5"/></button>
                            <button onClick={() => handleDownloadPdf(viewingOrder)} className="bg-white/10 hover:bg-white hover:text-black p-3 rounded-sm transition-all"><Download className="w-5 h-5"/></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Info Client */}
                        <div className="md:col-span-1 space-y-6">
                            <div className="bg-black/40 border border-white/10 p-6 rounded-sm">
                                <span className="text-[10px] text-xeption-gold font-bold uppercase tracking-[0.2em] block mb-4">Client Detail</span>
                                <h3 className="text-2xl font-bold font-tech text-white uppercase mb-4">{viewingOrder.customerName}</h3>
                                <div className="space-y-3 text-sm text-gray-400">
                                    <div className="flex items-center gap-3"><Phone className="w-4 h-4"/> {viewingOrder.customerPhone}</div>
                                    <div className="flex items-center gap-3"><Mail className="w-4 h-4"/> {viewingOrder.customerEmail || 'Pas d\'email'}</div>
                                    <div className="flex items-center gap-3"><MapPin className="w-4 h-4"/> {viewingOrder.customerCity}</div>
                                </div>
                            </div>
                            
                            <div className="bg-black/40 border border-white/10 p-6 rounded-sm">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] block mb-4">Logistique</span>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><span className="text-[10px] text-gray-500 uppercase font-bold">Mode</span> <span className="text-white text-xs font-bold uppercase tracking-widest bg-white/5 px-2 py-1">{viewingOrder.deliveryMode === 'pickup' ? 'Boutique' : 'Livraison'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[10px] text-gray-500 uppercase font-bold">Paiement</span> <span className="text-white text-xs font-bold uppercase">{viewingOrder.paymentMethod}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[10px] text-gray-500 uppercase font-bold">Status</span> <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-sm ${viewingOrder.status === 'delivered' ? 'bg-green-500/20 text-green-500' : 'bg-purple-500/20 text-purple-500'}`}>{viewingOrder.status}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Articles Table */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-black/40 border border-white/10 rounded-sm overflow-hidden">
                                <div className="p-4 bg-black/60 border-b border-white/10 flex justify-between items-center">
                                    <h4 className="text-xs font-bold font-tech uppercase tracking-widest text-white">Articles Commandés</h4>
                                    <span className="font-mono text-xs text-xeption-gold">#{viewingOrder.id}</span>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {viewingOrder.items.map((item, idx) => (
                                        <div key={idx} className="p-4 flex items-center gap-6 hover:bg-white/5 transition-colors">
                                            <div className="w-16 h-16 bg-black rounded-sm border border-white/10 p-2 flex-shrink-0">
                                                <img src={item.image} className="w-full h-full object-contain" alt={item.name} />
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="text-sm font-bold text-white uppercase">{item.name}</h5>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest">{item.category}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-mono text-white">{item.price.toLocaleString()} x {item.quantity}</div>
                                                <div className="text-xeption-gold font-bold font-tech">{(item.price * item.quantity).toLocaleString()} <span className="text-[9px]">FCFA</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-black/60 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-xl font-bold font-tech uppercase text-gray-500">Total Facturé</span>
                                    <span className="text-4xl font-black font-tech text-white">{viewingOrder.total.toLocaleString()} <span className="text-sm text-xeption-gold">FCFA</span></span>
                                </div>
                            </div>

                            <div className="flex gap-4 justify-end">
                                {viewingOrder.status === 'pending' && (
                                    <button onClick={() => updateOrderStatus(viewingOrder.id, 'confirmed')} className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-sm font-tech font-bold uppercase text-sm tracking-widest shadow-xl">Confirmer la commande</button>
                                )}
                                {viewingOrder.status === 'confirmed' && (
                                    <button onClick={() => updateOrderStatus(viewingOrder.id, 'delivered')} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-sm font-tech font-bold uppercase text-sm tracking-widest shadow-xl">Marquer comme livré</button>
                                )}
                                {viewingOrder.status === 'delivered' && (
                                    <div className="flex items-center gap-2 text-green-500 font-bold uppercase text-xs tracking-widest border border-green-500/30 px-6 py-3 bg-green-500/5"><Check className="w-4 h-4"/> Transaction Terminée</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* EDITOR OVERLAY */}
        {editingProduct && (
            <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                    <div className="flex justify-between items-center mb-10"><h2 className="text-2xl font-tech font-bold uppercase text-white">Édition Produit</h2><button onClick={()=>setEditingProduct(null)} className="text-gray-500 font-bold">FERMER</button></div>
                    <form onSubmit={handleSaveProduct} className="space-y-4">
                        <input className="w-full bg-black border border-white/10 p-4 text-white uppercase text-xs" placeholder="Nom" value={editingProduct.name} onChange={e=>setEditingProduct({...editingProduct, name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" className="bg-black border border-white/10 p-4 text-white" placeholder="Prix" value={editingProduct.price} onChange={e=>setEditingProduct({...editingProduct, price: +e.target.value})} />
                            <input type="number" className="bg-black border border-white/10 p-4 text-white" placeholder="Stock" value={editingProduct.stock} onChange={e=>setEditingProduct({...editingProduct, stock: +e.target.value})} />
                        </div>
                        <select className="w-full bg-black border border-white/10 p-4 text-white text-xs uppercase" value={editingProduct.category} onChange={e=>setEditingProduct({...editingProduct, category: e.target.value})}>
                            <option value="">Sélectionner Type</option>
                            {categories.map(c=>(<option key={c.id} value={c.slug}>{c.name}</option>))}
                        </select>
                        <button type="submit" className="w-full bg-xeption-gold text-black font-bold uppercase py-4 tracking-widest">Enregistrer les modifications</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminPanel;
