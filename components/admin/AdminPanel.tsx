
import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Product, AdminNotification, Order, Staff } from '../../types';
import { supabase } from '../../services/supabaseClient'; // Import supabase

// UI Composition
import Sidebar from './layout/Sidebar';
import BottomNav from './layout/BottomNav';
import AdminPageHeader from './layout/AdminPageHeader';
import type { AdminTabId } from './layout/adminMenuConfig';
import { findMenuItem } from './layout/adminMenuConfig';
import { adminUi } from './shared/adminUi';
import Logo from '../Logo';
import BackToShopLink from './layout/BackToShopLink';
import ConfirmationModal from './modals/ConfirmationModal';
import NotificationToast from './notifications/NotificationToast';
import NotificationDrawer from './notifications/NotificationDrawer';

// Feature Tabs
import DashboardTab from './tabs/DashboardTab';
import PosTab from './tabs/PosTab';
import OrdersTab from './tabs/OrdersTab';
import InventoryTab from './tabs/InventoryTab';
import CatalogStructureTab from './tabs/CatalogStructureTab';
import ProductImagesBulkTab from './tabs/ProductImagesBulkTab';
import PacksTab from './tabs/PacksTab';
import DeliveryTab from './tabs/DeliveryTab'; // NEW
import SavTab from './tabs/SavTab';
import ClientsTab from './tabs/ClientsTab';
import StaffTab from './tabs/StaffTab';
import TrocWorkspaceTab from './tabs/TrocWorkspaceTab';
import {
  adminTabPath,
  buildAdminMenuBadges,
  parseAdminTabFromPath,
  resolveAdminLandingTab,
} from '../../utils/adminRoutes';
import {
  canAccessAdminTab,
  filterAdminMenuGroups,
  getFirstAccessibleAdminTab,
} from '../../utils/adminAccess';

// Logic Managers (SRP)
import { useAdminNotifications } from '../../hooks/admin/useAdminNotifications';
import { useAdminData } from '../../hooks/admin/useAdminData';
import { usePosSystem } from '../../hooks/admin/usePosSystem';
import { useInventoryManager } from '../../hooks/admin/useInventoryManager';
import { usePacksManager } from '../../hooks/admin/usePacksManager'; 
import { useConfirmModal } from '../../hooks/admin/useConfirmModal';
import { useOrdersManager } from '../../hooks/admin/useOrdersManager';
import { useStaffManager } from '../../hooks/admin/useStaffManager';
import { useCategoriesManager } from '../../hooks/admin/useCategoriesManager';
import { useBrandsManager } from '../../hooks/admin/useBrandsManager'; 
import { useTrocManager } from '../../hooks/admin/useTrocManager';
import { useCurrentStaffSession } from '../../hooks/admin/useCurrentStaffSession';

// Editor Modals
import ProductEditorOverlay from './modals/ProductEditorOverlay';
import PackEditorOverlay from './modals/PackEditorOverlay'; 
import StaffEditorModal from './modals/StaffEditorModal';
import { LogOut, Plus, UserPlus } from 'lucide-react';

