import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Product, AdminNotification, Order, Staff } from '../../types';
import { supabase } from '../../services/supabaseClient';

// UI Composition
import Sidebar from './layout/Sidebar';
import ChangePasswordModal from './modals/ChangePasswordModal';
import { fetchRecentSecurityEvents, describeSecurityEvent } from '../../services/staffSecurity';
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

// Feature Tabs — paid scope only
import DashboardTab from './tabs/DashboardTab';
import PosTab from './tabs/PosTab';
import OrdersTab from './tabs/OrdersTab';
import InventoryTab from './tabs/InventoryTab';
import CatalogStructureTab from './tabs/CatalogStructureTab';
import ProductImagesBulkTab from './tabs/ProductImagesBulkTab';
import PacksTab from './tabs/PacksTab';
import DeliveryTab from './tabs/DeliveryTab';
import SavTab from './tabs/SavTab';
import ClientsTab from './tabs/ClientsTab';
import StaffTab from './tabs/StaffTab';
import QaRecetteTab from './tabs/QaRecetteTab';
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

// Logic Managers
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
import { useOrderPayment } from '../../hooks/admin/useOrderPayment';

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

  const confirm = useConfirmModal();
  const notifs = useAdminNotifications();
  const data = useAdminData(notifs.addNotification);

  const currentStaffSession = useCurrentStaffSession(data.staffMembers);
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
  const ordersMgr = useOrdersManager({
    orders: data.orders,
    setOrders: data.setOrders,
    refreshData: data.refreshAll,
  });
  const [collectingOrder, setCollectingOrder] = useState<Order | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const events = await fetchRecentSecurityEvents(5);
      if (cancelled || events.length === 0) return;
      const titles: Record<string, string> = {
        password_changed_self: 'Mot de passe modifié',
        password_reset_by_admin: 'Mot de passe réinitialisé',
        role_changed: 'Rôle modifié',
      };
      for (const ev of events) {
        notifs.addNotification({
          id: `security-${ev.id}`,
          type: 'alert',
          title: titles[ev.event_type] ?? 'Sécurité',
          message: describeSecurityEvent(ev),
          timestamp: new Date(ev.created_at),
          read: false,
          linkToTab: 'staff',
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const orderPayment = useOrderPayment(data.refreshAll);
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
  const brandMgr = useBrandsManager({
    brands: data.brands,
    setBrands: data.setBrands,
    ranges: data.ranges,
    setRanges: data.setRanges,
  });
  const trocMgr = useTrocManager();
  const staffRole = currentStaffSession.staff?.role ?? currentStaffSession.roleId;

  const pendingOrderCount = useMemo(
    () => data.orders.filter((order) => order.status === 'pending').length,
    [data.orders],
  );
  const menuGroups = useMemo(() => filterAdminMenuGroups(staffRole), [staffRole]);
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
    goToTab(resolveAdminLandingTab(pendingOrderCount, staffRole), { replace: true });
  }, [location.pathname, pendingOrderCount, staffRole]);

  useEffect(() => {
    const tab = parseAdminTabFromPath(location.pathname);
    if (!tab || canAccessAdminTab(staffRole, tab)) return;
    goToTab(getFirstAccessibleAdminTab(staffRole, pendingOrderCount), { replace: true });
  }, [location.pathname, staffRole, pendingOrderCount]);

  const handleNotifyClick = (n: AdminNotification) =>
    notifs.handleInteraction(n, (tab) => {
      if (tab && parseAdminTabFromPath(`/admin/${tab}`) && canAccessAdminTab(staffRole, tab as AdminTabId)) {
        goToTab(tab as AdminTabId);
      }
    });

  const onSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await inventory.saveProduct(); } catch (err: any) { alert(err.message); }
  };
  const onDeleteProduct = (id: string) =>
    confirm.danger('Supprimer Produit', 'Irréversible.', async () => {
      try { await inventory.deleteProduct(id); } catch (e) { console.error(e); }
    });
  const onToggleFeatured = async (product: Product) => {
    try { await inventory.toggleFeatured(product); } catch (e: any) { alert(e.message); }
  };

  const onSavePack = async () => {
    try { await packsMgr.savePack(); } catch (err: any) { alert(err.message); }
  };
  const onDeletePack = (id: string) =>
    confirm.danger('Supprimer Pack', 'Cette action est définitive.', async () => {
      try { await packsMgr.deletePack(id); } catch (e: any) { alert(e.message); }
    });

  const onPosSubmit = () => {
    try {
      if (pos.cart.length === 0) throw new Error('Panier vide');
      const total = pos.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      confirm.success('Valider Vente', `Total: ${total.toLocaleString()} FCFA`, async () => {
        try { await pos.submitSale(); } catch (e: any) { alert(e.message); }
      });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const onCancelOrder = (order: Order) =>
    confirm.danger(
      'Annuler la commande',
      `Confirmer l’annulation de #${order.id} ? Les réservations stock seront libérées si nécessaire.`,
      () => ordersMgr.cancelOrder(order),
    );

  const onDeleteCategory = (id: string) =>
    confirm.danger('Supprimer Type', 'Attention aux produits liés.', async () => {
      try { await catsMgr.deleteCategory(id); } catch (e: any) { alert(e.message); }
    });
  const onDeleteStaff = (id: string) =>
    confirm.danger('Supprimer Staff', 'Accès révoqué.', async () => {
      try { await staffMgr.deleteStaff(id); } catch (e) { console.error(e); }
    });

  const onProvisionStaffAuth = async (staff: Staff) => {
    try { await staffMgr.provisionAuthForStaff(staff); } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    confirm.danger('Déconnexion', 'Fermer la session sécurisée ?', async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });
  };

  const activeMenuItem = findMenuItem(activeTab);
  const showTabChrome = !inventory.editingProduct && !packsMgr.editingPack;
  const tabActions =
    showTabChrome && activeTab === 'inventory' ? (
      <button type="button" onClick={() => inventory.startCreate(data.categories)} className={adminUi.btnOnGold}>
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
      {confirm.config && (
        <ConfirmationModal
          isOpen={confirm.config.isOpen}
          title={confirm.config.title}
          message={confirm.config.message}
          type={confirm.config.type}
          confirmLabel={confirm.config.confirmLabel}
          mode={confirm.config.mode}
          onConfirm={confirm.handleConfirm}
          onCancel={confirm.close}
          isConfirming={confirm.isConfirming}
        />
      )}
      {isChangingPassword && (
        <ChangePasswordModal
          onClose={() => setIsChangingPassword(false)}
          onDone={(message) => notifs.addNotification({
            id: crypto.randomUUID(),
            type: 'alert',
            title: 'Sécurité',
            message,
            timestamp: new Date(),
            read: false,
          })}
        />
      )}
      <NotificationToast
        notification={notifs.currentToast}
        onClose={notifs.closeToast}
        onClick={() => notifs.currentToast && handleNotifyClick(notifs.currentToast)}
      />
      <NotificationDrawer
        isOpen={notifs.isNotifDrawerOpen}
        onClose={notifs.toggleDrawer}
        notifications={notifs.notifications}
        onClearAll={notifs.clearAll}
        onNotificationClick={handleNotifyClick}
      />

      <Sidebar
        activeTab={activeTab}
        onTabChange={goToTab}
        unreadCount={notifs.unreadCount}
        menuBadges={menuBadges}
        menuGroups={menuGroups}
        onToggleNotifications={notifs.toggleDrawer}
        onLogout={handleLogout}
        onChangePassword={() => setIsChangingPassword(true)}
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
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className={adminUi.content}>
          {showTabChrome && activeMenuItem && (
            <AdminPageHeader
              key={activeTab}
              storageKey={activeTab}
              title={activeMenuItem.label}
              description={activeMenuItem.description}
              icon={activeMenuItem.icon}
              actions={tabActions}
            />
          )}

          {inventory.editingProduct ? (
            <ProductEditorOverlay
              product={inventory.editingProduct}
              allProducts={products}
              categories={data.categories}
              brands={data.brands}
              ranges={data.ranges}
              onCreateRange={brandMgr.createRange}
              showAlert={confirm.alert}
              onClose={() => inventory.setEditingProduct(null)}
              onSave={onSaveProduct}
              onChange={(u) => inventory.setEditingProduct((p) => p ? ({ ...p, ...u }) : null)}
            />
          ) : packsMgr.editingPack ? (
            <PackEditorOverlay
              pack={packsMgr.editingPack}
              allProducts={products}
              onClose={() => packsMgr.setEditingPack(null)}
              onSave={onSavePack}
              onChange={(u) => packsMgr.setEditingPack((p) => p ? ({ ...p, ...u }) : null)}
            />
          ) : canAccessAdminTab(staffRole, activeTab) ? (
            <>
              {activeTab === 'dashboard' && (
                <DashboardTab
                  orders={data.orders}
                  staffMembers={data.staffMembers}
                  customers={data.customers}
                  products={products}
                />
              )}
              {activeTab === 'pos' && (
                <PosTab
                  products={products}
                  categories={data.categories}
                  brands={data.brands}
                  posCart={pos.cart}
                  posSearch={pos.search}
                  setPosSearch={pos.setSearch}
                  posCustomer={pos.customer}
                  setPosCustomer={pos.setCustomer}
                  addToPosCart={pos.addToCart}
                  removeFromPosCart={pos.removeFromCart}
                  onPosSubmit={onPosSubmit}
                  lastOrder={pos.lastOrder}
                  onDismissSuccess={() => pos.setLastOrder(null)}
                />
              )}
              {activeTab === 'orders' && (
                <OrdersTab
                  orders={data.orders}
                  onUpdateStatus={ordersMgr.updateStatus}
                  onCancelOrder={onCancelOrder}
                  onCollectPayment={(order) => {
                    orderPayment.resetPaymentUi();
                    setCollectingOrder(order);
                  }}
                  paymentUiState={orderPayment.uiState}
                  paymentError={orderPayment.error}
                  collectingOrder={collectingOrder}
                  onCloseCollectPayment={() => {
                    orderPayment.resetPaymentUi();
                    setCollectingOrder(null);
                  }}
                  onInitiateCampay={async (phone) => {
                    if (!collectingOrder) return;
                    try { await orderPayment.initiateCampayPayment(collectingOrder, phone); }
                    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur paiement'); }
                  }}
                  onMarkCashPaid={async () => {
                    if (!collectingOrder) return;
                    try { await orderPayment.markCashPaid(collectingOrder.id); }
                    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur paiement'); }
                  }}
                />
              )}
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
              {activeTab === 'packs' && (
                <PacksTab
                  packs={packsMgr.packs}
                  products={products}
                  onEditPack={packsMgr.setEditingPack}
                  onDeletePack={onDeletePack}
                  getHydratedItems={packsMgr.getHydratedItems}
                />
              )}
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
                  showAlert={confirm.alert}
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
              {activeTab === 'qaRecette' && <QaRecetteTab />}
              {activeTab === 'sav' && <SavTab />}
              {activeTab === 'clients' && <ClientsTab customers={data.customers} />}
              {activeTab === 'troc' && (
                <TrocWorkspaceTab
                  requests={trocMgr.requests}
                  sessions={data.trocSessions}
                  payments={trocMgr.payments}
                  products={products}
                  isLoadingPayments={trocMgr.isLoadingPayments}
                  onRefresh={trocMgr.refreshAll}
                  onTransition={trocMgr.transitionStatus}
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
