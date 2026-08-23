import { useCallback, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Store } from '../../types';
import { DB_SCHEMA, DB_TABLES } from '../../constants/dbSchema';

const slugifyCode = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `boutique-${Date.now()}`;

const mapStore = (row: Record<string, unknown>): Store => ({
  id: row[DB_SCHEMA.STORES.ID] as string,
  code: row[DB_SCHEMA.STORES.CODE] as string,
  name: row[DB_SCHEMA.STORES.NAME] as string,
  city: (row[DB_SCHEMA.STORES.CITY] as string | null) ?? null,
  address: (row[DB_SCHEMA.STORES.ADDRESS] as string | null) ?? null,
  active: row[DB_SCHEMA.STORES.ACTIVE] !== false,
  is_default: row[DB_SCHEMA.STORES.IS_DEFAULT] === true,
  created_at: row[DB_SCHEMA.STORES.CREATED_AT] as string | undefined,
  updated_at: row[DB_SCHEMA.STORES.UPDATED_AT] as string | undefined,
});

export const useStoresManager = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingStore, setEditingStore] = useState<Partial<Store> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(DB_TABLES.STORES)
      .select('*')
      .order(DB_SCHEMA.STORES.IS_DEFAULT, { ascending: false })
      .order(DB_SCHEMA.STORES.NAME, { ascending: true });
    if (error) throw error;
    setStores((data ?? []).map((row) => mapStore(row as Record<string, unknown>)));
    setLoading(false);
  }, []);

  const openEditor = (store?: Store) => {
    setEditingStore(
      store ?? {
        id: `new_${Date.now()}`,
        code: '',
        name: '',
        city: '',
        address: '',
        active: true,
        is_default: false,
      },
    );
  };

  const closeEditor = () => setEditingStore(null);

  const saveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore?.name?.trim()) throw new Error('Le nom de la boutique est obligatoire.');

    setIsSaving(true);
    try {
      const isNew = (editingStore.id ?? '').startsWith('new_');
      const code = (editingStore.code?.trim() || slugifyCode(editingStore.name)).toLowerCase();
      const payload: Record<string, unknown> = {
        [DB_SCHEMA.STORES.CODE]: code,
        [DB_SCHEMA.STORES.NAME]: editingStore.name.trim(),
        [DB_SCHEMA.STORES.CITY]: editingStore.city?.trim() || null,
        [DB_SCHEMA.STORES.ADDRESS]: editingStore.address?.trim() || null,
        [DB_SCHEMA.STORES.ACTIVE]: editingStore.active !== false,
        [DB_SCHEMA.STORES.IS_DEFAULT]: editingStore.is_default === true,
        [DB_SCHEMA.STORES.UPDATED_AT]: new Date().toISOString(),
      };

      if (editingStore.is_default) {
        await supabase.from(DB_TABLES.STORES).update({ is_default: false }).eq('is_default', true);
      }

      let saved: Store;
      if (isNew) {
        const { data, error } = await supabase.from(DB_TABLES.STORES).insert([payload]).select().single();
        if (error) throw error;
        saved = mapStore(data as Record<string, unknown>);
      } else {
        const { data, error } = await supabase
          .from(DB_TABLES.STORES)
          .update(payload)
          .eq(DB_SCHEMA.STORES.ID, editingStore.id!)
          .select()
          .single();
        if (error) throw error;
        saved = mapStore(data as Record<string, unknown>);
      }

      setStores((prev) => {
        const withoutDefaultFlip = prev.map((s) =>
          saved.is_default && s.id !== saved.id ? { ...s, is_default: false } : s,
        );
        return isNew
          ? [...withoutDefaultFlip, saved].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
          : withoutDefaultFlip.map((s) => (s.id === saved.id ? saved : s));
      });
      closeEditor();
    } finally {
      setIsSaving(false);
    }
  };

  const deactivateStore = async (store: Store) => {
    const { count } = await supabase
      .from(DB_TABLES.STORE_STOCK)
      .select('*', { count: 'exact', head: true })
      .eq(DB_SCHEMA.STORE_STOCK.STORE_ID, store.id)
      .gt(DB_SCHEMA.STORE_STOCK.QUANTITY, 0);

    if ((count ?? 0) > 0) {
      throw new Error('Transférez ou répartissez le stock avant de désactiver cette boutique.');
    }

    const { error } = await supabase
      .from(DB_TABLES.STORES)
      .update({ active: false, is_default: false })
      .eq(DB_SCHEMA.STORES.ID, store.id);
    if (error) throw error;
    await fetchStores();
  };

  return {
    stores,
    loading,
    fetchStores,
    editingStore,
    setEditingStore,
    openEditor,
    closeEditor,
    saveStore,
    deactivateStore,
    isSaving,
  };
};
