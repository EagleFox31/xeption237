
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Brand, ProductRange } from '../../types';
import { DB_TABLES, DB_SCHEMA } from '../../constants/dbSchema';

interface UseBrandsManagerProps {
    brands: Brand[];
    setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
    ranges: ProductRange[];
    setRanges: React.Dispatch<React.SetStateAction<ProductRange[]>>;
}

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
    const addRange = async () => {
        if (!newRangeName.trim() || !selectedBrandForRange) return;
        const slug = newRangeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // Utilisation stricte des constantes SnakeCase
        const payload = { 
            [DB_SCHEMA.PRODUCT_RANGES.NAME]: newRangeName, 
            [DB_SCHEMA.PRODUCT_RANGES.SLUG]: slug, 
            [DB_SCHEMA.PRODUCT_RANGES.BRAND_ID]: selectedBrandForRange,
            [DB_SCHEMA.PRODUCT_RANGES.CATEGORY]: selectedCategoryForRange || null
        };

        const { data, error } = await supabase.from(DB_TABLES.PRODUCT_RANGES).insert([payload]).select();

        if (!error && data) {
            setRanges(prev => [...prev, {
                id: data[0][DB_SCHEMA.PRODUCT_RANGES.ID],
                name: data[0][DB_SCHEMA.PRODUCT_RANGES.NAME],
                slug: data[0][DB_SCHEMA.PRODUCT_RANGES.SLUG],
                brand_id: data[0][DB_SCHEMA.PRODUCT_RANGES.BRAND_ID],
                category: data[0][DB_SCHEMA.PRODUCT_RANGES.CATEGORY]
            }]);
            setNewRangeName('');
        } else {
            console.error(error);
            throw error || new Error("Erreur ajout gamme");
        }
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
        addRange, deleteRange
    };
};
