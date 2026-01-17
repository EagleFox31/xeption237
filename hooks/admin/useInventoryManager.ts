
import { useState } from 'react';
import { Product, Category } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { uploadImageToCloudinary } from '../../services/uploadService';
import { generateProductDetails } from '../../services/geminiService';

interface UseInventoryManagerProps {
    products: Product[];
    onUpdateProducts: (products: Product[]) => void;
}

export const useInventoryManager = ({ products, onUpdateProducts }: UseInventoryManagerProps) => {
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const startCreate = (categories: Category[]) => {
        setEditingProduct({
            id: `new_${Date.now()}`,
            name: '',
            description: '',
            price: 0,
            category: categories[0]?.slug || '',
            image: 'https://via.placeholder.com/400',
            images: [],
            video: '',
            stock: 0,
            isPromo: false,
            isFeatured: false, // Default value
            specs: [],
            pros: [],
            cons: [],
            warrantyMonths: 0
        });
    };

    const saveProduct = async () => {
        if (!editingProduct) return;
        if (!editingProduct.category) throw new Error("Catégorie invalide");

        const isNew = editingProduct.id.startsWith('new_');
        const productData = { ...editingProduct, id: isNew ? crypto.randomUUID() : editingProduct.id };

        // MAPPING: Frontend (camelCase) -> DB (snake_case)
        const dbPayload = {
            ...productData,
            warranty_months: productData.warrantyMonths, // Important: Mapping explicite
            is_featured: productData.isFeatured // Important: Mapping explicite
        };
        
        // On nettoie les clés camelCase pour éviter que Supabase ne râle si le mode strict est activé (optionnel mais propre)
        delete (dbPayload as any).warrantyMonths;
        delete (dbPayload as any).isFeatured;

        const { error } = await supabase.from('products').upsert(dbPayload);
        
        if (error) {
            console.error("Save error:", error);
            if (error.code === '23503') throw new Error(`La catégorie "${editingProduct.category}" n'existe pas.`);
            if (error.message.includes('column')) throw new Error(`Erreur de colonne DB: ${error.message}. Vérifiez le snake_case.`);
            throw error;
        }

        const newProductList = isNew 
            ? [...products, productData] 
            : products.map(p => p.id === productData.id ? productData : p);
        
        onUpdateProducts(newProductList);
        setEditingProduct(null);
    };

    const deleteProduct = async (id: string) => {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        onUpdateProducts(products.filter(p => p.id !== id));
    };

    const toggleFeatured = async (product: Product) => {
        const newValue = !product.isFeatured;
        
        // UPDATE DB using snake_case column name
        const { error } = await supabase.from('products')
            .update({ is_featured: newValue }) 
            .eq('id', product.id);
        
        if (error) throw error;

        // Update local state immediately for snappy UI
        onUpdateProducts(products.map(p => p.id === product.id ? { ...p, isFeatured: newValue } : p));
    };

    return {
        editingProduct,
        setEditingProduct,
        startCreate,
        saveProduct,
        deleteProduct,
        toggleFeatured
    };
};
