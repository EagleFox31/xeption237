
import React, { useState, useEffect, useRef } from 'react';
import { Package, TrendingUp, Users, AlertCircle, Edit, Trash2, Plus, Search, Tag, Check, X, Image as ImageIcon, Box, ShoppingBag, Truck, Store, Video, UserPlus, Key, Mail, Phone, MapPin, ArrowLeft, Sparkles, Loader2, List, Minus, Upload, Film, Play, Download, Clapperboard, Printer, CreditCard, Calculator, Wrench, ShieldCheck, ArrowRight, XCircle, RotateCcw, BookOpen, Info, AlertTriangle, Menu, LogOut, LayoutDashboard, HelpCircle, FileText, Smartphone, Shield, Layers } from 'lucide-react';
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

// --- CONFIGURATION MODALE ---
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
  
  // Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  
  // Loading States
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Staff Management State
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // POS State
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCustomer, setPosCustomer] = useState({ name: '', phone: '', email: '' });
  const [posPaymentMethod, setPosPaymentMethod] = useState<'CASH' | 'OM' | 'MOMO'>('CASH');

  // AI & Upload State
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState("Cinematic product shot of the Dell XPS 14 9440 floating in a dark void. Elegant gold neon lighting highlights the aluminum edges and the keyboard. Background features subtle futuristic HUD elements and floating golden particles. High contrast, 4k resolution, sleek, premium tech advertisement style, slow camera pan, dark atmosphere.");
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' | 'success'} | null>(null);

  // Refs
  const mainImageInputRef = useRef<HTMLInputElement>(null);

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

  const handleAddCategory = async () => {
      if (!newCatName.trim()) return;
      const slug = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const { data, error } = await supabase.from('categories').insert([{ name: newCatName, slug }]).select();
      if (!error && data) {
          setCategories([...categories, data[0] as Category]);
          setNewCatName('');
      }
  };

  const handleDeleteCategory = (id: string) => {
      showConfirm(
          "Supprimer Type",
          "Attention, assurez-vous qu'aucun produit n'est lié à ce type avant de supprimer.",
          async () => {
              const { error } = await supabase.from('categories').delete().eq('id', id);
              if (!error) setCategories(categories.filter(c => c.id !== id));
          },
          'danger'
      );
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
    }
  };

  const handleCancelOrder = (order: Order) => {
      showConfirm(
          "Annulation Commande",
          `Êtes-vous sûr d'annuler la commande #${order.id} ? Le stock sera automatiquement restauré.`,
          async () => {
              try {
                  for (const item of order.items) {
                      const { data: productData } = await supabase.from('products').select('stock').eq('id', item.id).single();
                      if (productData) {
                          const newStock = productData.stock + item.quantity;
                          await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                          onUpdateProducts(products.map(p => p.id === item.id ? { ...p, stock: newStock } : p));
                      }
                  }
                  await updateOrderStatus(order.id, 'cancelled');
              } catch (err: any) {
                  console.error(err);
              }
          },
          'danger'
      );
  };

  const handleDeleteProduct = (id: string) => {
    showConfirm(
        "Supprimer Produit",
        "Attention, cette action est irréversible. Le produit disparaîtra du catalogue.",
        async () => {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (!error) onUpdateProducts(products.filter(p => p.id !== id));
        },
        'danger'
    );
  };

  const handleDeleteStaff = (id: string) => {
      showConfirm(
          "Supprimer Staff",
          "Voulez-vous vraiment retirer ce membre de l'équipe ?",
          async () => {
              const { error } = await supabase.from('staff').delete().eq('id', id);
              if (!error) setStaffMembers(staffMembers.filter(s => s.id !== id));
          },
          'danger'
      );
  };

  const addToPosCart = (product: Product) => {
    setPosCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handlePosSubmit = () => {
      if (posCart.length === 0) return alert("Panier vide");
      if (!posCustomer.name) return alert("Nom du client requis");

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

                  const invoiceData = {
                      id: newOrderId,
                      items: posCart,
                      total: total,
                      status: 'delivered',
                      paymentMethod: posPaymentMethod,
                      customerName: posCustomer.name,
                      customerEmail: posCustomer.email,
                      customerPhone: posCustomer.phone,
                      customerCity: 'Retrait Boutique',
                      deliveryMode: 'pickup',
                      date: new Date().toLocaleDateString('fr-FR')
                  };
                  const html = generateInvoiceHTML(invoiceData as any);
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                      printWindow.document.write(html);
                      printWindow.document.close();
                      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
                  }

                  setPosCart([]);
                  setPosCustomer({ name: '', phone: '', email: '' });
                  fetchOrders();
                  fetchCustomers();

              } catch (err: any) {
                  alert(err.message);
              }
          },
          'success'
      );
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    // Safety check for category
    if (!editingProduct.category) {
        alert("Veuillez sélectionner une catégorie valide.");
        return;
    }

    const isNew = editingProduct.id.startsWith('new_');
    const productData = { ...editingProduct, id: isNew ? crypto.randomUUID() : editingProduct.id };
    
    const { error } = await supabase.from('products').upsert(productData);
    
    if (error) {
        console.error("Supabase Save Error:", error);
        if (error.code === '23503') {
            alert(`Erreur de catégorie : Le type "${editingProduct.category}" n'existe pas dans la base de données. Créez-le d'abord dans l'onglet 'Types'.`);
        } else {
            alert(`Erreur lors de la sauvegarde : ${error.message}`);
        }
        return;
    }

    onUpdateProducts(isNew ? [...products, productData] : products.map(p => p.id === productData.id ? productData : p));
    setEditingProduct(null);
  };
  
  const handleSaveStaff = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingStaff) return;
      const isNew = editingStaff.id.startsWith('new_');
      const { username, ...cleanData } = editingStaff as any;
      const staffData = { ...cleanData, id: isNew ? undefined : editingStaff.id };
      if (isNew) delete (staffData as any).id;
      const { data, error } = await supabase.from('staff').upsert(staffData).select();
      if (!error && data) {
          fetchStaff();
          setEditingStaff(null);
      }
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !editingProduct) return;
      setUploadingImage(true);
      try {
          const url = await uploadImageToCloudinary(e.target.files[0]);
          setEditingProduct({ ...editingProduct, image: url });
      } finally { setUploadingImage(false); }
  };
  const handleAiGeneration = async () => {
      if (!editingProduct?.name) return;
      setIsGenerating(true);
      try {
          const details = await generateProductDetails(editingProduct.name, editingProduct.category);
          setEditingProduct(prev => prev ? ({...prev, ...details, pros: details.pros || [], cons: details.cons || [], specs: details.specs || []}) : null);
      } finally { setIsGenerating(false); }
  };
   const handleVideoGeneration = async () => {
      if (!videoPrompt) return;
      setGeneratingVideo(true);
      try {
          const url = await generateMarketingVideo(videoPrompt);
          if (url) setGeneratedVideoUrl(url);
      } finally { setGeneratingVideo(false); }
  };

  const MENU_ITEMS = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pos', label: 'Caisse (POS)', icon: CreditCard },
      { id: 'orders', label: 'Commandes', icon: ShoppingBag },
      { id: 'inventory', label: 'Inventaire', icon: Package },
      { id: 'categories', label: 'Types (Dynamic)', icon: Layers },
      { id: 'sav', label: 'Atelier SAV', icon: Wrench },
      { id: 'clients', label: 'Clients CRM', icon: Users },
      { id: 'staff', label: 'Équipe', icon: Key },
      { id: 'marketing', label: 'Studio Vidéo', icon: Clapperboard },
      { id: 'guide', label: 'Guide Staff', icon: BookOpen }
  ];

  const Sidebar = () => (
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-black/40 backdrop-blur-xl border-r border-white/10 z-50">
          <div className="p-6 border-b border-white/10 flex justify-center">
             <div className="scale-75 origin-center"><Logo /></div>
          </div>
          
          <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
              {MENU_ITEMS.map(item => (
                  <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-bold uppercase tracking-wider transition-all ${
                          activeTab === item.id 
                          ? 'bg-xeption-gold text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                  </button>
              ))}
          </div>

          <div className="p-4 border-t border-white/10">
              <div className="bg-white/5 rounded p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-xeption-gold/20 flex items-center justify-center text-xeption-gold font-bold">A</div>
                  <div>
                      <p className="text-white text-xs font-bold uppercase">Admin</p>
                      <p className="text-gray-500 text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> En ligne</p>
                  </div>
              </div>
          </div>
      </aside>
  );

  const BottomNav = () => (
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 pb-safe">
          <div className="flex overflow-x-auto no-scrollbar py-2 px-2 gap-2">
              {MENU_ITEMS.map(item => (
                  <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`flex flex-col items-center justify-center min-w-[70px] p-2 rounded-lg transition-all ${
                          activeTab === item.id ? 'text-xeption-gold' : 'text-gray-500'
                      }`}
                  >
                      <item.icon className={`w-5 h-5 mb-1 ${activeTab === item.id ? 'fill-current' : ''}`} />
                      <span className="text-[9px] font-bold uppercase tracking-tight">{item.label.split(' ')[0]}</span>
                  </button>
              ))}
          </div>
      </nav>
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5">
        <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Tableau de bord</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
                { label: 'Revenu Total', value: orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.total, 0).toLocaleString(), sub: 'FCFA', icon: TrendingUp, color: 'text-green-500' },
                { label: 'Commandes', value: orders.filter(o => o.status === 'pending').length.toString(), sub: 'En attente', icon: Package, color: 'text-xeption-gold' },
                { label: 'Staff Actif', value: staffMembers.length.toString(), sub: 'Membres', icon: Users, color: 'text-blue-500' },
                { label: 'Base Clients', value: customers.length.toString(), sub: 'Enregistrés', icon: Users, color: 'text-purple-500' },
            ].map((stat, i) => (
                <div key={i} className="bg-black/40 backdrop-blur-md border border-white/5 p-6 relative overflow-hidden group hover:border-white/20 transition-all rounded-sm shadow-lg">
                    <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/3 -translate-y-1/3">
                        <stat.icon className={`w-32 h-32 ${stat.color}`} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                        <h3 className="text-3xl lg:text-4xl font-bold text-white font-tech">{stat.value} <span className="text-xs text-gray-600 block sm:inline">{stat.sub}</span></h3>
                    </div>
                </div>
            ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

  const renderCategories = () => (
    <div className="animate-in fade-in slide-in-from-bottom-5">
        <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Gestion des Types (Types de Produits)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <h3 className="text-white font-bold uppercase mb-4 text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-xeption-gold"/> Nouveau Type</h3>
                <input 
                    type="text" 
                    value={newCatName} 
                    onChange={e => setNewCatName(e.target.value)} 
                    placeholder="Ex: Gaming Laptops" 
                    className="w-full bg-black/50 border border-white/10 p-3 text-white rounded-sm mb-4"
                />
                <button 
                    onClick={handleAddCategory}
                    className="w-full bg-xeption-gold text-black font-bold uppercase py-3 rounded-sm text-xs tracking-widest hover:bg-white transition-all"
                >
                    Ajouter au Catalogue
                </button>
            </div>

            <div className="md:col-span-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold">
                        <tr><th className="px-6 py-4">Nom</th><th className="px-6 py-4">Slug</th><th className="px-6 py-4 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {categories.map(cat => (
                            <tr key={cat.id} className="hover:bg-white/5 text-sm">
                                <td className="px-6 py-4 font-bold text-white">{cat.name}</td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{cat.slug}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-500 hover:bg-white/10 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );

  const renderGuide = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 max-w-5xl">
        <div>
            <h2 className="text-3xl font-tech font-bold uppercase text-white mb-2">Guide de Survie Staff</h2>
            <p className="text-gray-400">Procédures opérationnelles pour Xeption Network Boutique 2063.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Section POS */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <div className="flex items-center gap-3 mb-6 text-xeption-gold">
                    <CreditCard className="w-6 h-6" />
                    <h3 className="text-xl font-bold uppercase font-tech">Ventes & Caisse (POS)</h3>
                </div>
                <ul className="space-y-4">
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-xeption-gold/10 text-xeption-gold flex items-center justify-center text-xs font-bold shrink-0">1</div>
                        <p className="text-gray-300 text-sm">Sélectionnez les articles dans le <strong>POS</strong> en cliquant sur les vignettes.</p>
                    </li>
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-xeption-gold/10 text-xeption-gold flex items-center justify-center text-xs font-bold shrink-0">2</div>
                        <p className="text-gray-300 text-sm">Demandez le <strong>Nom</strong> et <strong>Email</strong> du client pour le CRM et la facture.</p>
                    </li>
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-xeption-gold/10 text-xeption-gold flex items-center justify-center text-xs font-bold shrink-0">3</div>
                        <p className="text-gray-300 text-sm">Cliquez sur <strong>Valider</strong> pour déduire le stock et imprimer la facture automatiquement.</p>
                    </li>
                </ul>
            </div>

            {/* Section SAV */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <div className="flex items-center gap-3 mb-6 text-blue-400">
                    <Wrench className="w-6 h-6" />
                    <h3 className="text-xl font-bold uppercase font-tech">Atelier SAV & Garantie</h3>
                </div>
                <ul className="space-y-4">
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-400/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">!</div>
                        <p className="text-gray-300 text-sm"><strong>Vérifiez l'ID Commande</strong> sur la facture du client avant toute intervention.</p>
                    </li>
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-400/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                        <p className="text-gray-300 text-sm">Changez le statut à <strong>"Reçu"</strong> dès que vous prenez l'appareil en main.</p>
                    </li>
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-400/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                        <p className="text-gray-300 text-sm">Une fois réparé, passez à <strong>"Terminé"</strong>. Le client recevra une alerte (bientôt).</p>
                    </li>
                </ul>
            </div>

            {/* Section Marketing */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <div className="flex items-center gap-3 mb-6 text-purple-400">
                    <Clapperboard className="w-6 h-6" />
                    <h3 className="text-xl font-bold uppercase font-tech">Marketing & Vidéo</h3>
                </div>
                <div className="bg-white/5 p-4 rounded-sm border border-white/5">
                    <p className="text-xs text-gray-400 italic leading-relaxed">
                        "Pour les promos sur WhatsApp, utilisez le <strong>Studio Vidéo</strong>. Demandez à l'IA de générer des visuels futuristes avec votre prompt (ex: iPhone 15 dans un volcan doré)."
                    </p>
                </div>
            </div>

            {/* Section Codes Conduite */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <div className="flex items-center gap-3 mb-6 text-green-400">
                    <Shield className="w-6 h-6" />
                    <h3 className="text-xl font-bold uppercase font-tech">Ton Xeption</h3>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                        <span className="text-gray-500">Approche</span>
                        <span className="text-white font-bold">Expert & Chill</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                        <span className="text-gray-500">Service</span>
                        <span className="text-white font-bold">"On gère ça"</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                        <span className="text-gray-500">SAV</span>
                        <span className="text-white font-bold">Zéro Stress</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen text-white font-sans selection:bg-xeption-gold selection:text-black">
        {modalConfig && <ConfirmationModal {...modalConfig} onCancel={() => setModalConfig(null)} />}

        <Sidebar />

        <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8 min-h-screen relative overflow-x-hidden">
            <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                 <Logo className="scale-75 origin-left" />
                 <div className="bg-white/10 px-3 py-1 rounded text-[10px] font-bold uppercase text-xeption-gold">Admin</div>
            </div>

            {activeTab === 'dashboard' && renderDashboard()}
            
            {activeTab === 'categories' && renderCategories()}

            {activeTab === 'pos' && (
                <div className="animate-in fade-in h-[calc(100vh-100px)] grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <div className="lg:col-span-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-sm shadow-xl flex flex-col overflow-hidden">
                         <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
                             <h3 className="text-white font-bold uppercase text-sm flex items-center gap-2"><Box className="w-4 h-4 text-blue-400" /> Catalogue</h3>
                             <input type="text" value={posSearch} onChange={(e) => setPosSearch(e.target.value)} placeholder="Chercher..." className="bg-black/50 border border-white/10 px-3 py-1 text-sm text-white rounded-sm w-48" />
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
                             {products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())).map(p => (
                                 <button key={p.id} onClick={() => addToPosCart(p)} disabled={p.stock<=0} className="bg-black/40 border border-white/5 p-3 rounded-sm hover:border-xeption-gold/50 text-left flex flex-col h-full">
                                    <div className="aspect-square bg-black rounded-sm mb-2 relative overflow-hidden"><img src={p.image} className="w-full h-full object-cover"/>{p.stock<=0 && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs text-red-500 font-bold">Rupture</div>}</div>
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
                            <button onClick={handlePosSubmit} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold uppercase py-3 rounded-sm">Valider</button>
                        </div>
                     </div>
                </div>
            )}
            
            {activeTab === 'inventory' && (
                <div className="animate-in fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-tech font-bold uppercase text-white">Inventaire</h2>
                        <button onClick={() => setEditingProduct({id: `new_${Date.now()}`, name: '', description: '', price: 0, category: categories[0]?.slug || '', image: 'https://via.placeholder.com/400', images: [], video: '', stock: 0, isPromo: false, specs: [], pros: [], cons: [], warrantyMonths: 0})} className="bg-xeption-gold text-black px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white rounded-sm"><Plus className="w-4 h-4" /> Nouveau</button>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden shadow-2xl overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold tracking-wider">
                                <tr><th className="px-6 py-4">Produit</th><th className="px-6 py-4">Prix</th><th className="px-6 py-4">Stock</th><th className="px-6 py-4 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                                {products.map(product => (
                                    <tr key={product.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 flex items-center gap-4"><img src={product.image} className="w-10 h-10 object-contain bg-black rounded p-1"/><div><span className="font-bold text-white block">{product.name}</span><span className="text-xs text-gray-500 capitalize">{product.category}</span></div></td>
                                        <td className="px-6 py-4 font-mono text-white">{product.price.toLocaleString()}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${product.stock > 5 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>{product.stock}</span></td>
                                        <td className="px-6 py-4 text-right"><button onClick={() => setEditingProduct(product)} className="p-2 text-xeption-gold hover:bg-white/10 rounded"><Edit className="w-4 h-4" /></button><button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-red-500 hover:bg-white/10 rounded"><Trash2 className="w-4 h-4" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {activeTab === 'orders' && (
                <div className="animate-in fade-in">
                    <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Commandes</h2>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden shadow-2xl overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                             <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold tracking-wider">
                                <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Client</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Montant</th><th className="px-6 py-4 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                                {orders.map(o => (
                                    <tr key={o.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs font-bold text-white">#{o.id}</td>
                                        <td className="px-6 py-4"><div><span className="block font-bold text-white">{o.customerName}</span><span className="text-xs text-gray-500">{o.deliveryMode === 'pickup' ? 'Retrait' : 'Livraison'}</span></div></td>
                                        <td className="px-6 py-4"><span className="uppercase font-bold text-[10px] px-2 py-1 rounded bg-white/5">{o.status}</span></td>
                                        <td className="px-6 py-4 font-mono text-white">{o.total.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {o.status === 'pending' && <button onClick={() => updateOrderStatus(o.id, 'confirmed')} className="text-[10px] bg-purple-600 text-white px-2 py-1 rounded uppercase font-bold">Valider</button>}
                                            {o.status === 'confirmed' && <button onClick={() => updateOrderStatus(o.id, o.deliveryMode === 'delivery' ? 'shipped' : 'ready')} className="text-[10px] bg-yellow-600 text-black px-2 py-1 rounded uppercase font-bold">Expédier</button>}
                                            {(o.status === 'shipped' || o.status === 'ready') && <button onClick={() => updateOrderStatus(o.id, 'delivered')} className="text-[10px] bg-green-600 text-white px-2 py-1 rounded uppercase font-bold">Terminer</button>}
                                            {o.status !== 'delivered' && o.status !== 'cancelled' && <button onClick={() => handleCancelOrder(o)} className="text-[10px] border border-red-500 text-red-500 px-2 py-1 rounded uppercase font-bold">Annuler</button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'sav' && <RepairTicketManagement />}
            
            {activeTab === 'staff' && (
                <div className="animate-in fade-in">
                    <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-tech font-bold uppercase text-white">Équipe</h2><button onClick={() => setEditingStaff({id: `new_${Date.now()}`, username: '', name: '', email: '', password: '123456', role: 'editor', phone: ''})} className="bg-white/10 text-white px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white hover:text-black rounded-sm"><UserPlus className="w-4 h-4" /> Ajouter</button></div>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold tracking-wider"><tr><th className="px-6 py-4">Nom</th><th className="px-6 py-4">Rôle</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-white/5 text-gray-300 text-sm">{staffMembers.map(s => (<tr key={s.id} className="hover:bg-white/5"><td className="px-6 py-4 font-bold text-white">{s.name}</td><td className="px-6 py-4"><span className="px-2 py-1 rounded bg-white/5 text-xs font-bold uppercase">{s.role}</span></td><td className="px-6 py-4 text-right"><button onClick={() => handleDeleteStaff(s.id)} className="text-red-500 hover:bg-white/10 p-2 rounded"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'clients' && (
                 <div className="animate-in fade-in">
                    <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Clients (CRM)</h2>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden shadow-2xl">
                         <table className="w-full text-left border-collapse">
                            <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold tracking-wider"><tr><th className="px-6 py-4">Nom</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4">Dépenses</th></tr></thead>
                            <tbody className="divide-y divide-white/5 text-gray-300 text-sm">{customers.map(c => (<tr key={c.id} className="hover:bg-white/5"><td className="px-6 py-4 font-bold text-white">{c.name}</td><td className="px-6 py-4">{c.email}<br/><span className="text-xs text-gray-500">{c.phone}</span></td><td className="px-6 py-4 font-mono text-xeption-gold">{(c.total_spent||0).toLocaleString()}</td></tr>))}</tbody>
                         </table>
                    </div>
                 </div>
            )}

            {activeTab === 'marketing' && (
                 <div className="animate-in fade-in">
                    <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Marketing Studio</h2>
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                        <textarea value={videoPrompt} onChange={e=>setVideoPrompt(e.target.value)} className="w-full bg-black/50 border border-white/10 p-4 text-white rounded-sm h-32 mb-4" placeholder="Prompt vidéo..." />
                        <button onClick={handleVideoGeneration} disabled={generatingVideo} className="bg-xeption-gold text-black px-6 py-2 font-bold uppercase rounded-sm flex items-center gap-2">{generatingVideo ? <Loader2 className="w-4 h-4 animate-spin"/> : <Film className="w-4 h-4"/>} Générer</button>
                        {generatedVideoUrl && <div className="mt-4"><video src={generatedVideoUrl} controls className="w-full rounded border border-white/10" /></div>}
                    </div>
                 </div>
            )}
             
            {activeTab === 'guide' && renderGuide()}
        </main>

        <BottomNav />

        {/* EDITOR OVERLAY (Full Screen) */}
        {editingProduct && (
            <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl overflow-y-auto animate-in slide-in-from-bottom-10">
                <div className="max-w-7xl mx-auto p-6 pb-20">
                     <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 sticky top-0 bg-transparent z-10 pt-4">
                         <h2 className="text-2xl font-bold font-tech text-white uppercase">{editingProduct.id.startsWith('new') ? 'Création' : 'Édition'}</h2>
                         <div className="flex gap-4">
                             <button onClick={() => setEditingProduct(null)} className="text-gray-400 font-bold text-sm uppercase">Annuler</button>
                             <button onClick={handleSaveProduct} className="bg-white text-black px-6 py-2 font-bold uppercase text-sm rounded-sm">Sauvegarder</button>
                         </div>
                     </div>
                     <form className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                             <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                                 <h3 className="text-white font-bold uppercase mb-4 text-sm">Base</h3>
                                 <input className="w-full bg-black border border-white/10 p-3 mb-3 text-white" placeholder="Nom" value={editingProduct.name} onChange={e=>setEditingProduct({...editingProduct, name: e.target.value})} />
                                 <div className="grid grid-cols-2 gap-3 mb-3">
                                     <input type="number" className="bg-black border border-white/10 p-3 text-white" placeholder="Prix" value={editingProduct.price} onChange={e=>setEditingProduct({...editingProduct, price: +e.target.value})} />
                                     <input type="number" className="bg-black border border-white/10 p-3 text-white" placeholder="Stock" value={editingProduct.stock} onChange={e=>setEditingProduct({...editingProduct, stock: +e.target.value})} />
                                 </div>
                                 <div className="mb-3">
                                     <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Type (Catégorie)</label>
                                     <select 
                                        className="w-full bg-black border border-white/10 p-3 text-white rounded-sm"
                                        value={editingProduct.category}
                                        onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                                     >
                                         <option value="">Sélectionner un type</option>
                                         {categories.map(c => (
                                             <option key={c.id} value={c.slug}>{c.name}</option>
                                         ))}
                                     </select>
                                 </div>
                                 <button type="button" onClick={handleAiGeneration} disabled={isGenerating} className="text-xs text-xeption-gold border border-xeption-gold/30 px-3 py-2 rounded uppercase font-bold flex items-center gap-2">{isGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} Auto-Fill IA</button>
                             </div>
                             <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                                <h3 className="text-white font-bold uppercase mb-4 text-sm">Media</h3>
                                <div className="aspect-video bg-black mb-3 flex items-center justify-center border border-white/10 relative">
                                    {editingProduct.image ? <img src={editingProduct.image} className="max-h-full"/> : <ImageIcon className="text-gray-700"/>}
                                    {uploadingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-8 h-8 text-xeption-gold animate-spin"/></div>}
                                </div>
                                <input type="file" ref={mainImageInputRef} className="hidden" onChange={handleMainImageUpload} />
                                <button type="button" onClick={() => mainImageInputRef.current?.click()} className="w-full border border-white/10 py-2 text-xs font-bold uppercase text-gray-400 hover:text-white">Uploader Image</button>
                             </div>
                         </div>
                         <div className="space-y-4">
                             <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                                 <h3 className="text-white font-bold uppercase mb-4 text-sm">Marketing</h3>
                                 <textarea className="w-full bg-black border border-white/10 p-3 h-32 text-white text-sm" placeholder="Description" value={editingProduct.description} onChange={e=>setEditingProduct({...editingProduct, description: e.target.value})} />
                             </div>
                         </div>
                     </form>
                </div>
            </div>
        )}
        
        {/* STAFF EDITOR MODAL */}
        {editingStaff && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                 <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-6 rounded-sm w-full max-w-md">
                     <h3 className="text-xl font-bold font-tech text-white uppercase mb-4">{editingStaff.id.startsWith('new') ? 'Ajouter' : 'Modifier'} Staff</h3>
                     <form onSubmit={handleSaveStaff} className="space-y-4">
                         <input className="w-full bg-black border border-white/10 p-3 text-white rounded-sm" placeholder="Nom" value={editingStaff.name} onChange={e=>setEditingStaff({...editingStaff, name: e.target.value})} />
                         <input className="w-full bg-black border border-white/10 p-3 text-white rounded-sm" placeholder="Password" value={editingStaff.password||''} onChange={e=>setEditingStaff({...editingStaff, password: e.target.value})} />
                         <select className="w-full bg-black border border-white/10 p-3 text-white rounded-sm" value={editingStaff.role} onChange={e=>setEditingStaff({...editingStaff, role: e.target.value as any})}>
                             <option value="editor">Éditeur</option><option value="manager">Manager</option><option value="admin">Admin</option>
                         </select>
                         <div className="flex justify-end gap-3 pt-2">
                             <button type="button" onClick={()=>setEditingStaff(null)} className="text-gray-500 text-xs font-bold uppercase">Annuler</button>
                             <button type="submit" className="bg-xeption-gold text-black px-4 py-2 font-bold uppercase text-xs rounded-sm">Sauvegarder</button>
                         </div>
                     </form>
                 </div>
             </div>
        )}
    </div>
  );
};

export default AdminPanel;
