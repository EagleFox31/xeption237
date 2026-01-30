
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Pack, PackItem, Product } from '../../types';
import { DB_TABLES, DB_SCHEMA } from '../../constants/dbSchema';

export const usePacksManager = (products: Product[]) => {
    const [packs, setPacks] = useState<Pack[]>([]);
    const [editingPack, setEditingPack] = useState<Pack | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch Packs
    const fetchPacks = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from(DB_TABLES.PACKS).select('*').order(DB_SCHEMA.PACKS.CREATED_AT, { ascending: false });
        if (data && !error) {
            // Mapping inverse DB -> App via le schéma
            const mappedPacks = data.map((pack: any) => ({
                id: pack[DB_SCHEMA.PACKS.ID],
                name: pack[DB_SCHEMA.PACKS.NAME],
                description: pack[DB_SCHEMA.PACKS.DESCRIPTION],
                image: pack[DB_SCHEMA.PACKS.IMAGE],
                price: pack[DB_SCHEMA.PACKS.PRICE],
                validUntil: pack[DB_SCHEMA.PACKS.VALID_UNTIL],
                isFeatured: pack[DB_SCHEMA.PACKS.IS_FEATURED],
                items: Array.isArray(pack[DB_SCHEMA.PACKS.ITEMS]) ? pack[DB_SCHEMA.PACKS.ITEMS] : []
            }));
            setPacks(mappedPacks);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchPacks();
    }, [fetchPacks]);

    const startCreate = () => {
        setEditingPack({
            id: `new_${Date.now()}`,
            name: '',
            description: '',
            image: '',
            price: 0,
            items: [],
            validUntil: undefined,
            isFeatured: false
        });
    };

    const savePack = async () => {
        if (!editingPack) return;
        if (editingPack.items.length === 0) throw new Error("Un pack doit contenir au moins 1 produit.");
        if (!editingPack.name || editingPack.price <= 0) throw new Error("Nom et Prix obligatoires.");

        const isNew = editingPack.id.startsWith('new_');
        const packId = isNew ? crypto.randomUUID() : editingPack.id;

        // Préparation Payload DB via Schema
        const payload = {
            [DB_SCHEMA.PACKS.ID]: packId,
            [DB_SCHEMA.PACKS.NAME]: editingPack.name,
            [DB_SCHEMA.PACKS.DESCRIPTION]: editingPack.description,
            [DB_SCHEMA.PACKS.IMAGE]: editingPack.image,
            [DB_SCHEMA.PACKS.PRICE]: editingPack.price,
            [DB_SCHEMA.PACKS.VALID_UNTIL]: editingPack.validUntil || null,
            [DB_SCHEMA.PACKS.ITEMS]: editingPack.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
            [DB_SCHEMA.PACKS.IS_FEATURED]: editingPack.isFeatured || false
        };

        const { error } = await supabase.from(DB_TABLES.PACKS).upsert(payload);

        if (error) {
            console.error("Pack Save Error:", error);
            throw error;
        }

        fetchPacks();
        setEditingPack(null);
    };

    const deletePack = async (id: string) => {
        const { error } = await supabase.from(DB_TABLES.PACKS).delete().eq('id', id);
        if (!error) {
            setPacks(prev => prev.filter(p => p.id !== id));
        } else {
            throw error;
        }
    };

    const getHydratedItems = (items: PackItem[]) => {
        return items.map(item => ({
            ...item,
            product: products.find(p => p.id === item.productId)
        }));
    };

    return {
        packs,
        editingPack,
        setEditingPack,
        isLoading,
        startCreate,
        savePack,
        deletePack,
        getHydratedItems
    };
};
