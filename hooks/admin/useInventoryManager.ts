
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
            condition: 'refurbished', // Valeur par défaut demandée
            image: 'https://via.placeholder.com/400',
            images: [],
            video: '',
            stock: 0,
            isPromo: false,
            isFeatured: false, 
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

        // MAPPING DB
        // Correction globale : Envoi en CamelCase pour correspondre à isPromo, reviewShort, etc.
        const dbPayload = {
            ...productData,
            
            // Colonnes composées en CamelCase (Hypothèse forte basée sur isPromo)
            productRange: productData.productRange || null,
            brand: productData.brand || null,
            oldPrice: productData.oldPrice || null,
            warrantyMonths: productData.warrantyMonths || 0,
            isFeatured: productData.isFeatured || false,
            
            // Valeurs par défaut
            condition: productData.condition || 'refurbished',
            isPromo: productData.isPromo ?? false,
        };
        
        // On supprime les champs qui ne sont pas des colonnes (si nécessaire, mais ici on envoie tout ce qui matche)
        
        const { error } = await supabase.from('products').upsert(dbPayload);
        
        if (error) {
            console.error("Save error:", error);
            if (error.code === '23503') throw new Error(`La catégorie "${editingProduct.category}" n'existe pas.`);
            if (error.message.includes('column')) throw new Error(`Erreur Colonne DB : ${error.message}. Vérifiez le nom exact dans Supabase.`);
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
        
        // Tentative d'update sur isFeatured (CamelCase)
        const { error } = await supabase.from('products')
            .update({ isFeatured: newValue } as any) 
            .eq('id', product.id);
        
        if (error) {
             // Fallback si la colonne est is_featured (snake_case)
             if (error.message.includes('column')) {
                 const { error: retryError } = await supabase.from('products')
                    .update({ is_featured: newValue } as any) 
                    .eq('id', product.id);
                 if (retryError) throw retryError;
             } else {
                 throw error;
             }
        }

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
