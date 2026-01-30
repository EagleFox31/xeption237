
import { useState } from 'react';
import { Product, Category } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { DB_TABLES, DB_SCHEMA } from '../../constants/dbSchema';

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
            condition: 'refurbished',
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

        // MAPPING DB VIA LE SCHEMA CENTRALISÉ
        // On construit l'objet pour Supabase en utilisant les clés exactes du fichier constants/dbSchema.ts
        const dbPayload = {
            [DB_SCHEMA.PRODUCTS.ID]: productData.id,
            [DB_SCHEMA.PRODUCTS.NAME]: productData.name,
            [DB_SCHEMA.PRODUCTS.DESCRIPTION]: productData.description,
            [DB_SCHEMA.PRODUCTS.PRICE]: productData.price,
            [DB_SCHEMA.PRODUCTS.CATEGORY]: productData.category,
            [DB_SCHEMA.PRODUCTS.IMAGE]: productData.image,
            [DB_SCHEMA.PRODUCTS.STOCK]: productData.stock,
            [DB_SCHEMA.PRODUCTS.CONDITION]: productData.condition || 'refurbished',
            
            // Colonnes CamelCase SQL
            [DB_SCHEMA.PRODUCTS.OLD_PRICE]: productData.oldPrice || null,
            [DB_SCHEMA.PRODUCTS.IS_PROMO]: productData.isPromo || false,
            [DB_SCHEMA.PRODUCTS.REVIEW_SHORT]: productData.reviewShort || null,
            
            // Colonnes SnakeCase SQL
            [DB_SCHEMA.PRODUCTS.WARRANTY_MONTHS]: productData.warrantyMonths || 0,
            [DB_SCHEMA.PRODUCTS.IS_FEATURED]: productData.isFeatured || false,
            [DB_SCHEMA.PRODUCTS.PRODUCT_RANGE]: productData.productRange || null,
            [DB_SCHEMA.PRODUCTS.BRAND]: productData.brand || null,
            
            // JSON/Arrays
            [DB_SCHEMA.PRODUCTS.SPECS]: productData.specs,
            [DB_SCHEMA.PRODUCTS.PROS]: productData.pros,
            [DB_SCHEMA.PRODUCTS.CONS]: productData.cons,
            [DB_SCHEMA.PRODUCTS.IMAGES]: productData.images,
            [DB_SCHEMA.PRODUCTS.VIDEO]: productData.video
        };

        const { error } = await supabase.from(DB_TABLES.PRODUCTS).upsert(dbPayload);
        
        if (error) {
            console.error("Save error:", error);
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
        const { error } = await supabase.from(DB_TABLES.PRODUCTS).delete().eq(DB_SCHEMA.PRODUCTS.ID, id);
        if (error) throw error;
        onUpdateProducts(products.filter(p => p.id !== id));
    };

    const toggleFeatured = async (product: Product) => {
        const newValue = !product.isFeatured;
        
        // Utilisation de la clé exacte du schéma
        const { error } = await supabase.from(DB_TABLES.PRODUCTS)
            .update({ [DB_SCHEMA.PRODUCTS.IS_FEATURED]: newValue }) 
            .eq(DB_SCHEMA.PRODUCTS.ID, product.id);
        
        if (error) throw error;

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
