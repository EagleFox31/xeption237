import React, { useEffect, useMemo, useState } from 'react';
import { Product, Category } from '../../types';
import { supabase } from '../../services/supabaseClient';
import AirportFlipCounter from './AirportFlipCounter';

interface ShopHeroProps {
  products: Product[];
  activeFilter: string;
  searchQuery?: string;
  productCount?: number;
}

const getCategoryHeroCopy = (slug: string, name: string) => {
  if (slug === 'phones' || slug === 'smartphones') {
    return {
      title: 'Smartphones',
      subtitle:
        'iPhone, Samsung Galaxy, Xiaomi, Tecno — neufs et reconditionnés, livraison Yaoundé & Douala.',
    };
  }
  if (slug === 'tablets' || slug === 'tablettes') {
    return {
      title: 'Tablettes',
      subtitle: 'iPad, Galaxy Tab, Xiaomi Pad et tablettes robustes pour le travail et les études.',
    };
  }
  if (slug === 'laptops' || slug === 'ordinateurs') {
    return {
      title: 'PC & Laptops',
      subtitle: 'MacBook, Dell XPS, HP Omen — machines pro et gaming au prix du Mboa.',
    };
  }
  if (slug === 'gaming' || slug === 'consoles') {
    return {
      title: 'Gaming & Consoles',
      subtitle: 'PS5, accessoires gamer et setups pour jouer sans compromis.',
    };
  }
  if (slug === 'accessories') {
    return {
      title: 'Accessoires',
      subtitle: 'Montres, écouteurs, coques et gadgets pour compléter ton setup.',
    };
  }
  return {
    title: name,
    subtitle: `Découvre notre sélection ${name.toLowerCase()} chez Xeption Network.`,
  };
};

const ShopHero: React.FC<ShopHeroProps> = ({
  products,
  activeFilter,
  searchQuery = '',
  productCount,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (data) setCategories(data as Category[]);
    };
    void fetchCats();
  }, []);

  const scopedProducts = useMemo(() => {
    if (activeFilter === 'all') return products;
    return products.filter((p) => p.category === activeFilter);
  }, [products, activeFilter]);

  const displayCount = productCount ?? scopedProducts.length;
  const digitMin = displayCount >= 1000 ? 4 : displayCount >= 100 ? 3 : 2;

  const activeCategory = categories.find((c) => c.slug === activeFilter);
  const defaultCopy = {
    title: 'Catalogue High-Tech',
    subtitle:
      'Smartphones, PC, gaming et accessoires — le Ndamba du digital au Cameroun, livraison partout au 237.',
  };

  const copy =
    activeFilter === 'all'
      ? defaultCopy
      : getCategoryHeroCopy(activeFilter, activeCategory?.name || activeFilter);

  return (
    <section className="relative border-b border-white/10 bg-black/70 backdrop-blur-sm shadow-lg">
      <div className="absolute inset-0 tech-pattern opacity-[0.04] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-xeption-gold/40 to-transparent" />
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-4 md:pt-5 md:pb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-8">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-tech uppercase tracking-[0.25em] text-xeption-gold mb-1.5">
              Boutique Xeption · 237
            </p>
            <h1 className="text-xl md:text-3xl font-tech font-bold uppercase text-white tracking-wide leading-tight">
              {copy.title}
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1.5 max-w-2xl leading-relaxed">{copy.subtitle}</p>
            {searchQuery.trim() ? (
              <div className="mt-2.5">
                <span className="text-xs text-xeption-gold/90 font-mono border border-xeption-gold/30 px-2 py-0.5 rounded-sm">
                  Recherche : « {searchQuery.trim()} »
                </span>
              </div>
            ) : null}
          </div>

          <AirportFlipCounter
            value={displayCount}
            label="Produits"
            minDigits={digitMin}
          />
        </div>
      </div>
    </section>
  );
};

export default ShopHero;
