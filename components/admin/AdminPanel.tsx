
import React, { useState } from 'react';
import { Product, AdminNotification } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { generateMarketingVideo } from '../../services/geminiService';

// Layout & Components
import Sidebar from './layout/Sidebar';
import BottomNav from './layout/BottomNav';
import Logo from '../Logo';
import ConfirmationModal from './modals/ConfirmationModal';
import ProductEditorOverlay from './modals/ProductEditorOverlay';
import StaffEditorModal from './modals/StaffEditorModal';
import NotificationToast from './notifications/NotificationToast';
import NotificationDrawer from './notifications/NotificationDrawer';

// Tabs
import DashboardTab from './tabs/DashboardTab';
import PosTab from './tabs/PosTab';
import OrdersTab from './tabs/OrdersTab';
import InventoryTab from './tabs/InventoryTab';
import CategoriesTab from './tabs/CategoriesTab';
import SavTab from './tabs/SavTab';
import ClientsTab from './tabs/ClientsTab';
import StaffTab from './tabs/StaffTab';
import MarketingTab from './tabs/MarketingTab';
import GuideTab from './tabs/GuideTab';
import InvoicesTab from './tabs/InvoicesTab';

// Hooks (The SRP Magic)
import { useAdminNotifications } from '../../hooks/admin/useAdminNotifications';
import { useAdminData } from '../../hooks/admin/useAdminData';
import { usePosSystem } from '../../hooks/admin/usePosSystem';
import { useInventoryManager } from '../../hooks/admin/useInventoryManager';

interface AdminPanelProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ products, onUpdateProducts }) => {
  // 1. UI State (Navigation & Modals)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'orders' | 'staff' | 'clients' | 'marketing' | 'sav' | 'guide' | 'categories' | 'invoices'>('dashboard');
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' | 'success'} | null>(null);
  
  // 2. Logic Hooks
  const notifs = useAdminNotifications();
  const data = useAdminData(notifs.addNotification);
  const pos = usePosSystem({ products, onUpdateProducts, refreshData: data.refreshAll });
  const inventory = useInventoryManager({ products, onUpdateProducts });