interface AdminPanelProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ products, onUpdateProducts }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // 2. Core Services
  const confirm = useConfirmModal();
  const notifs = useAdminNotifications();
  const data = useAdminData(notifs.addNotification);

  // 3. Domain Logic Managers
  const pos = usePosSystem({ products, onUpdateProducts, refreshData: data.refreshAll });
  const inventory = useInventoryManager({
    products,
    onUpdateProducts,
    brands: data.brands,
    ranges: data.ranges,
    confirmDialog: (title, message, confirmLabel) =>
      confirm.ask(title, message, { confirmLabel }),
  });
  const packsMgr = usePacksManager(products); 
  const ordersMgr = useOrdersManager({ products, onUpdateProducts, orders: data.orders, setOrders: data.setOrders });
  const staffMgr = useStaffManager({
    staffMembers: data.staffMembers,
    setStaffMembers: data.setStaffMembers,
    onFeedback: (title, message) => {
      notifs.addNotification({
        id: crypto.randomUUID(),
        type: 'alert',
        title,
        message,
        timestamp: new Date(),
        read: false,
        linkToTab: 'staff',
      });
    },
  });
  const catsMgr = useCategoriesManager({ categories: data.categories, setCategories: data.setCategories });
  const brandMgr = useBrandsManager({ brands: data.brands, setBrands: data.setBrands, ranges: data.ranges, setRanges: data.setRanges }); 
  const trocMgr = useTrocManager();
  const currentStaffSession = useCurrentStaffSession(data.staffMembers);
  const staffRole = currentStaffSession.staff?.role ?? currentStaffSession.roleId;

  const pendingOrderCount = useMemo(
    () => data.orders.filter((order) => order.status === 'pending').length,
    [data.orders],
  );

  const menuGroups = useMemo(
    () => filterAdminMenuGroups(staffRole),
    [staffRole],
  );

  const activeTab = parseAdminTabFromPath(location.pathname) ?? 'dashboard';

  const menuBadges = useMemo(
    () => buildAdminMenuBadges(data.orders, trocMgr.requests),
    [data.orders, trocMgr.requests],
  );

  const goToTab = (tab: AdminTabId, options?: { replace?: boolean }) => {
    navigate(adminTabPath(tab), { replace: options?.replace ?? false });
  };

  useEffect(() => {
    if (parseAdminTabFromPath(location.pathname)) return;
    const landingTab = resolveAdminLandingTab(pendingOrderCount, staffRole);
    goToTab(landingTab, { replace: true });
  }, [location.pathname, pendingOrderCount, staffRole]);

  useEffect(() => {
    const tab = parseAdminTabFromPath(location.pathname);
    if (!tab || canAccessAdminTab(staffRole, tab)) return;
    goToTab(getFirstAccessibleAdminTab(staffRole, pendingOrderCount), { replace: true });
  }, [location.pathname, staffRole, pendingOrderCount]);

  // 4. Wiring Handlers (View -> Logic -> Feedback)
  const handleNotifyClick = (n: AdminNotification) =>
    notifs.handleInteraction(n, (tab) => {
      if (tab && parseAdminTabFromPath(`/admin/${tab}`) && canAccessAdminTab(staffRole, tab as AdminTabId)) {
        goToTab(tab as AdminTabId);
      }
    });

  // Inventory
  const onSaveProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      try { await inventory.saveProduct(); } catch (err: any) { alert(err.message); }
  };
  const onDeleteProduct = (id: string) => confirm.danger("Supprimer Produit", "Irréversible.", async () => { try { await inventory.deleteProduct(id); } catch(e) { console.error(e); } });
  
  const onToggleFeatured = async (product: Product) => {
      try { await inventory.toggleFeatured(product); } catch(e:any) { alert(e.message); }
  };

  // Packs
  const onSavePack = async () => {
      try { await packsMgr.savePack(); } catch(err:any) { alert(err.message); }
  };
  const onDeletePack = (id: string) => confirm.danger("Supprimer Pack", "Cette action est définitive.", async () => { try { await packsMgr.deletePack(id); } catch(e:any) { alert(e.message); } });

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
  const onCancelOrder = (order: Order) =>
    confirm.danger(
      'Annuler la commande',
      `Confirmer l’annulation de #${order.id} ? Le stock des articles sera remis si la commande contient des produits.`,
      () => ordersMgr.cancelOrder(order),
    );

  // Categories & Staff
  const onDeleteCategory = (id: string) => confirm.danger("Supprimer Type", "Attention aux produits liés.", async () => { try { await catsMgr.deleteCategory(id); } catch(e:any) { alert(e.message); } });
  const onDeleteStaff = (id: string) => confirm.danger("Supprimer Staff", "Accès révoqué.", async () => { try { await staffMgr.deleteStaff(id); } catch(e) { console.error(e); } });

  const onProvisionStaffAuth = async (staff: Staff) => {
    try {
      await staffMgr.provisionAuthForStaff(staff);
    } catch (e) {
      console.error(e);
    }
  };

  // Auth Logout
  const handleLogout = async () => {
      confirm.danger("Déconnexion", "Fermer la session sécurisée ?", async () => {
          await supabase.auth.signOut();
          window.location.reload(); // Force refresh to clear state and show login
      });
  };

  const activeMenuItem = findMenuItem(activeTab);
  const showTabChrome = !inventory.editingProduct && !packsMgr.editingPack;

  const tabActions =
    showTabChrome && activeTab === 'inventory' ? (
      <button
        type="button"
        onClick={() => inventory.startCreate(data.categories)}
        className={adminUi.btnOnGold}
      >
        <Plus className="w-4 h-4" /> Nouveau produit
      </button>
    ) : showTabChrome && activeTab === 'staff' ? (
      <button type="button" onClick={() => staffMgr.openEditor()} className={adminUi.btnOnGold}>
        <UserPlus className="w-4 h-4" /> Nouveau membre
      </button>
    ) : showTabChrome && activeTab === 'packs' ? (
      <button type="button" onClick={() => packsMgr.startCreate()} className={adminUi.btnOnGold}>
        <Plus className="w-4 h-4" /> Nouveau pack
      </button>
    ) : undefined;

  return (
    <div className={adminUi.page}>
        {/* LAYERS */}
        {confirm.config && (
          <ConfirmationModal
            isOpen={confirm.config.isOpen}
            title={confirm.config.title}
            message={confirm.config.message}
            type={confirm.config.type}
            confirmLabel={confirm.config.confirmLabel}
            onConfirm={confirm.handleConfirm}
            onCancel={confirm.close}
            isConfirming={confirm.isConfirming}
          />
        )}
        <NotificationToast notification={notifs.currentToast} onClose={notifs.closeToast} onClick={() => notifs.currentToast && handleNotifyClick(notifs.currentToast)} />
        <NotificationDrawer isOpen={notifs.isNotifDrawerOpen} onClose={notifs.toggleDrawer} notifications={notifs.notifications} onClearAll={notifs.clearAll} onNotificationClick={handleNotifyClick} />

        <Sidebar 
            activeTab={activeTab} 
            onTabChange={goToTab}
            unreadCount={notifs.unreadCount} 
            menuBadges={menuBadges}
            menuGroups={menuGroups}
            onToggleNotifications={notifs.toggleDrawer} 
            onLogout={handleLogout}
            currentUser={{
              displayName: currentStaffSession.displayName,
              roleLabel: currentStaffSession.roleLabel,
              initials: currentStaffSession.initials,
            }}
        />

        <main className={adminUi.main}>
            <div className="md:hidden flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-40">
                 <div className="flex items-center gap-2 min-w-0">
                   <Logo className="scale-75 origin-left shrink-0" />
                   <div className="min-w-0">
                     <p className="text-xs font-bold text-white truncate max-w-[140px]">{currentStaffSession.displayName}</p>
                     <p className="text-[10px] text-xeption-gold uppercase truncate max-w-[140px]">{currentStaffSession.roleLabel}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-1">
                   <BackToShopLink variant="compact" />
                   <button type="button" onClick={handleLogout} className={`text-red-400 p-2 rounded-md hover:bg-red-500/10 ${adminUi.focusRing}`} aria-label="Déconnexion">
                     <LogOut className="w-5 h-5"/>
                   </button>
                 </div>
            </div>

            <div className={adminUi.content}>
            {showTabChrome && activeMenuItem && (
              <AdminPageHeader
                key={activeTab}
                title={activeMenuItem.label}
                description={activeMenuItem.description}
                icon={activeMenuItem.icon}
                actions={tabActions}
              />
            )}

            {/* ROUTER / CONDITIONAL RENDERER */}
            {inventory.editingProduct ? (
                <ProductEditorOverlay 
                    product={inventory.editingProduct}
                    allProducts={products}
                    categories={data.categories}
                    brands={data.brands} 
                    ranges={data.ranges}
                    onClose={() => inventory.setEditingProduct(null)} 
                    onSave={onSaveProduct} 
                    onChange={(u) => inventory.setEditingProduct(p => p ? ({ ...p, ...u }) : null)} 
                />
            ) : packsMgr.editingPack ? (
                <PackEditorOverlay
                    pack={packsMgr.editingPack}
                    allProducts={products}
                    onClose={() => packsMgr.setEditingPack(null)}
                    onSave={onSavePack}
                    onChange={(u) => packsMgr.setEditingPack(p => p ? ({ ...p, ...u }) : null)}
                />
            ) : canAccessAdminTab(staffRole, activeTab) ? (
                <>
                    {activeTab === 'dashboard' && <DashboardTab orders={data.orders} staffMembers={data.staffMembers} customers={data.customers} products={products} />}
                    {activeTab === 'pos' && <PosTab products={products} categories={data.categories} brands={data.brands} posCart={pos.cart} posSearch={pos.search} setPosSearch={pos.setSearch} posCustomer={pos.customer} setPosCustomer={pos.setCustomer} addToPosCart={pos.addToCart} removeFromPosCart={pos.removeFromCart} onPosSubmit={onPosSubmit} lastOrder={pos.lastOrder} onDismissSuccess={() => pos.setLastOrder(null)} />}
                    {activeTab === 'orders' && <OrdersTab orders={data.orders} onUpdateStatus={ordersMgr.updateStatus} onCancelOrder={onCancelOrder} />}
                    {activeTab === 'inventory' && (
                      <InventoryTab
                        products={products}
                        categories={data.categories}
                        brands={data.brands}
                        ranges={data.ranges}
                        onEditProduct={inventory.setEditingProduct}
                        onDeleteProduct={onDeleteProduct}
                        onToggleFeatured={onToggleFeatured}
                      />
                    )}
                    {activeTab === 'packs' && <PacksTab packs={packsMgr.packs} products={products} onEditPack={packsMgr.setEditingPack} onDeletePack={onDeletePack} getHydratedItems={packsMgr.getHydratedItems} />}
                    {activeTab === 'delivery' && <DeliveryTab />}
                    {activeTab === 'productImages' && (
                      <ProductImagesBulkTab
                        products={products}
                        brands={data.brands}
                        ranges={data.ranges}
                        onUpdateProducts={onUpdateProducts}
                      />
                    )}
                    {activeTab === 'catalogStructure' && (
                      <CatalogStructureTab
                        categories={data.categories}
                        newCatName={catsMgr.newCatName}
                        setNewCatName={catsMgr.setNewCatName}
                        onAddCategory={catsMgr.addCategory}
                        onDeleteCategory={onDeleteCategory}
                        brands={data.brands}
                        ranges={data.ranges}
                        products={products}
                        brandMgr={brandMgr}
                      />
                    )}
                    {activeTab === 'staff' && (
                      <StaffTab
                        staffMembers={data.staffMembers}
                        authByEmail={staffMgr.authByEmail}
                        provisioningId={staffMgr.provisioningId}
                        isBulkProvisioning={staffMgr.isBulkProvisioning}
                        onEditStaff={staffMgr.openEditor}
                        onAddStaff={() => staffMgr.openEditor()}
                        onDeleteStaff={onDeleteStaff}
                        onProvisionAuth={onProvisionStaffAuth}
                        onProvisionAllMissing={() => void staffMgr.provisionAllStaffAuth()}
                      />
                    )}
                    {activeTab === 'sav' && <SavTab />}
                    {activeTab === 'clients' && <ClientsTab customers={data.customers} />}
                    {activeTab === 'troc' && (
                      <TrocWorkspaceTab
                        requests={trocMgr.requests}
                        sessions={data.trocSessions}
                        payments={trocMgr.payments}
                        isLoadingPayments={trocMgr.isLoadingPayments}
                        onRefresh={trocMgr.refreshAll}
                        onUpdateStatus={trocMgr.updateStatus}
                      />
                    )}
                </>
            ) : null}
            </div>
        </main>

        <BottomNav
          activeTab={activeTab}
          onTabChange={goToTab}
          unreadCount={notifs.unreadCount}
          menuBadges={menuBadges}
          staffRole={staffRole}
          menuGroups={menuGroups}
          onToggleNotifications={notifs.toggleDrawer}
        />

        {/* MODALS */}
        {staffMgr.editingStaff && (
            <StaffEditorModal
              staff={staffMgr.editingStaff as Staff}
              onClose={staffMgr.closeEditor}
              onSave={staffMgr.saveStaff}
              onChange={(u) => staffMgr.setEditingStaff((p) => (p ? { ...p, ...u } : null))}
              isSaving={staffMgr.isSaving}
            />
        )}
    </div>
  );
};

export default AdminPanel;
