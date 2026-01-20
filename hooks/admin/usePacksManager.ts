
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Pack, PackItem, Product } from '../../types';

export const usePacksManager = (products: Product[]) => {
    const [packs, setPacks] = useState<Pack[]>([]);
    const [editingPack, setEditingPack] = useState<Pack | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch Packs
    const fetchPacks = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('packs').select('*').order('created_at', { ascending: false });
        if (data && !error) {
            // Mapping pour s'assurer que les items ont les détails produits (si possible côté client pour simplifier)
            const mappedPacks = data.map((pack: any) => ({
                ...pack,
                validUntil: pack.valid_until,
                // On s'assure que items est un tableau
                items: Array.isArray(pack.items) ? pack.items : []
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

        // Préparation Payload DB (On stocke les items en JSONB pour simplifier le POC)
        const payload = {
            id: packId,
            name: editingPack.name,
            description: editingPack.description,
            image: editingPack.image,
            price: editingPack.price,
            valid_until: editingPack.validUntil || null,
            items: editingPack.items.map(i => ({ productId: i.productId, quantity: i.quantity })), // On ne garde que les IDs
            is_featured: editingPack.isFeatured || false
        };

        const { error } = await supabase.from('packs').upsert(payload);

        if (error) throw error;

        fetchPacks();
        setEditingPack(null);
    };

    const deletePack = async (id: string) => {
        const { error } = await supabase.from('packs').delete().eq('id', id);
        if (!error) {
            setPacks(prev => prev.filter(p => p.id !== id));
        } else {
            throw error;
        }
    };

    // Helper pour hydrater les produits d'un pack pour l'affichage
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
