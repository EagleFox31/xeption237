
import React, { useState } from 'react';
import { Product, AdminNotification, Order } from '../../types';

// UI Composition
import Sidebar from './layout/Sidebar';
import BottomNav from './layout/BottomNav';
import Logo from '../Logo';
import ConfirmationModal from './modals/ConfirmationModal';
import NotificationToast from './notifications/NotificationToast';
import NotificationDrawer from './notifications/NotificationDrawer';

// Feature Tabs
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

// Logic Managers (SRP)
import { useAdminNotifications } from '../../hooks/admin/useAdminNotifications';
import { useAdminData } from '../../hooks/admin/useAdminData';
import { usePosSystem } from '../../hooks/admin/usePosSystem';
import { useInventoryManager } from '../../hooks/admin/useInventoryManager';
import { useConfirmModal } from '../../hooks/admin/useConfirmModal';
import { useOrdersManager } from '../../hooks/admin/useOrdersManager';
import { useStaffManager } from '../../hooks/admin/useStaffManager';
import { useCategoriesManager } from '../../hooks/admin/useCategoriesManager';
import { useMarketingStudio } from '../../hooks/admin/useMarketingStudio';

// Editor Modals
import ProductEditorOverlay from './modals/ProductEditorOverlay';
import StaffEditorModal from './modals/StaffEditorModal';

interface AdminPanelProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ products, onUpdateProducts }) => {
  // 1. Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'orders' | 'staff' | 'clients' | 'marketing' | 'sav' | 'guide' | 'categories' | 'invoices'>('dashboard');
  
  // 2. Core Services
  const confirm = useConfirmModal();
  const notifs = useAdminNotifications();
  const data = useAdminData(notifs.addNotification);

  // 3. Domain Logic Managers
  const pos = usePosSystem({ products, onUpdateProducts, refreshData: data.refreshAll });
  const inventory = useInventoryManager({ products, onUpdateProducts });
  const ordersMgr = useOrdersManager({ products, onUpdateProducts, orders: data.orders, setOrders: data.setOrders });
  const staffMgr = useStaffManager({ staffMembers: data.staffMembers, setStaffMembers: data.setStaffMembers });
  const catsMgr = useCategoriesManager({ categories: data.categories, setCategories: data.setCategories });
  const marketing = useMarketingStudio();

  // 4. Wiring Handlers (View -> Logic -> Feedback)
  const handleNotifyClick = (n: AdminNotification) => notifs.handleInteraction(n, (tab) => setActiveTab(tab as any));

