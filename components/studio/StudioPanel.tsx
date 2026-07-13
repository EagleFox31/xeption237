import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Product } from '../../types';
import { supabase } from '../../services/supabaseClient';
import StudioSidebar from './StudioSidebar';
import type { StudioTabId } from './studioMenuConfig';
import { STUDIO_MENU_GROUPS } from './studioMenuConfig';
import StudioDashboardTab from './tabs/StudioDashboardTab';
import StudioSystemTab from './tabs/StudioSystemTab';
import ProductImportFunnelTab from '../admin/tabs/ProductImportFunnelTab';
import ProductImagesBulkTab from '../admin/tabs/ProductImagesBulkTab';
import CatalogStructureTab from '../admin/tabs/CatalogStructureTab';
import { useAdminData } from '../../hooks/admin/useAdminData';
import { useCategoriesManager } from '../../hooks/admin/useCategoriesManager';
import { useBrandsManager } from '../../hooks/admin/useBrandsManager';
import { useConfirmModal } from '../../hooks/admin/useConfirmModal';
import ConfirmationModal from '../admin/modals/ConfirmationModal';

interface StudioPanelProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  userEmail?: string;
}

const StudioPanel: React.FC<StudioPanelProps> = ({
  products,
  onUpdateProducts,
  userEmail,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTabId>('dashboard');
  const confirm = useConfirmModal();
  const data = useAdminData();
  const catsMgr = useCategoriesManager({
    categories: data.categories,
    setCategories: data.setCategories,
  });
  const brandMgr = useBrandsManager({
    brands: data.brands,
    setBrands: data.setBrands,
    ranges: data.ranges,
    setRanges: data.setRanges,
  });

  const handleLogout = () => {
    confirm.danger('Déconnexion Studio', 'Fermer la session créateur ?', async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });
  };

  const onDeleteCategory = (id: string) =>
    confirm.danger('Supprimer type', 'Produits liés possibles.', async () => {
      try {
        await catsMgr.deleteCategory(id);
      } catch (e: unknown) {
        console.error(e);
      }
    });

  const activeLabel =
    STUDIO_MENU_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeTab)?.label ?? activeTab;

  return (
    <div className="min-h-screen text-white font-sans selection:bg-violet-500 selection:text-white">
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

      <StudioSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        userEmail={userEmail}
      />

      <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8 min-h-screen relative overflow-x-hidden">
        <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <p className="text-[10px] font-tech uppercase tracking-widest text-violet-400">Studio</p>
            <p className="text-sm font-bold text-white">{activeLabel}</p>
          </div>
          <button onClick={handleLogout} className="text-red-400 p-2" type="button">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 hidden md:block">
          <p className="text-[10px] font-tech uppercase tracking-[0.3em] text-violet-400/80">
            Console créateur
          </p>
          <h1 className="text-xl font-bold font-tech uppercase text-white mt-1">{activeLabel}</h1>
        </div>

        {activeTab === 'dashboard' && <StudioDashboardTab products={products} />}
        {activeTab === 'import' && (
          <ProductImportFunnelTab
            products={products}
            brands={data.brands}
            ranges={data.ranges}
            onUpdateProducts={onUpdateProducts}
          />
        )}
        {activeTab === 'catalog' && (
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
        {activeTab === 'images' && (
          <ProductImagesBulkTab
            products={products}
            brands={data.brands}
            ranges={data.ranges}
            onUpdateProducts={onUpdateProducts}
          />
        )}
        {activeTab === 'system' && <StudioSystemTab />}
      </main>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a12]/95 border-t border-violet-500/20 backdrop-blur-xl">
        <div className="flex justify-around py-2 px-1">
          {STUDIO_MENU_GROUPS.flatMap((g) => g.items).slice(0, 5).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-bold uppercase ${
                activeTab === item.id ? 'text-violet-400' : 'text-gray-500'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.shortLabel}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default StudioPanel;
