
import { useState } from 'react';
import { Product, Category, Brand, ProductRange } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { DB_TABLES, DB_SCHEMA } from '../../constants/dbSchema';
import {
    findBestDuplicateMatch,
    validateProductForSave,
} from '../../utils/productDuplicate';
import { assertRpcSuccess } from '../../utils/rpcResult';

interface UseInventoryManagerProps {
    products: Product[];
    onUpdateProducts: (products: Product[]) => void;
    brands?: Brand[];
    ranges?: ProductRange[];
    confirmDialog?: (
        title: string,
        message: string,
        confirmLabel?: string,
    ) => Promise<boolean>;
}

const labelBrand = (brandId?: string, brands: Brand[] = []) => {
    if (!brandId) return '—';
    return brands.find((b) => b.id === brandId)?.name || brandId;
};

const labelRange = (rangeId?: string, ranges: ProductRange[] = []) => {
    if (!rangeId) return '—';
    return ranges.find((r) => r.id === rangeId)?.name || rangeId;
};

export const useInventoryManager = ({
    products,
    onUpdateProducts,
    brands = [],
    ranges = [],
    confirmDialog,
}: UseInventoryManagerProps) => {
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const startCreate = (categories: Category[]) => {
        setEditingProduct({
            id: `new_${Date.now()}`,
            name: '',
            description: '',
            price: 0,
            category: categories[0]?.slug || '',
            condition: 'refurbished',
            image: '',
            images: [],
            video: '',
            stock: 0,
            isPromo: false,
            isFeatured: false,
            specs: [],
            pros: [],
            cons: [],
            reviews: [],
            warrantyMonths: 0
        });
    };

    const syncCatalogStock = async (productId: string, quantity: number) => {
        const { data, error } = await supabase.rpc('set_product_catalog_stock', {
            p_product_id: productId,
            p_quantity: Math.max(0, quantity),
        });
        if (error) throw error;
        assertRpcSuccess(data, 'Impossible de mettre à jour le stock boutique.');
    };

    const addStockToExisting = async (existingId: string, quantityToAdd: number) => {
        const existing = products.find((p) => p.id === existingId);
        if (!existing) throw new Error('Produit introuvable');

        const newStock = Math.max(0, (existing.stock || 0) + quantityToAdd);
        await syncCatalogStock(existingId, newStock);

        onUpdateProducts(
            products.map((p) => (p.id === existingId ? { ...p, stock: newStock } : p))
        );
        setEditingProduct(null);
    };

    const promptDuplicateMerge = async (
        duplicate: Product,
        candidate: Product,
        level: 'exact' | 'name-brand' | 'name-only'
    ): Promise<boolean> => {
        const qty = Math.max(0, candidate.stock || 0);
        const brandLabel = labelBrand(candidate.brand, brands);
        const rangeLabel = labelRange(candidate.productRange, ranges);
        const dupBrand = labelBrand(duplicate.brand, brands);
        const dupRange = labelRange(duplicate.productRange, ranges);

        const levelNote =
            level === 'exact'
                ? 'Nom, marque et gamme identiques.'
                : level === 'name-brand'
                  ? 'Même nom et marque (gamme différente).'
                  : 'Même nom commercial (marque ou gamme peuvent différer).';

        const message = [
            levelNote,
            '',
            `Existant : ${duplicate.name}`,
            `Marque : ${dupBrand} | Gamme : ${dupRange}`,
            `Stock actuel : ${duplicate.stock ?? 0}`,
            '',
            `Saisie : marque ${brandLabel} | gamme ${rangeLabel}`,
            '',
            qty > 0
                ? `Ajouter ${qty} unité(s) au stock existant plutôt que créer un doublon ?`
                : 'Ouvrir le produit existant pour modifier le stock ?',
        ].join('\n');

        const confirmLabel =
            qty > 0 ? `Ajouter ${qty} au stock` : 'Ouvrir l\'existant';

        const confirmed = confirmDialog
            ? await confirmDialog('Produit similaire déjà en stock', message, confirmLabel)
            : window.confirm(message);

        if (confirmed) {
            if (qty > 0) {
                await addStockToExisting(duplicate.id, qty);
            } else {
                setEditingProduct({ ...duplicate });
            }
            return true;
        }

        return false;
    };

    const saveProduct = async () => {
        if (!editingProduct) return;

        const candidate: Product = {
            ...editingProduct,
            name: editingProduct.name.trim(),
            description: editingProduct.description?.trim() || '',
        };

        const validationErrors = validateProductForSave(candidate);
        if (validationErrors.length > 0) {
            throw new Error(validationErrors.join('\n'));
        }

        const isNew = candidate.id.startsWith('new_');
        const excludeId = isNew ? undefined : candidate.id;
        const match = findBestDuplicateMatch(products, candidate, excludeId);

        if (match) {
            const merged = await promptDuplicateMerge(match.product, candidate, match.level);
            if (merged) return;
            throw new Error(
                'Doublon détecté — modifiez le nom / marque / gamme, ou augmentez le stock du produit existant.'
            );
        }

        const productData = { ...candidate, id: isNew ? crypto.randomUUID() : candidate.id };

        const dbPayload = {
            [DB_SCHEMA.PRODUCTS.ID]: productData.id,
            [DB_SCHEMA.PRODUCTS.NAME]: productData.name,
            [DB_SCHEMA.PRODUCTS.DESCRIPTION]: productData.description,
            [DB_SCHEMA.PRODUCTS.PRICE]: productData.price,
            [DB_SCHEMA.PRODUCTS.CATEGORY]: productData.category,
            [DB_SCHEMA.PRODUCTS.IMAGE]: productData.image,
            [DB_SCHEMA.PRODUCTS.CONDITION]: productData.condition || 'refurbished',
            [DB_SCHEMA.PRODUCTS.RATING]: productData.rating || 5,
            [DB_SCHEMA.PRODUCTS.OLD_PRICE]: productData.oldPrice || null,
            [DB_SCHEMA.PRODUCTS.IS_PROMO]: productData.isPromo || false,
            [DB_SCHEMA.PRODUCTS.REVIEW_SHORT]: productData.reviewShort || null,
            [DB_SCHEMA.PRODUCTS.WARRANTY_MONTHS]: productData.warrantyMonths || 0,
            [DB_SCHEMA.PRODUCTS.IS_FEATURED]: productData.isFeatured || false,
            [DB_SCHEMA.PRODUCTS.PRODUCT_RANGE]: productData.productRange || null,
            [DB_SCHEMA.PRODUCTS.BRAND]: productData.brand || null,
            [DB_SCHEMA.PRODUCTS.SPECS]: productData.specs,
            [DB_SCHEMA.PRODUCTS.PROS]: productData.pros,
            [DB_SCHEMA.PRODUCTS.CONS]: productData.cons,
            [DB_SCHEMA.PRODUCTS.IMAGES]: productData.images,
            [DB_SCHEMA.PRODUCTS.VIDEO]: productData.video,
            [DB_SCHEMA.PRODUCTS.REVIEWS]: productData.reviews,
        };

        const { error } = await supabase.from(DB_TABLES.PRODUCTS).upsert(dbPayload);

        if (error) {
            console.error('Save error:', error);
            if (error.code === '23503') {
                throw new Error(`La catégorie "${candidate.category}" n'existe pas.`);
            }
            throw error;
        }

        await syncCatalogStock(productData.id, productData.stock ?? 0);

        const newProductList = isNew
            ? [...products, productData]
            : products.map((p) => (p.id === productData.id ? productData : p));

        onUpdateProducts(newProductList);
        setEditingProduct(null);
    };

    const deleteProduct = async (id: string) => {
        const { error } = await supabase.from(DB_TABLES.PRODUCTS).delete().eq(DB_SCHEMA.PRODUCTS.ID, id);
        if (error) throw error;
        onUpdateProducts(products.filter((p) => p.id !== id));
    };

    const toggleFeatured = async (product: Product) => {
        const newValue = !product.isFeatured;

        const { error } = await supabase
            .from(DB_TABLES.PRODUCTS)
            .update({ [DB_SCHEMA.PRODUCTS.IS_FEATURED]: newValue })
            .eq(DB_SCHEMA.PRODUCTS.ID, product.id);

        if (error) throw error;

        onUpdateProducts(products.map((p) => (p.id === product.id ? { ...p, isFeatured: newValue } : p)));
    };

    return {
        editingProduct,
        setEditingProduct,
        startCreate,
        saveProduct,
        deleteProduct,
        toggleFeatured,
    };
};