  // Inventory
  const onSaveProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      try { await inventory.saveProduct(); } catch (err: any) { alert(err.message); }
  };
  const onDeleteProduct = (id: string) => confirm.danger("Supprimer Produit", "Irréversible.", async () => { try { await inventory.deleteProduct(id); } catch(e) { console.error(e); } });

  // POS
  const onPosSubmit = () => {
      try {
          if (pos.cart.length === 0) throw new Error("Panier vide");
          confirm.success("Valider Vente", `Total: ${pos.cart.reduce((a,b)=>a+(b.price*b.quantity),0).toLocaleString()} FCFA`, async () => {
              try { await pos.submitSale(); } catch(e:any) { alert(e.message); }
          });
      } catch(e:any) { alert(e.message); }
  };

  // Orders
  const onCancelOrder = (order: Order) => confirm.danger("Annuler Commande", `Stock sera restauré pour #${order.id}.`, async () => { try { await ordersMgr.cancelOrder(order); } catch(e) { console.error(e); } });

  // Categories & Staff
  const onDeleteCategory = (id: string) => confirm.danger("Supprimer Type", "Attention aux produits liés.", async () => { try { await catsMgr.deleteCategory(id); } catch(e:any) { alert(e.message); } });
  const onDeleteStaff = (id: string) => confirm.danger("Supprimer Staff", "Accès révoqué.", async () => { try { await staffMgr.deleteStaff(id); } catch(e) { console.error(e); } });

  return (
    <div className="min-h-screen text-white font-sans selection:bg-xeption-gold selection:text-black">
        {/* LAYERS */}
        {confirm.config && <ConfirmationModal {...confirm.config} onCancel={confirm.close} />}
        <NotificationToast notification={notifs.currentToast} onClose={notifs.closeToast} onClick={() => notifs.currentToast && handleNotifyClick(notifs.currentToast)} />
        <NotificationDrawer isOpen={notifs.isNotifDrawerOpen} onClose={notifs.toggleDrawer} notifications={notifs.notifications} onClearAll={notifs.clearAll} onNotificationClick={handleNotifyClick} />

        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} unreadCount={notifs.unreadCount} onToggleNotifications={notifs.toggleDrawer} />

        <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8 min-h-screen relative overflow-x-hidden">
            <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                 <Logo className="scale-75 origin-left" />
                 <div className="bg-white/10 px-3 py-1 rounded text-[10px] font-bold uppercase text-xeption-gold">Admin</div>
            </div>

            {/* ROUTER */}
            {activeTab === 'dashboard' && <DashboardTab orders={data.orders} staffMembers={data.staffMembers} customers={data.customers} products={products} />}
            {activeTab === 'pos' && <PosTab products={products} posCart={pos.cart} posSearch={pos.search} setPosSearch={pos.setSearch} posCustomer={pos.customer} setPosCustomer={pos.setCustomer} addToPosCart={pos.addToCart} onPosSubmit={onPosSubmit} lastOrder={pos.lastOrder} onDismissSuccess={() => pos.setLastOrder(null)} />}
            {activeTab === 'orders' && <OrdersTab orders={data.orders} onUpdateStatus={ordersMgr.updateStatus} onCancelOrder={onCancelOrder} />}
            {activeTab === 'inventory' && <InventoryTab products={products} onEditProduct={inventory.setEditingProduct} onDeleteProduct={onDeleteProduct} onCreateProduct={() => inventory.startCreate(data.categories)} />}
            {activeTab === 'categories' && <CategoriesTab categories={data.categories} newCatName={catsMgr.newCatName} setNewCatName={catsMgr.setNewCatName} onAddCategory={catsMgr.addCategory} onDeleteCategory={onDeleteCategory} />}
            {activeTab === 'staff' && <StaffTab staffMembers={data.staffMembers} onAddStaff={() => staffMgr.openEditor()} onDeleteStaff={onDeleteStaff} />}
            {activeTab === 'marketing' && <MarketingTab videoPrompt={marketing.videoPrompt} setVideoPrompt={marketing.setVideoPrompt} generatingVideo={marketing.generatingVideo} generatedVideoUrl={marketing.generatedVideoUrl} onGenerateVideo={marketing.generateVideo} />}
            {activeTab === 'invoices' && <InvoicesTab orders={data.orders} />} 
            {activeTab === 'sav' && <SavTab />}
            {activeTab === 'clients' && <ClientsTab customers={data.customers} />}
            {activeTab === 'guide' && <GuideTab />}
        </main>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} unreadCount={notifs.unreadCount} onToggleNotifications={notifs.toggleDrawer} />

        {/* MODALS */}
        {inventory.editingProduct && (
            <ProductEditorOverlay product={inventory.editingProduct} categories={data.categories} onClose={() => inventory.setEditingProduct(null)} onSave={onSaveProduct} onChange={(u) => inventory.setEditingProduct(p => p ? ({ ...p, ...u }) : null)} />
        )}
        
        {staffMgr.editingStaff && (
            <StaffEditorModal staff={staffMgr.editingStaff as any} onClose={staffMgr.closeEditor} onSave={staffMgr.saveStaff} onChange={(u) => staffMgr.setEditingStaff(p => p ? ({ ...p, ...u }) : null)} />
        )}
    </div>
  );
};

export default AdminPanel;
