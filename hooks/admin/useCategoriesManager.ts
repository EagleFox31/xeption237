
import { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Category } from '../../types';

interface UseCategoriesManagerProps {
    categories: Category[];
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

export const useCategoriesManager = ({ categories, setCategories }: UseCategoriesManagerProps) => {
    const [newCatName, setNewCatName] = useState('');

    const addCategory = async () => {
        if (!newCatName.trim()) return;
        const slug = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        const { data, error } = await supabase.from('categories').insert([{ name: newCatName, slug }]).select();
        if (!error && data) {
            setCategories(prev => [...prev, data[0] as Category]);
            setNewCatName('');
        } else {
            throw error || new Error("Erreur ajout catégorie");
        }
    };

    const deleteCategory = async (id: string) => {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (!error) {
            setCategories(prev => prev.filter(c => c.id !== id));
        } else {
            throw error;
        }
    };

    return { newCatName, setNewCatName, addCategory, deleteCategory };
};
