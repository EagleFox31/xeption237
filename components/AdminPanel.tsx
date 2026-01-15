
import React, { useState, useEffect, useRef } from 'react';
import { Package, TrendingUp, Users, AlertCircle, Edit, Trash2, Plus, Search, Tag, Check, X, Image as ImageIcon, Box, ShoppingBag, Truck, Store, Video, UserPlus, Key, Mail, Phone, MapPin, ArrowLeft, Sparkles, Loader2, List, Minus, Upload, Film, Play, Download, Clapperboard, Printer, CreditCard, Calculator, Wrench, ShieldCheck, ArrowRight, XCircle, RotateCcw } from 'lucide-react';
import { Product, Order, Staff, Customer, CartItem } from '../types';
import { supabase } from '../services/supabaseClient';
import { generateProductDetails, generateMarketingVideo } from '../services/geminiService';
import { uploadImageToCloudinary, uploadVideoToCloudinary } from '../services/uploadService';
import { generateInvoiceHTML } from '../utils/invoiceGenerator';
import RepairTicketManagement from './RepairTicketManagement';

interface AdminPanelProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ products, onUpdateProducts }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'orders' | 'staff' | 'clients' | 'marketing' | 'sav'>('dashboard');
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

  // POS State
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCustomer, setPosCustomer] = useState({ name: '', phone: '', email: '' });
  const [posPaymentMethod, setPosPaymentMethod] = useState<'CASH' | 'OM' | 'MOMO'>('CASH');

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Video Generation State
  const [videoPrompt, setVideoPrompt] = useState("Cinematic product shot of the Dell XPS 14 9440 floating in a dark void. Elegant gold neon lighting highlights the aluminum edges and the keyboard. Background features subtle futuristic HUD elements and floating golden particles. High contrast, 4k resolution, sleek, premium tech advertisement style, slow camera pan, dark atmosphere.");
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Upload States
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Refs for file inputs
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch data on tab change & Initialize Auth
  useEffect(() => {
      const initData = async () => {
          // On vérifie simplement si une session existe. 
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
              console.warn("AdminPanel: Aucune session active. Les actions RLS risquent d'échouer.");
          }

          if (activeTab === 'orders' || activeTab === 'dashboard') {
              fetchOrders();
          }
          if (activeTab === 'staff') {
              fetchStaff();
          }
          if (activeTab === 'clients') {
              fetchCustomers();
          }
      };

      initData();
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

  // --- ORDER WORKFLOW LOGIC ---

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } else {
        alert("Erreur MAJ statut: " + error.message);
    }
  };

  // Logique d'annulation avec remise en stock
  const handleCancelOrder = async (order: Order) => {
      if (!confirm(`Annuler la commande #${order.id} et remettre les articles en stock ?`)) return;

      try {
          // 1. Remettre le stock
          for (const item of order.items) {
              // Récupérer le stock actuel pour être sûr
              const { data: productData } = await supabase.from('products').select('stock').eq('id', item.id).single();
              
              if (productData) {
                  const newStock = productData.stock + item.quantity;
                  await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                  
                  // Update local products state if needed
                  onUpdateProducts(products.map(p => p.id === item.id ? { ...p, stock: newStock } : p));
              }
          }

          // 2. Marquer la commande comme annulée
          await updateOrderStatus(order.id, 'cancelled');
          alert("Commande annulée et stock restauré.");

      } catch (err: any) {
          alert("Erreur lors de l'annulation : " + err.message);
      }
  };


  // --- POS Logic --- (Code preserved same as previous)
  const addToPosCart = (product: Product) => {
    setPosCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromPosCart = (id: string) => {
    setPosCart(prev => prev.filter(item => item.id !== id));
  };

  const updatePosQuantity = (id: string, delta: number) => {
      setPosCart(prev => prev.map(item => {
          if (item.id === id) {
              const newQty = Math.max(1, item.quantity + delta);
              return { ...item, quantity: newQty };
          }
          return item;
      }));
  };

  const handlePosSubmit = async () => {
      if (posCart.length === 0) return alert("Panier vide");
      if (!posCustomer.name) return alert("Nom du client requis");

      if (!confirm("Valider la vente et imprimer la facture ?")) return;

      const total = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const newOrderId = `POS-${Date.now().toString().slice(-6)}`;
      const dbDate = new Date().toISOString();

      try {
          const { error: orderError } = await supabase.from('orders').insert([{
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
              date: dbDate
          }]);

          if (orderError) throw orderError;

          for (const item of posCart) {
              const product = products.find(p => p.id === item.id);
              if (product) {
                  const newStock = Math.max(0, product.stock - item.quantity);
                  await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                  onUpdateProducts(products.map(p => p.id === item.id ? { ...p, stock: newStock } : p));
              }
          }

           if (posCustomer.phone || posCustomer.email) {
            if (posCustomer.email) {
                 const { data: existing } = await supabase.from('customers').select('*').eq('email', posCustomer.email).single();
                 if (existing) {
                      await supabase.from('customers').update({ 
                          total_orders: (existing.total_orders || 0) + 1,
                          total_spent: (existing.total_spent || 0) + total,
                      }).eq('email', posCustomer.email);
                 } else {
                      await supabase.from('customers').insert([{
                          id: crypto.randomUUID(),
                          name: posCustomer.name,
                          email: posCustomer.email,
                          phone: posCustomer.phone,
                          city: 'Yaoundé',
                          total_orders: 1,
                          total_spent: total
                      }]);
                 }
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
              date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          };

          const html = generateInvoiceHTML(invoiceData as any);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
              printWindow.document.write(html);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => {
                  printWindow.print();
                  printWindow.close();
              }, 500);
          }

          setPosCart([]);
          setPosCustomer({ name: '', phone: '', email: '' });
          alert("Vente enregistrée avec succès !");

      } catch (err: any) {
          alert("Erreur POS: " + err.message);
      }
  };

  // --- Product & Staff Handlers (Same as before) ---
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

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !editingProduct) return;
      const file = e.target.files[0];
      setUploadingImage(true);
      try {
          const url = await uploadImageToCloudinary(file);
          setEditingProduct({ ...editingProduct, image: url });
      } catch (error: any) {
          alert(error.message);
      } finally {
          setUploadingImage(false);
      }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !editingProduct) return;
      setUploadingGallery(true);
      const newImages = [...(editingProduct.images || [])];
      try {
          const uploadPromises = Array.from(e.target.files).map((file) => uploadImageToCloudinary(file as File));
          const urls = await Promise.all(uploadPromises);
          setEditingProduct({ ...editingProduct, images: [...newImages, ...urls] });
      } catch (error: any) {
          alert("Erreur Upload: " + error.message);
      } finally {
          setUploadingGallery(false);
      }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !editingProduct) return;
      const file = e.target.files[0];
      setUploadingVideo(true);
      try {
          const url = await uploadVideoToCloudinary(file);
          setEditingProduct({ ...editingProduct, video: url });
      } catch (error: any) {
          alert(error.message);
      } finally {
          setUploadingVideo(false);
      }
  };

  const handleAiGeneration = async () => {
    if (!editingProduct?.name) {
        alert("Entrez d'abord un nom de produit.");
        return;
    }
    setIsGenerating(true);
    try {
        const details = await generateProductDetails(editingProduct.name, editingProduct.category);
        setEditingProduct(prev => {
            if (!prev) return null;
            return {
                ...prev,
                description: details.description || prev.description,
                reviewShort: details.reviewShort || prev.reviewShort,
                pros: (details.pros && details.pros.length > 0) ? details.pros : (prev.pros || []),
                cons: (details.cons && details.cons.length > 0) ? details.cons : (prev.cons || []),
                specs: (details.specs && details.specs.length > 0) ? details.specs : (prev.specs || [])
            };
        });
    } catch (err: any) {
        alert(err.message);
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleVideoGeneration = async () => {
      if (!videoPrompt) return;
      setGeneratingVideo(true);
      setGeneratedVideoUrl(null);
      try {
          const url = await generateMarketingVideo(videoPrompt);
          if (url) {
              setGeneratedVideoUrl(url);
          } else {
              alert("La génération a échoué. Réessayez.");
          }
      } catch (err: any) {
          alert("Erreur Veo: " + err.message);
      } finally {
          setGeneratingVideo(false);
      }
  };

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
      const { username, ...cleanData } = editingStaff as any;
      const staffData = {
          ...cleanData,
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

  // Helper functions for array fields in product editor
  const handleRemoveImage = (index: number) => {
      if (!editingProduct) return;
      const currentImages = [...(editingProduct.images || [])];
      currentImages.splice(index, 1);
      setEditingProduct({ ...editingProduct, images: currentImages });
  };
  const handleAddSpec = () => {
      if (!editingProduct) return;
      const current = editingProduct.specs || [];
      setEditingProduct({ ...editingProduct, specs: [...current, { label: '', value: '' }] });
  };
  const handleSpecChange = (index: number, field: 'label'|'value', txt: string) => {
      if (!editingProduct) return;
      const current = [...(editingProduct.specs || [])];
      current[index] = { ...current[index], [field]: txt };
      setEditingProduct({ ...editingProduct, specs: current });
  };
  const handleRemoveSpec = (index: number) => {
      if (!editingProduct) return;
      const current = [...(editingProduct.specs || [])];
      current.splice(index, 1);
      setEditingProduct({ ...editingProduct, specs: current });
  };
  const handleArrayFieldChange = (field: 'pros'|'cons', index: number, value: string) => {
      if (!editingProduct) return;
      const current = [...(editingProduct[field] || [])];
      current[index] = value;
      setEditingProduct({ ...editingProduct, [field]: current });
  };
  const handleAddArrayField = (field: 'pros'|'cons') => {
       if (!editingProduct) return;
       const current = editingProduct[field] || [];
       setEditingProduct({ ...editingProduct, [field]: [...current, ''] });
  };
  const handleRemoveArrayField = (field: 'pros'|'cons', index: number) => {
      if (!editingProduct) return;
      const current = [...(editingProduct[field] || [])];
      current.splice(index, 1);
      setEditingProduct({ ...editingProduct, [field]: current });
  };

  const getStatusBadge = (status: Order['status']) => {
      switch(status) {
          case 'pending': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
          case 'confirmed': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
          case 'shipped': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
          case 'ready': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
          case 'delivered': return 'bg-green-500/10 text-green-400 border-green-500/30';
          case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/30';
          default: return 'bg-gray-500/10 text-gray-400';
      }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch(status) {
        case 'pending': return 'En Attente';
        case 'confirmed': return 'Confirmée';
        case 'shipped': return 'En Route';
        case 'ready': return 'Dispo Boutique';
        case 'delivered': return 'Terminée';
        case 'cancelled': return 'Annulée';
        default: return status;
    }
  };

  // --- RENDER FUNCTIONS (Dashboard, POS, Inventory etc. same structure, just Orders changed) ---
  
  const renderOrders = () => (
    <div className="animate-in fade-in pb-20">
        <h3 className="text-xl text-white font-tech font-bold uppercase mb-6 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-xeption-gold" />
            Gestion des Commandes
        </h3>
        {loadingOrders ? (
             <div className="flex justify-center py-20">
                 <div className="w-8 h-8 border-2 border-xeption-gold border-t-transparent rounded-full animate-spin"></div>
             </div>
        ) : (
            <div className="bg-[#18181b] border border-white/10 rounded-sm overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-4">ID / Info</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Status & Type</th>
                            <th className="px-6 py-4">Montant</th>
                            <th className="px-6 py-4 text-right">Workflow</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                        {orders.map(order => (
                            <tr key={order.id} className="hover:bg-white/5 transition-colors group bg-[#18181b]">
                                <td className="px-6 py-4">
                                    <span className="font-bold text-white block text-xs font-mono mb-1">#{order.id}</span>
                                    <span className="text-gray-500 text-[10px] block">{order.date}</span>
                                    <div className="mt-1 flex gap-1">
                                        <span className="text-[10px] bg-white/5 border border-white/10 px-1 rounded">{order.items.length} article(s)</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="block text-white font-bold text-xs">{order.customerName}</span>
                                    <span className="text-xs text-gray-400 block font-mono">{order.customerPhone}</span>
                                    <span className="text-[10px] text-gray-500 block italic">{order.customerCity}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(order.status)}`}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold">
                                            {order.deliveryMode === 'pickup' ? <Store className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                                            {order.deliveryMode === 'pickup' ? 'Retrait' : 'Livraison'}
                                        </div>
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
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end gap-2">
                                        
                                        {/* ACTION 1: PENDING -> CONFIRMED */}
                                        {order.status === 'pending' && (
                                            <>
                                                <button 
                                                    onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                                    className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-full justify-center transition-all"
                                                >
                                                    <Check className="w-3 h-3" /> Valider
                                                </button>
                                                <button 
                                                    onClick={() => handleCancelOrder(order)}
                                                    className="border border-red-500/30 text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest w-full transition-all"
                                                >
                                                    Annuler
                                                </button>
                                            </>
                                        )}

                                        {/* ACTION 2: CONFIRMED -> SHIPPED / READY */}
                                        {order.status === 'confirmed' && (
                                            <>
                                                {order.deliveryMode === 'delivery' ? (
                                                    <button 
                                                        onClick={() => updateOrderStatus(order.id, 'shipped')}
                                                        className="bg-yellow-600 hover:bg-yellow-500 text-black px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-full justify-center transition-all"
                                                    >
                                                        <Truck className="w-3 h-3" /> Expédier
                                                    </button>
                                                ) : (
                                                     <button 
                                                        onClick={() => updateOrderStatus(order.id, 'ready')}
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-full justify-center transition-all"
                                                    >
                                                        <Box className="w-3 h-3" /> Prêt Boutique
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleCancelOrder(order)}
                                                    className="border border-red-500/30 text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest w-full transition-all"
                                                >
                                                    Annuler
                                                </button>
                                            </>
                                        )}

                                        {/* ACTION 3: IN TRANSIT -> DELIVERED */}
                                        {(order.status === 'shipped' || order.status === 'ready') && (
                                            <button 
                                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-full justify-center transition-all shadow-lg"
                                            >
                                                <Check className="w-3 h-3" /> {order.deliveryMode === 'delivery' ? 'Livré' : 'Récupéré'}
                                            </button>
                                        )}

                                        {/* IF STUCK IN READY/SHIPPED TOO LONG */}
                                        {(order.status === 'ready' || order.status === 'shipped') && (
                                             <button 
                                                onClick={() => handleCancelOrder(order)}
                                                className="text-red-500 text-[10px] hover:underline flex items-center gap-1"
                                                title="Client ne vient pas ? Remettre en stock."
                                            >
                                                <RotateCcw className="w-3 h-3" /> Restock
                                            </button>
                                        )}

                                        {/* DONE STATE */}
                                        {order.status === 'delivered' && (
                                            <span className="text-green-500 text-[10px] font-bold uppercase flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Terminé
                                            </span>
                                        )}
                                        {order.status === 'cancelled' && (
                                            <span className="text-red-500 text-[10px] font-bold uppercase flex items-center gap-1">
                                                <XCircle className="w-3 h-3" /> Annulé
                                            </span>
                                        )}

                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
  );

  // ... (Keep existing Dashboard, POS, Inventory, etc. render functions, and main return) ...

  const renderDashboard = () => (
    <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 animate-in slide-in-from-bottom-5">
            {[
                { label: 'Revenu Total', value: orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.total, 0).toLocaleString(), sub: 'FCFA (Encaissé)', icon: TrendingUp, color: 'text-green-500' },
                { label: 'Commandes', value: orders.filter(o => o.status === 'pending').length.toString(), sub: 'En attente', icon: Package, color: 'text-xeption-gold' },
                { label: 'Staff', value: staffMembers.length > 0 ? staffMembers.length.toString() : '-', sub: 'Actifs', icon: Users, color: 'text-blue-500' },
                { label: 'Clients', value: customers.length > 0 ? customers.length.toString() : '-', sub: 'Dans le CRM', icon: Users, color: 'text-purple-500' },
            ].map((stat, i) => (
                <div key={i} className="bg-[#18181b] border border-white/5 p-6 relative overflow-hidden group hover:border-white/20 transition-all rounded-sm shadow-lg">
                    <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/3 -translate-y-1/3">
                        <stat.icon className={`w-32 h-32 ${stat.color}`} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">{stat.label}</p>
                        <h3 className="text-4xl font-bold text-white font-tech">{stat.value} <span className="text-sm text-gray-600">{stat.sub}</span></h3>
                    </div>
                </div>
            ))}
        </div>
        
        {/* Rest of dashboard remains same */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#18181b] border border-white/10 p-6 rounded-sm shadow-xl">
                <h3 className="text-white font-tech uppercase font-bold mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-xeption-red" /> Alertes Rupture
                </h3>
                <div className="space-y-3">
                    {products.filter(p => p.stock < 5).length === 0 ? (
                        <p className="text-gray-500 italic">Tout est sous contrôle.</p>
                    ) : (
                        products.filter(p => p.stock < 5).map(p => (
                            <div key={p.id} className="flex justify-between items-center bg-black/40 p-3 rounded hover:bg-black/60 transition-colors border border-white/5">
                                <span className="text-gray-200 text-sm">{p.name}</span>
                                <span className="text-xeption-red font-bold text-xs px-2 py-1 bg-xeption-red/10 rounded">Reste: {p.stock}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <div className="bg-[#18181b] border border-white/10 p-6 rounded-sm shadow-xl">
                <h3 className="text-white font-tech uppercase font-bold mb-4 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-xeption-gold" /> Dernières Commandes
                </h3>
                <div className="space-y-3">
                     {orders.slice(0,5).map((o) => (
                        <div key={o.id} className="flex items-center justify-between bg-black/40 p-3 rounded hover:bg-black/60 transition-colors border border-white/5">
                            <div>
                                <span className="text-gray-200 text-sm block font-bold">{o.customerName}</span>
                                <span className={`text-[10px] font-bold uppercase ${o.status === 'delivered' ? 'text-green-500' : 'text-gray-500'}`}>{o.status}</span>
                            </div>
                            <span className="text-white font-mono text-sm">{o.total.toLocaleString()} FCFA</span>
                        </div>
                     ))}
                </div>
            </div>
        </div>
    </>
  );

  // Re-use logic for POS, Inventory, Clients, Staff, Marketing...
  // The XML replacement will replace the entire file, so I'm including the full structure 
  // but focusing on the updated Order Logic and RenderOrders.

  // ... (Full file content structure to be safe) ...
  
  // (POS Render)
  const renderPOS = () => {
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()));
    const posTotal = posCart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
      <div className="animate-in fade-in h-[calc(100vh-200px)] grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#18181b] border border-white/10 rounded-sm shadow-xl flex flex-col overflow-hidden">
             <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
                 <h3 className="text-white font-bold uppercase text-sm flex items-center gap-2">
                    <Box className="w-4 h-4 text-blue-400" /> Catalogue Boutique
                 </h3>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input 
                        type="text" 
                        value={posSearch}
                        onChange={(e) => setPosSearch(e.target.value)}
                        placeholder="Scanner ou chercher..." 
                        className="bg-black/50 border border-white/10 pl-10 pr-4 py-2 text-sm text-white focus:border-xeption-gold outline-none rounded-sm w-64"
                        autoFocus
                    />
                 </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
                 {filteredProducts.map(p => (
                     <button 
                        key={p.id}
                        onClick={() => addToPosCart(p)}
                        className="bg-black/40 border border-white/5 p-3 rounded-sm hover:border-xeption-gold/50 hover:bg-white/5 transition-all text-left group flex flex-col h-full"
                        disabled={p.stock <= 0}
                     >
                        <div className="aspect-square bg-black rounded-sm mb-2 overflow-hidden relative">
                             <img src={p.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                             {p.stock <= 0 && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs text-red-500 font-bold uppercase">Rupture</div>}
                             <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white font-mono font-bold">
                                {p.price.toLocaleString()}
                             </div>
                        </div>
                        <h4 className="text-xs font-bold text-gray-200 line-clamp-2 mb-1">{p.name}</h4>
                        <span className="text-[10px] text-gray-500 mt-auto">Stock: {p.stock}</span>
                     </button>
                 ))}
             </div>
          </div>
          <div className="bg-[#18181b] border border-white/10 rounded-sm shadow-xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-black/40">
                  <h3 className="text-white font-bold uppercase text-sm flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-xeption-gold" /> Panier Comptoir
                 </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {posCart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
                          <Calculator className="w-12 h-12" />
                          <p className="text-xs uppercase font-bold">En attente d'articles...</p>
                      </div>
                  ) : (
                      posCart.map(item => (
                          <div key={item.id} className="flex justify-between items-center bg-black/40 p-3 rounded-sm border border-white/5">
                              <div className="flex-1">
                                  <div className="text-xs font-bold text-white line-clamp-1">{item.name}</div>
                                  <div className="text-[10px] text-gray-500">{item.price.toLocaleString()} x {item.quantity}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                  <div className="flex items-center bg-black border border-white/10 rounded">
                                      <button onClick={() => updatePosQuantity(item.id, -1)} className="p-1 hover:text-white text-gray-500"><Minus className="w-3 h-3"/></button>
                                      <span className="w-6 text-center text-xs font-mono">{item.quantity}</span>
                                      <button onClick={() => updatePosQuantity(item.id, 1)} className="p-1 hover:text-white text-gray-500"><Plus className="w-3 h-3"/></button>
                                  </div>
                                  <button onClick={() => removeFromPosCart(item.id)} className="text-red-500/50 hover:text-red-500"><X className="w-4 h-4"/></button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
              <div className="p-4 bg-black/20 border-t border-white/10 space-y-4">
                  <div className="space-y-2">
                      <input type="text" placeholder="Nom du Client *" className="w-full bg-black/50 border border-white/10 px-3 py-2 text-xs text-white focus:border-xeption-gold outline-none rounded-sm" value={posCustomer.name} onChange={e => setPosCustomer({...posCustomer, name: e.target.value})} />
                       <input type="text" placeholder="Tél / Email (Optionnel)" className="w-full bg-black/50 border border-white/10 px-3 py-2 text-xs text-white focus:border-xeption-gold outline-none rounded-sm" value={posCustomer.phone} onChange={e => setPosCustomer({...posCustomer, phone: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                      {['CASH', 'OM', 'MOMO'].map(m => (
                          <button key={m} onClick={() => setPosPaymentMethod(m as any)} className={`py-2 text-[10px] font-bold uppercase border rounded-sm transition-all ${posPaymentMethod === m ? 'bg-xeption-gold text-black border-xeption-gold' : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30'}`}>{m}</button>
                      ))}
                  </div>
                  <div className="pt-2 border-t border-white/10">
                      <div className="flex justify-between items-end mb-4"><span className="text-gray-400 text-xs font-bold uppercase">Total à Payer</span><span className="text-2xl font-bold font-mono text-white">{posTotal.toLocaleString()} <span className="text-sm text-xeption-gold">FCFA</span></span></div>
                      <button onClick={handlePosSubmit} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold uppercase py-4 rounded-sm shadow-lg flex items-center justify-center gap-2 transition-all"><Printer className="w-5 h-5" /> Valider & Imprimer</button>
                  </div>
              </div>
          </div>
      </div>
    );
  };

  const renderInventory = () => (
     /* ... Inventory Code (Same as provided in previous prompt but kept for context) ... */
     <div className="animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input type="text" placeholder="Chercher un produit..." className="bg-[#18181b] border border-white/10 pl-10 pr-4 py-2 text-sm text-white focus:border-xeption-gold outline-none rounded-sm w-64 shadow-md" />
            </div>
            <button onClick={() => setEditingProduct({id: `new_${Date.now()}`, name: '', description: '', price: 0, category: 'phone', image: 'https://via.placeholder.com/400', images: [], video: '', stock: 0, isPromo: false, specs: [], pros: [], cons: [], warrantyMonths: 0})} className="bg-xeption-gold text-black px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-colors shadow-lg"><Plus className="w-4 h-4" /> Nouveau Produit</button>
        </div>
        <div className="bg-[#18181b] border border-white/10 rounded-sm overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
                <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold tracking-wider">
                    <tr><th className="px-6 py-4">Image</th><th className="px-6 py-4">Produit</th><th className="px-6 py-4">Catégorie</th><th className="px-6 py-4">Prix / Promo</th><th className="px-6 py-4">Stock</th><th className="px-6 py-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                    {products.map(product => (
                        <tr key={product.id} className="hover:bg-white/5 transition-colors group bg-[#18181b]">
                            <td className="px-6 py-4"><div className="w-12 h-12 bg-black rounded p-1 overflow-hidden relative border border-white/10"><img src={product.image} alt="" className="w-full h-full object-contain" /></div></td>
                            <td className="px-6 py-4"><span className="font-bold text-white block">{product.name}</span>{product.isPromo && <span className="text-[10px] text-xeption-red bg-xeption-red/10 px-1 rounded uppercase font-bold">Promo</span>}</td>
                            <td className="px-6 py-4 capitalize text-gray-500">{product.category}</td>
                            <td className="px-6 py-4"><div className="flex flex-col"><span className="font-mono text-white">{product.price.toLocaleString()}</span>{product.oldPrice && <span className="font-mono text-gray-600 line-through text-xs">{product.oldPrice.toLocaleString()}</span>}</div></td>
                            <td className="px-6 py-4"><div className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${product.stock > 5 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}><Box className="w-3 h-3 mr-1" />{product.stock}</div></td>
                            <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingProduct(product)} className="p-2 hover:bg-white/10 rounded text-xeption-gold transition-colors" title="Modifier"><Edit className="w-4 h-4" /></button><button onClick={() => handleDeleteProduct(product.id)} className="p-2 hover:bg-red-500/20 rounded text-red-500 transition-colors" title="Supprimer"><Trash2 className="w-4 h-4" /></button></div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderClients = () => (
      <div className="animate-in fade-in">
        <h3 className="text-xl text-white font-tech font-bold uppercase mb-6 flex items-center gap-2"><Users className="w-5 h-5 text-purple-500" /> Carnet d'Adresses (CRM)</h3>
         {loadingCustomers ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-xeption-gold border-t-transparent rounded-full animate-spin"></div></div> : (
            <div className="bg-[#18181b] border border-white/10 rounded-sm overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold tracking-wider">
                        <tr><th className="px-6 py-4">Client</th><th className="px-6 py-4">Contacts</th><th className="px-6 py-4">Ville</th><th className="px-6 py-4">Commandes</th><th className="px-6 py-4 text-right">Total Dépensé</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                        {customers.map(client => (
                            <tr key={client.id} className="hover:bg-white/5 transition-colors group bg-[#18181b]">
                                <td className="px-6 py-4"><span className="font-bold text-white block">{client.name}</span><span className="text-xs text-gray-500">Depuis le {new Date(client.created_at || '').toLocaleDateString()}</span></td>
                                <td className="px-6 py-4"><div className="flex flex-col gap-1"><div className="flex items-center gap-2 text-xs"><Mail className="w-3 h-3 text-gray-500" /><span className="text-white hover:text-xeption-gold cursor-pointer">{client.email}</span></div>{client.phone && (<div className="flex items-center gap-2 text-xs"><Phone className="w-3 h-3 text-gray-500" /><span className="font-mono">{client.phone}</span></div>)}</div></td>
                                <td className="px-6 py-4"><div className="flex items-center gap-2 text-xs text-gray-400"><MapPin className="w-3 h-3" />{client.city || '-'}</div></td>
                                <td className="px-6 py-4"><span className="px-2 py-1 bg-white/5 rounded text-xs font-bold">{client.total_orders}</span></td>
                                <td className="px-6 py-4 text-right"><span className="font-mono text-xeption-gold font-bold">{(client.total_spent || 0).toLocaleString()} FCFA</span></td>
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
            <button onClick={() => setEditingStaff({id: `new_${Date.now()}`, username: '', name: '', email: '', password: '123456', role: 'editor', phone: ''})} className="bg-white/10 text-white px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white hover:text-black transition-colors"><UserPlus className="w-4 h-4" /> Ajouter Membre</button>
        </div>
        <div className="bg-[#18181b] border border-white/10 rounded-sm overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
                <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold tracking-wider">
                    <tr><th className="px-6 py-4">Nom (Login)</th><th className="px-6 py-4">Rôle</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                    {staffMembers.map(staff => (
                        <tr key={staff.id} className="hover:bg-white/5 transition-colors bg-[#18181b]">
                            <td className="px-6 py-4 font-bold text-white">{staff.name}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${staff.role === 'admin' ? 'bg-xeption-red/20 text-xeption-red' : staff.role === 'manager' ? 'bg-xeption-gold/20 text-xeption-gold' : 'bg-blue-500/20 text-blue-500'}`}>{staff.role}</span></td>
                            <td className="px-6 py-4 font-mono text-xs text-gray-500">{staff.email || staff.phone || '-'}</td>
                            <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => setEditingStaff(staff)} className="p-2 hover:bg-white/10 rounded text-xeption-gold"><Edit className="w-4 h-4" /></button><button onClick={() => handleDeleteStaff(staff.id)} className="p-2 hover:bg-red-500/20 rounded text-red-500"><Trash2 className="w-4 h-4" /></button></div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderMarketing = () => (
      <div className="animate-in fade-in">
        <h3 className="text-xl text-white font-tech font-bold uppercase mb-6 flex items-center gap-2"><Clapperboard className="w-5 h-5 text-xeption-gold" /> Studio Vidéo (Veo Beta)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[#18181b] border border-white/10 p-6 rounded-sm shadow-xl">
                 <h4 className="text-gray-300 font-bold uppercase text-xs mb-4">Prompt de génération</h4>
                 <textarea value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} className="w-full h-48 bg-[#09090b] border border-white/10 text-white p-4 focus:border-xeption-gold focus:bg-black outline-none resize-none leading-relaxed text-sm mb-4" placeholder="Décrivez votre vidéo ici..." />
                 <div className="flex justify-between items-center"><span className="text-xs text-gray-500 italic">Modèle: veo-3.1-fast-generate-preview (1080p)</span><button onClick={handleVideoGeneration} disabled={generatingVideo || !videoPrompt} className="bg-xeption-gold text-black px-6 py-3 font-tech font-bold uppercase tracking-wider hover:bg-white transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">{generatingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}{generatingVideo ? 'Génération...' : 'Générer Vidéo'}</button></div>
            </div>
             <div className="bg-[#18181b] border border-white/10 p-6 rounded-sm shadow-xl flex flex-col items-center justify-center min-h-[300px]">
                {generatingVideo ? (<div className="text-center"><div className="w-16 h-16 border-4 border-xeption-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-xeption-gold font-tech uppercase tracking-widest animate-pulse">Création du chef d'œuvre...</p><p className="text-gray-500 text-xs mt-2">Cela peut prendre quelques secondes.</p></div>) : generatedVideoUrl ? (<div className="w-full"><div className="aspect-video bg-black rounded border border-white/10 overflow-hidden mb-4 relative group"><video src={generatedVideoUrl} controls className="w-full h-full object-cover" /></div><div className="flex justify-center"><a href={generatedVideoUrl} download="xeption_promo.mp4" target="_blank" rel="noreferrer" className="text-xeption-gold hover:text-white font-bold uppercase text-xs tracking-widest flex items-center gap-2 border border-xeption-gold/30 hover:bg-xeption-gold hover:text-black px-4 py-2 transition-colors rounded-sm"><Download className="w-4 h-4" /> Télécharger MP4</a></div></div>) : (<div className="text-center text-gray-600"><Clapperboard className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="uppercase font-bold text-xs tracking-widest">Aucune vidéo générée</p></div>)}
            </div>
        </div>
      </div>
  );

  // EDITOR CODE (Editing Product View)
  if (editingProduct) {
      return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen animate-in slide-in-from-right duration-300 relative z-10">
             <div className="fixed inset-0 bg-[#09090b] z-[-1]" />
             <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6 sticky top-20 bg-[#09090b] z-20 pt-4 shadow-xl">
                <div className="flex items-center gap-4">
                    <button onClick={() => setEditingProduct(null)} className="p-2 border border-white/10 rounded-full hover:bg-white hover:text-black transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                    <div><h2 className="text-2xl font-bold text-white font-tech uppercase">{editingProduct.id.startsWith('new_') ? 'Nouveau Produit' : 'Édition Produit'}</h2><p className="text-gray-400 text-xs">Configurez les détails, specs et médias.</p></div>
                </div>
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-3 text-gray-400 hover:text-white transition-colors font-bold uppercase text-xs tracking-widest">Annuler</button>
                    <button onClick={handleSaveProduct} className="px-8 py-3 bg-white text-black font-tech font-bold uppercase tracking-wider hover:bg-xeption-gold transition-colors shadow-lg flex items-center gap-2"><Check className="w-4 h-4" /> Sauvegarder</button>
                </div>
             </div>
             <form className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#18181b] border border-white/10 p-6 rounded-sm shadow-xl">
                        <h3 className="text-white font-bold uppercase text-sm mb-6 flex items-center gap-2"><Box className="w-4 h-4 text-xeption-gold" /> Informations Générales</h3>
                        <div className="space-y-6">
                            <div><label className="block text-xs text-gray-400 uppercase font-bold mb-2">Nom du produit</label><div className="flex gap-2"><input type="text" required value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="flex-1 bg-[#09090b] border border-white/10 text-white p-3 focus:border-xeption-gold focus:bg-black outline-none text-lg font-bold placeholder-gray-700" placeholder="Ex: Samsung Galaxy S24 Ultra" /><button type="button" onClick={handleAiGeneration} disabled={isGenerating || !editingProduct.name} className="px-4 bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all flex items-center gap-2 font-bold uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed" title="Remplir auto avec IA">{isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}<span className="hidden sm:inline">{isGenerating ? 'Génération...' : 'Auto-Fill IA'}</span></button></div></div>
                            <div className="grid grid-cols-2 gap-6"><div><label className="block text-xs text-gray-400 uppercase font-bold mb-2">Prix (FCFA)</label><input type="number" required value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseInt(e.target.value) || 0})} className="w-full bg-[#09090b] border border-white/10 text-white p-3 focus:border-xeption-gold focus:bg-black outline-none font-mono text-lg" /></div><div><label className="block text-xs text-gray-400 uppercase font-bold mb-2">Stock</label><input type="number" required value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})} className="w-full bg-[#09090b] border border-white/10 text-white p-3 focus:border-xeption-gold focus:bg-black outline-none font-mono text-lg" /></div></div>
                            <div><label className="block text-xs text-gray-400 uppercase font-bold mb-2">Catégorie</label><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{['phone', 'computer', 'accessory', 'consumable'].map(cat => (<button key={cat} type="button" onClick={() => setEditingProduct({...editingProduct, category: cat as any})} className={`py-2 px-3 text-xs font-bold uppercase tracking-wider border transition-all ${editingProduct.category === cat ? 'bg-white text-black border-white' : 'bg-[#27272a] text-gray-400 border-white/5 hover:border-white/30 hover:text-white'}`}>{cat}</button>))}</div></div>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-sm"><label className="block text-xs text-xeption-gold uppercase font-bold mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Garantie SAV (Mois)</label><input type="number" min="0" value={editingProduct.warrantyMonths || 0} onChange={e => setEditingProduct({...editingProduct, warrantyMonths: parseInt(e.target.value) || 0})} className="w-full bg-[#09090b] border border-white/10 text-white p-3 focus:border-xeption-gold focus:bg-black outline-none font-mono text-lg" placeholder="0 pour pas de garantie" /><p className="text-[10px] text-gray-500 mt-2">Définit la durée pendant laquelle un client peut ouvrir un ticket SAV valide.</p></div>
                        </div>
                    </div>
                    {/* ... (Description, Specs, Media sections same as provided) ... */}
                    <div className="bg-[#18181b] border border-white/10 p-6 rounded-sm shadow-xl"><h3 className="text-white font-bold uppercase text-sm mb-6 flex items-center gap-2"><Tag className="w-4 h-4 text-blue-400" /> Marketing & Contenu</h3><div className="space-y-6"><div><label className="block text-xs text-gray-400 uppercase font-bold mb-2">Description "Tape à l'œil"</label><textarea value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full bg-[#09090b] border border-white/10 text-white p-4 focus:border-xeption-gold focus:bg-black outline-none h-32 resize-none leading-relaxed" placeholder="Une description qui donne envie d'acheter..." /></div><div><label className="block text-xs text-gray-400 uppercase font-bold mb-2">Verdict Court (Review Short)</label><input type="text" value={editingProduct.reviewShort || ''} onChange={e => setEditingProduct({...editingProduct, reviewShort: e.target.value})} className="w-full bg-[#09090b] border border-white/10 text-white p-3 focus:border-xeption-gold focus:bg-black outline-none italic text-gray-300" placeholder="Ex: Le meilleur rapport qualité/prix de l'année." /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-xs text-green-500 uppercase font-bold mb-2 flex items-center gap-2"><Check className="w-3 h-3" /> On Valide (Pros)</label><div className="space-y-2">{(editingProduct.pros || []).map((pro, idx) => (<div key={idx} className="flex gap-2"><input type="text" value={pro} onChange={(e) => handleArrayFieldChange('pros', idx, e.target.value)} className="flex-1 bg-[#09090b] border border-white/10 text-white p-2 text-xs focus:border-green-500 outline-none" /><button type="button" onClick={() => handleRemoveArrayField('pros', idx)} className="text-red-500 p-1 hover:bg-white/5"><X className="w-3 h-3" /></button></div>))}<button type="button" onClick={() => handleAddArrayField('pros')} className="text-xs text-green-500 hover:underline flex items-center gap-1 mt-1">+ Ajouter</button></div></div><div><label className="block text-xs text-red-500 uppercase font-bold mb-2 flex items-center gap-2"><X className="w-3 h-3" /> On Aime Moins (Cons)</label><div className="space-y-2">{(editingProduct.cons || []).map((con, idx) => (<div key={idx} className="flex gap-2"><input type="text" value={con} onChange={(e) => handleArrayFieldChange('cons', idx, e.target.value)} className="flex-1 bg-[#09090b] border border-white/10 text-white p-2 text-xs focus:border-red-500 outline-none" /><button type="button" onClick={() => handleRemoveArrayField('cons', idx)} className="text-red-500 p-1 hover:bg-white/5"><X className="w-3 h-3" /></button></div>))}<button type="button" onClick={() => handleAddArrayField('cons')} className="text-xs text-red-500 hover:underline flex items-center gap-1 mt-1">+ Ajouter</button></div></div></div></div></div>
                    <div className="bg-[#18181b] border border-white/10 p-6 rounded-sm shadow-xl"><div className="flex justify-between items-center mb-6"><h3 className="text-white font-bold uppercase text-sm flex items-center gap-2"><List className="w-4 h-4 text-purple-400" /> Spécifications Techniques</h3><button type="button" onClick={handleAddSpec} className="text-xs bg-white/10 hover:bg-white hover:text-black px-2 py-1 transition-colors uppercase font-bold">+ Ajouter Spec</button></div><div className="space-y-2">{(editingProduct.specs || []).map((spec, idx) => (<div key={idx} className="flex gap-4 items-center group"><input type="text" placeholder="Label (ex: Processeur)" value={spec.label} onChange={(e) => handleSpecChange(idx, 'label', e.target.value)} className="w-1/3 bg-[#09090b] border border-white/10 text-gray-400 p-2 text-xs focus:border-purple-500 outline-none font-bold uppercase" /><input type="text" placeholder="Valeur (ex: M2 Pro)" value={spec.value} onChange={(e) => handleSpecChange(idx, 'value', e.target.value)} className="flex-1 bg-[#09090b] border border-white/10 text-white p-2 text-xs focus:border-purple-500 outline-none" /><button type="button" onClick={() => handleRemoveSpec(idx)} className="text-gray-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><Minus className="w-4 h-4" /></button></div>))}{(!editingProduct.specs || editingProduct.specs.length === 0) && (<p className="text-gray-600 text-xs italic text-center py-4">Aucune spécification technique. Utilisez l'IA pour générer.</p>)}</div></div>
                </div>
                <div className="space-y-8">
                     <div className="bg-[#18181b] border border-white/10 p-6 rounded-sm sticky top-32 shadow-xl"><h3 className="text-white font-bold uppercase text-sm mb-6 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-pink-500" /> Galerie Média</h3><div className="space-y-6"><div><label className="block text-xs text-gray-400 uppercase font-bold mb-2">Image Principale</label><div className="mb-2 w-full aspect-video bg-black rounded border border-white/10 overflow-hidden flex items-center justify-center relative group">{editingProduct.image ? (<img src={editingProduct.image} className="w-full h-full object-contain" />) : (<ImageIcon className="text-gray-700 w-12 h-12" />)}{uploadingImage && (<div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10"><Loader2 className="w-8 h-8 text-xeption-gold animate-spin" /></div>)}</div><div className="flex gap-2"><input type="text" value={editingProduct.image} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} className="flex-1 bg-[#09090b] border border-white/10 text-white p-2 text-xs focus:border-xeption-gold outline-none" placeholder="URL ou Upload..." /><input type="file" ref={mainImageInputRef} onChange={handleMainImageUpload} className="hidden" accept="image/*" /><button type="button" onClick={() => mainImageInputRef.current?.click()} className="bg-white/10 hover:bg-white/20 p-2 rounded text-white" title="Uploader une image"><Upload className="w-4 h-4" /></button></div></div><div><label className="block text-xs text-gray-400 uppercase font-bold mb-2">Vidéo (Cloudinary)</label><div className="flex gap-2"><input type="text" value={editingProduct.video || ''} onChange={e => setEditingProduct({...editingProduct, video: e.target.value})} className="flex-1 bg-[#09090b] border border-white/10 text-white p-2 text-xs focus:border-xeption-gold outline-none" placeholder="https://..." /><input type="file" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" accept="video/*" /><button type="button" onClick={() => videoInputRef.current?.click()} className="bg-white/10 hover:bg-white/20 p-2 rounded text-white flex items-center gap-1" title="Uploader une vidéo" disabled={uploadingVideo}>{uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}</button></div></div><div><div className="flex justify-between items-center mb-2"><label className="block text-xs text-gray-400 uppercase font-bold">Images Galerie ({editingProduct.images?.length || 0})</label>{uploadingGallery && <span className="text-xs text-xeption-gold flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Upload...</span>}</div><div className="grid grid-cols-3 gap-2 mb-2">{(editingProduct.images || []).map((img, idx) => (<div key={idx} className="aspect-square bg-black border border-white/10 relative group"><img src={img} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" /><button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button></div>))}<input type="file" ref={galleryInputRef} onChange={handleGalleryUpload} className="hidden" accept="image/*" multiple /><button type="button" onClick={() => galleryInputRef.current?.click()} className="aspect-square bg-[#09090b] border border-white/10 border-dashed flex items-center justify-center hover:bg-white/10 transition-colors text-gray-500 hover:text-white"><Upload className="w-5 h-5" /></button></div></div></div></div>
                     <div className="bg-xeption-gold/5 border border-xeption-gold/20 p-6 rounded-sm shadow-xl"><h3 className="text-xeption-gold font-bold uppercase text-sm mb-4 flex items-center gap-2"><Tag className="w-4 h-4" /> Offre Spéciale</h3><label className="flex items-center gap-3 cursor-pointer mb-4"><input type="checkbox" checked={editingProduct.isPromo || false} onChange={e => setEditingProduct({...editingProduct, isPromo: e.target.checked})} className="w-5 h-5 accent-xeption-gold rounded cursor-pointer" /><span className="text-white text-sm font-bold">Activer la Promo</span></label>{editingProduct.isPromo && (<div className="animate-in slide-in-from-top-2"><label className="block text-xs text-gray-500 uppercase font-bold mb-1">Ancien Prix (barré)</label><input type="number" value={editingProduct.oldPrice || ''} onChange={e => setEditingProduct({...editingProduct, oldPrice: parseInt(e.target.value)})} className="w-full bg-[#09090b] border border-white/10 text-white p-2 focus:border-xeption-gold outline-none font-mono" placeholder="Ex: 100000" /></div>)}</div>
                </div>
             </form>
          </div>
      );
  }

  // MAIN RETURN
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen relative z-10">
        <div className="fixed inset-0 bg-[#09090b] z-[-1]" />
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-white/10 pb-6">
          <div><div className="flex items-center gap-3 mb-2"><div className="h-8 w-1 bg-xeption-red"></div><h2 className="text-4xl font-bold text-white font-tech uppercase">Staff Portal <span className="text-gray-600 text-lg align-middle ml-2">Manager</span></h2></div><p className="text-gray-400 text-sm">Gérez le stock, les commandes et le catalogue en temps réel.</p></div>
          <div className="flex bg-[#18181b] border border-white/10 rounded-sm p-1 mt-4 md:mt-0 overflow-x-auto shadow-lg">
            {[{ id: 'dashboard', label: 'Dashboard', icon: TrendingUp }, { id: 'pos', label: 'Caisse (POS)', icon: CreditCard }, { id: 'sav', label: 'SAV / Réparations', icon: Wrench }, { id: 'inventory', label: 'Inventaire', icon: Package }, { id: 'marketing', label: 'Studio Vidéo', icon: Clapperboard }, { id: 'orders', label: 'Commandes', icon: ShoppingBag }, { id: 'clients', label: 'Clients (CRM)', icon: Users }, { id: 'staff', label: 'Staff & Rôles', icon: Key }].map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-all rounded-sm whitespace-nowrap ${activeTab === tab.id ? 'bg-xeption-gold text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}><tab.icon className="w-4 h-4" /><span className="hidden sm:inline">{tab.label}</span></button>))}
          </div>
      </div>
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'pos' && renderPOS()}
      {activeTab === 'sav' && <RepairTicketManagement />}
      {activeTab === 'inventory' && renderInventory()}
      {activeTab === 'marketing' && renderMarketing()}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'clients' && renderClients()}
      {activeTab === 'staff' && renderStaff()}

      {editingStaff && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-[#18181b] border border-white/10 w-full max-w-md p-6 rounded-sm shadow-2xl"><h3 className="text-xl font-bold text-white font-tech uppercase mb-6">{editingStaff.id.startsWith('new_') ? 'Nouveau Membre' : 'Modifier Membre'}</h3><form onSubmit={handleSaveStaff} className="space-y-4"><div><label className="block text-xs text-gray-400 uppercase font-bold mb-1">Nom d'utilisateur (Login)</label><input required type="text" value={editingStaff.name} onChange={e => setEditingStaff({...editingStaff, name: e.target.value})} className="w-full bg-[#09090b] border border-white/10 p-2 text-white outline-none focus:border-xeption-gold font-mono"/><p className="text-[10px] text-gray-500 mt-1">Ce nom sera utilisé pour la connexion.</p></div><div><label className="block text-xs text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><Key className="w-3 h-3" /> Mot de Passe</label><input required type="text" value={editingStaff.password || ''} onChange={e => setEditingStaff({...editingStaff, password: e.target.value})} className="w-full bg-[#09090b] border border-white/10 p-2 text-white outline-none focus:border-xeption-gold font-mono"/></div><div><label className="block text-xs text-gray-400 uppercase font-bold mb-1">Rôle</label><select value={editingStaff.role} onChange={e => setEditingStaff({...editingStaff, role: e.target.value as any})} className="w-full bg-[#09090b] border border-white/10 p-2 text-white outline-none focus:border-xeption-gold"><option value="admin">Administrateur</option><option value="manager">Manager</option><option value="editor">Éditeur</option></select></div><div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setEditingStaff(null)} className="px-4 py-2 text-gray-500 text-xs font-bold uppercase">Annuler</button><button type="submit" className="px-4 py-2 bg-xeption-gold text-black text-xs font-bold uppercase">Enregistrer</button></div></form></div></div>)}
    </div>
  );
};

export default AdminPanel;
