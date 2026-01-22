
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

        // MAPPING: Frontend (camelCase) -> DB
        // Note: La DB semble avoir des colonnes mixtes (isPromo, reviewShort) et snake_case.
        const dbPayload = {
            ...productData,
            old_price: productData.oldPrice,
            // isPromo: Est déjà dans productData, on ne le renomme pas en 'ispromo' car la colonne DB est 'isPromo'
            warranty_months: productData.warrantyMonths, 
            is_featured: productData.isFeatured ?? false,
            product_range: productData.productRange || null,
            brand: productData.brand || null,
            condition: productData.condition || 'refurbished' // Assurance mapping
        };
        
        // On nettoie les clés camelCase qui ont été mappées ou qui ne sont pas en DB
        delete (dbPayload as any).oldPrice;
        // delete (dbPayload as any).isPromo; // On garde isPromo car la colonne existe en camelCase
        delete (dbPayload as any).warrantyMonths;
        delete (dbPayload as any).isFeatured;
        delete (dbPayload as any).productRange;

        const { error } = await supabase.from('products').upsert(dbPayload);
        
        if (error) {
            console.error("Save error:", error);
            if (error.code === '23503') throw new Error(`La catégorie "${editingProduct.category}" n'existe pas.`);
            if (error.message.includes('column')) throw new Error(`Colonne manquante en DB : ${error.message}.`);
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
        
        // Tentative d'update sur is_featured (snake_case) standard
        const { error } = await supabase.from('products')
            .update({ is_featured: newValue }) 
            .eq('id', product.id);
        
        if (error) {
             // Fallback si la colonne est isFeatured (camelCase)
             if (error.message.includes('is_featured')) {
                 const { error: retryError } = await supabase.from('products')
                    .update({ isFeatured: newValue } as any) 
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
