
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

        const { error } = await supabase.from('products').upsert(productData);
        if (error) {
            if (error.code === '23503') throw new Error(`La catégorie "${editingProduct.category}" n'existe pas.`);
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

    return {
        editingProduct,
        setEditingProduct,
        startCreate,
        saveProduct,
        deleteProduct
    };
};
