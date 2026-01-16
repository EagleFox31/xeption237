
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
    const [isGenerating, setIsGenerating] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

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

    // --- Sub-actions for the Editor ---
    // Note: These manipulate the `editingProduct` state directly
    const handleImageUpload = async (file: File) => {
        if (!editingProduct) return;
        setUploadingImage(true);
        try {
            const url = await uploadImageToCloudinary(file);
            setEditingProduct({ ...editingProduct, image: url });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleAiGeneration = async () => {
        if (!editingProduct?.name) return;
        setIsGenerating(true);
        try {
            const details = await generateProductDetails(editingProduct.name, editingProduct.category);
            setEditingProduct(prev => prev ? ({ ...prev, ...details }) : null);
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        editingProduct,
        setEditingProduct,
        isGenerating,
        uploadingImage,
        startCreate,
        saveProduct,
        deleteProduct,
        handleImageUpload,
        handleAiGeneration
    };
};
