
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Brand, ProductRange } from '../../types';

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
    const addBrand = async () => {
        if (!newBrandName.trim()) return;
        const slug = newBrandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        const { data, error } = await supabase.from('brands').insert([{ name: newBrandName, slug }]).select();
        if (!error && data) {
            setBrands(prev => [...prev, data[0] as Brand]);
            setNewBrandName('');
        } else {
            throw error || new Error("Erreur ajout marque");
        }
    };

    const deleteBrand = async (id: string) => {
        const { error } = await supabase.from('brands').delete().eq('id', id);
        if (!error) {
            setBrands(prev => prev.filter(b => b.id !== id));
            setRanges(prev => prev.filter(r => r.brand_id !== id));
        } else {
            throw error;
        }
    };

    // --- GAMMES ---
    const addRange = async () => {
        if (!newRangeName.trim() || !selectedBrandForRange) return;
        const slug = newRangeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // Payload CamelCase
        const payload: any = { 
            name: newRangeName, 
            slug, 
            brandId: selectedBrandForRange  // CAMELCASE
        };
        if (selectedCategoryForRange) {
            payload.category = selectedCategoryForRange;
        }

        let { data, error } = await supabase.from('product_ranges').insert([payload]).select();

        // Fallback
        if (error && error.message.includes('column')) {
             const snakePayload: any = { 
                name: newRangeName, 
                slug, 
                brand_id: selectedBrandForRange 
            };
            if (selectedCategoryForRange) snakePayload.category = selectedCategoryForRange;
            const res = await supabase.from('product_ranges').insert([snakePayload]).select();
            data = res.data;
            error = res.error;
        }

        if (!error && data) {
            setRanges(prev => [...prev, data[0] as ProductRange]);
            setNewRangeName('');
        } else {
            throw error || new Error("Erreur ajout gamme");
        }
    };

    const deleteRange = async (id: string) => {
        const { error } = await supabase.from('product_ranges').delete().eq('id', id);
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
