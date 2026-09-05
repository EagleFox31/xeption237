
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Brand, ProductRange } from '../../types';
import { DB_TABLES, DB_SCHEMA } from '../../constants/dbSchema';
import { isUuid, resolveBrandKeyToDbId, getBrandDisplayName } from '../../utils/productBrand';

interface UseBrandsManagerProps {
    brands: Brand[];
    setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
    ranges: ProductRange[];
    setRanges: React.Dispatch<React.SetStateAction<ProductRange[]>>;
}

export const slugifyCatalogLabel = (name: string): string =>
    name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

export const useBrandsManager = ({ brands, setBrands, ranges, setRanges }: UseBrandsManagerProps) => {
    const [newBrandName, setNewBrandName] = useState('');
    const [newRangeName, setNewRangeName] = useState('');
    const [selectedBrandForRange, setSelectedBrandForRange] = useState<string>('');
    const [selectedCategoryForRange, setSelectedCategoryForRange] = useState<string>(''); 

    // --- MARQUES ---
    const addBrand = async (): Promise<string | null> => {
        if (!newBrandName.trim()) return null;
        const slug = newBrandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        const payload = {
            [DB_SCHEMA.BRANDS.NAME]: newBrandName,
            [DB_SCHEMA.BRANDS.SLUG]: slug
        };

        const { data, error } = await supabase.from(DB_TABLES.BRANDS).insert([payload]).select();
        if (!error && data) {
            const newId = data[0][DB_SCHEMA.BRANDS.ID] as string;
            setBrands(prev => [...prev, {
                id: newId,
                name: data[0][DB_SCHEMA.BRANDS.NAME],
                slug: data[0][DB_SCHEMA.BRANDS.SLUG]
            }]);
            setNewBrandName('');
            return newId;
        } else {
            throw error || new Error("Erreur ajout marque");
        }
    };

    const deleteBrand = async (id: string) => {
        const { error } = await supabase.from(DB_TABLES.BRANDS).delete().eq(DB_SCHEMA.BRANDS.ID, id);
        if (!error) {
            setBrands(prev => prev.filter(b => b.id !== id));
            // Cascade delete dans la DB, mais on update l'UI aussi
            setRanges(prev => prev.filter(r => r.brand_id !== id));
        } else {
            throw error;
        }
    };

    // --- GAMMES ---
    const ensureBrandId = async (brandKey: string): Promise<string> => {
        const brandRefs = brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug }));
        const resolved = resolveBrandKeyToDbId(brandKey, brandRefs);
        if (resolved && isUuid(resolved)) return resolved;

        const slugFromKey = brandKey.startsWith('name:')
            ? slugifyCatalogLabel(brandKey.slice(5))
            : slugifyCatalogLabel(brandKey);
        const displayName = brandKey.startsWith('name:')
            ? getBrandDisplayName(brandKey, brandRefs)
            : brandKey.trim();

        const { data: existing } = await supabase
            .from(DB_TABLES.BRANDS)
            .select('*')
            .eq(DB_SCHEMA.BRANDS.SLUG, slugFromKey)
            .maybeSingle();

        if (existing) {
            const row = existing as Record<string, string>;
            const id = row[DB_SCHEMA.BRANDS.ID];
            setBrands((prev) =>
                prev.some((b) => b.id === id)
                    ? prev
                    : [
                          ...prev,
                          {
                              id,
                              name: row[DB_SCHEMA.BRANDS.NAME],
                              slug: row[DB_SCHEMA.BRANDS.SLUG],
                          },
                      ],
            );
            return id;
        }

        const payload = {
            [DB_SCHEMA.BRANDS.NAME]: displayName,
            [DB_SCHEMA.BRANDS.SLUG]: slugFromKey,
        };
        const { data, error } = await supabase.from(DB_TABLES.BRANDS).insert([payload]).select();
        if (error || !data?.[0]) {
            throw error || new Error(`Impossible de créer la marque « ${displayName} ».`);
        }

        const created: Brand = {
            id: data[0][DB_SCHEMA.BRANDS.ID],
            name: data[0][DB_SCHEMA.BRANDS.NAME],
            slug: data[0][DB_SCHEMA.BRANDS.SLUG],
        };
        setBrands((prev) => [...prev, created]);
        return created.id;
    };

    const createRange = async (params: {
        name: string;
        brandId: string;
        category: string;
    }): Promise<ProductRange> => {
        const name = params.name.trim();
        if (!name) throw new Error('Nom de gamme obligatoire.');
        if (!params.brandId) throw new Error('Marque obligatoire pour créer une gamme.');
        if (!params.category) throw new Error('Type de produit obligatoire pour créer une gamme.');

        const brandId = await ensureBrandId(params.brandId);

        const slug = slugifyCatalogLabel(name);
        const payload = {
            [DB_SCHEMA.PRODUCT_RANGES.NAME]: name,
            [DB_SCHEMA.PRODUCT_RANGES.SLUG]: slug,
            [DB_SCHEMA.PRODUCT_RANGES.BRAND_ID]: brandId,
            [DB_SCHEMA.PRODUCT_RANGES.CATEGORY]: params.category,
        };

        const { data, error } = await supabase.from(DB_TABLES.PRODUCT_RANGES).insert([payload]).select();
        if (error || !data?.[0]) {
            console.error(error);
            const detail = error?.message ?? 'Erreur lors de la création de la gamme.';
            throw new Error(detail);
        }

        const created: ProductRange = {
            id: data[0][DB_SCHEMA.PRODUCT_RANGES.ID],
            name: data[0][DB_SCHEMA.PRODUCT_RANGES.NAME],
            slug: data[0][DB_SCHEMA.PRODUCT_RANGES.SLUG],
            brand_id: data[0][DB_SCHEMA.PRODUCT_RANGES.BRAND_ID],
            category: data[0][DB_SCHEMA.PRODUCT_RANGES.CATEGORY],
        };
        setRanges((prev) => [...prev, created]);
        return created;
    };

    const addRange = async () => {
        if (!newRangeName.trim() || !selectedBrandForRange) return;
        await createRange({
            name: newRangeName,
            brandId: selectedBrandForRange,
            category: selectedCategoryForRange,
        });
        setNewRangeName('');
    };

    const deleteRange = async (id: string) => {
        const { error } = await supabase.from(DB_TABLES.PRODUCT_RANGES).delete().eq(DB_SCHEMA.PRODUCT_RANGES.ID, id);
        if (!error) {
            setRanges(prev => prev.filter(r => r.id !== id));
        } else {
            throw error;
        }
    };

    return { 
        newBrandName, setNewBrandName, addBrand, deleteBrand,
        newRangeName, setNewRangeName, selectedBrandForRange, setSelectedBrandForRange, 
        selectedCategoryForRange, setSelectedCategoryForRange, 
        createRange, addRange, deleteRange
    };
};