  // 3. Independent Logic (Still local for now as it's simple or specific)
  // Staff Editing
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const handleSaveStaff = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingStaff) return;
      const isNew = editingStaff.id.startsWith('new_');
      const { username, ...cleanData } = editingStaff;
      const staffData = { ...cleanData, id: isNew ? undefined : editingStaff.id };
      const { data: res, error } = await supabase.from('staff').upsert(staffData).select();
      if (!error && res) {
          data.setStaffMembers(prev => isNew ? [...prev, res[0]] : prev.map(s => s.id === res[0].id ? res[0] : s)); // Simple optim update
          data.fetchOrders(); // Refresh to be sure
          setEditingStaff(null);
      }
  };
  const handleDeleteStaff = (id: string) => {
      showConfirm("Supprimer Staff", "Confirmation ?", async () => {
          await supabase.from('staff').delete().eq('id', id);
          data.setStaffMembers(prev => prev.filter(s => s.id !== id));
      }, 'danger');
  };

  // Categories Logic (Simple enough to keep here or move later)
  const [newCatName, setNewCatName] = useState('');
  const handleAddCategory = async () => {
      if (!newCatName.trim()) return;
      const slug = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const { data: res, error } = await supabase.from('categories').insert([{ name: newCatName, slug }]).select();
      if (!error && res) {
          data.setCategories([...data.categories, res[0]]);
          setNewCatName('');
      }
  };
  const handleDeleteCategory = (id: string) => {
      showConfirm("Supprimer Type", "Attention aux produits liés.", async () => {
          await supabase.from('categories').delete().eq('id', id);
          data.setCategories(data.categories.filter(c => c.id !== id));
      }, 'danger');
  };

  // Orders Actions
  const updateOrderStatus = async (orderId: string, newStatus: any) => {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (!error) {
          data.setOrders(data.orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      }
  };
  const handleCancelOrder = (order: any) => {
      showConfirm("Annuler Commande", "Le stock sera restauré.", async () => {
          for (const item of order.items) {
              const { data: pData } = await supabase.from('products').select('stock').eq('id', item.id).single();
              if (pData) {
                  const newStock = pData.stock + item.quantity;
                  await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                  // Update local catalog if needed
              }
          }
          await updateOrderStatus(order.id, 'cancelled');
      }, 'danger');
  };

  // Marketing Video Logic
  const [videoPrompt, setVideoPrompt] = useState("");
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const handleVideoGeneration = async () => {
      if (!videoPrompt) return;
      setGeneratingVideo(true);
      try {
          const url = await generateMarketingVideo(videoPrompt);
          if (url) setGeneratedVideoUrl(url);
      } finally { setGeneratingVideo(false); }
  };

  // 4. Helpers
  const showConfirm = (title: string, message: string, action: () => void, type: 'danger' | 'info' | 'success' = 'info') => {
      setModalConfig({
          isOpen: true, title, message, type,
          onConfirm: () => { action(); setModalConfig(null); }
      });
  };

  const handleNotificationClick = (n: AdminNotification) => {
      notifs.markAsRead(n.id);
      if (n.linkToTab) setActiveTab(n.linkToTab as any);
      notifs.setIsNotifDrawerOpen(false);
      notifs.closeToast();
  };

  // 5. Wrappers for Inventory Hook to use Modal
  const onSaveProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await inventory.saveProduct();
      } catch (err: any) {
          alert(err.message);
      }
  };
  const onDeleteProductClick = (id: string) => {
      showConfirm("Supprimer Produit", "Irréversible.", async () => {
          try { await inventory.deleteProduct(id); } catch(e) { console.error(e); }
      }, 'danger');
  };

  // 6. Wrappers for POS Hook to use Modal
  const onPosSubmitClick = () => {
      try {
          if (pos.cart.length === 0) throw new Error("Panier vide");
          showConfirm("Valider Vente", `Total: ${pos.cart.reduce((a,b)=>a+(b.price*b.quantity),0).toLocaleString()} FCFA`, async () => {
              try { await pos.submitSale(); } catch(e:any) { alert(e.message); }
          }, 'success');
      } catch(e:any) { alert(e.message); }
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-xeption-gold selection:text-black">
        {modalConfig && <ConfirmationModal {...modalConfig} onCancel={() => setModalConfig(null)} />}

        <NotificationToast 
            notification={notifs.currentToast} 
            onClose={notifs.closeToast} 
            onClick={() => notifs.currentToast && handleNotificationClick(notifs.currentToast)} 
        />
        <NotificationDrawer 
            isOpen={notifs.isNotifDrawerOpen} 
            onClose={notifs.toggleDrawer} 
            notifications={notifs.notifications} 
            onClearAll={notifs.clearAll}
            onNotificationClick={handleNotificationClick}
        />

        <Sidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            unreadCount={notifs.unreadCount}
            onToggleNotifications={notifs.toggleDrawer}
        />

        <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8 min-h-screen relative overflow-x-hidden">
            <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                 <Logo className="scale-75 origin-left" />
                 <div className="bg-white/10 px-3 py-1 rounded text-[10px] font-bold uppercase text-xeption-gold">Admin</div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'dashboard' && <DashboardTab orders={data.orders} staffMembers={data.staffMembers} customers={data.customers} products={products} />}
            {activeTab === 'categories' && <CategoriesTab categories={data.categories} newCatName={newCatName} setNewCatName={setNewCatName} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} />}
            
            {activeTab === 'pos' && (
                <PosTab 
                    products={products} 
                    posCart={pos.cart} 
                    posSearch={pos.search} 
                    setPosSearch={pos.setSearch} 
                    posCustomer={pos.customer} 
                    setPosCustomer={pos.setCustomer} 
                    addToPosCart={pos.addToCart} 
                    onPosSubmit={onPosSubmitClick} 
                    lastOrder={pos.lastOrder}
                    onDismissSuccess={() => pos.setLastOrder(null)}
                />
            )}

            {activeTab === 'inventory' && <InventoryTab products={products} onEditProduct={inventory.setEditingProduct} onDeleteProduct={onDeleteProductClick} onCreateProduct={() => inventory.startCreate(data.categories)} />}
            
            {activeTab === 'orders' && <OrdersTab orders={data.orders} onUpdateStatus={updateOrderStatus} onCancelOrder={handleCancelOrder} />}
            {activeTab === 'invoices' && <InvoicesTab orders={data.orders} />} 
            {activeTab === 'sav' && <SavTab />}
            {activeTab === 'staff' && <StaffTab staffMembers={data.staffMembers} onAddStaff={() => setEditingStaff({id: `new_${Date.now()}`, username: '', name: '', email: '', password: '123456', role: 'editor', phone: ''})} onDeleteStaff={handleDeleteStaff} />}
            {activeTab === 'clients' && <ClientsTab customers={data.customers} />}
            {activeTab === 'marketing' && <MarketingTab videoPrompt={videoPrompt} setVideoPrompt={setVideoPrompt} generatingVideo={generatingVideo} generatedVideoUrl={generatedVideoUrl} onGenerateVideo={handleVideoGeneration} />}
            {activeTab === 'guide' && <GuideTab />}
        </main>

        <BottomNav 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            unreadCount={notifs.unreadCount}
            onToggleNotifications={notifs.toggleDrawer}
        />

        {/* MODALS */}
        {inventory.editingProduct && (
            <ProductEditorOverlay 
                product={inventory.editingProduct} 
                categories={data.categories}
                onClose={() => inventory.setEditingProduct(null)} 
                onSave={onSaveProduct} 
                onChange={(updates) => inventory.setEditingProduct(prev => prev ? ({ ...prev, ...updates }) : null)} 
            />
        )}
        
        {editingStaff && (
            <StaffEditorModal 
                staff={editingStaff} 
                onClose={() => setEditingStaff(null)} 
                onSave={handleSaveStaff} 
                onChange={(updates) => setEditingStaff(prev => prev ? ({ ...prev, ...updates }) : null)} 
            />
        )}
    </div>
  );
};

export default AdminPanel;
