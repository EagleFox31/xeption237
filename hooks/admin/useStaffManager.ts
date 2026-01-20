
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Staff } from '../../types';

interface UseStaffManagerProps {
    staffMembers: Staff[];
    setStaffMembers: React.Dispatch<React.SetStateAction<Staff[]>>;
}

export const useStaffManager = ({ staffMembers, setStaffMembers }: UseStaffManagerProps) => {
    const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null);

    const openEditor = (staff?: Staff) => {
        setEditingStaff(staff || {
            id: `new_${Date.now()}`,
            username: '', name: '', email: '', password: '123456', role: 'editor', phone: ''
        });
    };

    const closeEditor = () => setEditingStaff(null);

    const saveStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStaff) return;

        const isNew = editingStaff.id?.startsWith('new_');
        const { username, ...cleanData } = editingStaff as any;
        const staffData = { ...cleanData, id: isNew ? undefined : editingStaff.id };

        const { data, error } = await supabase.from('staff').upsert(staffData).select();

        if (!error && data) {
            const saved = data[0] as Staff;
            setStaffMembers(prev => isNew ? [...prev, saved] : prev.map(s => s.id === saved.id ? saved : s));
            closeEditor();
        } else {
            throw error || new Error("Erreur sauvegarde staff");
        }
    };

    const deleteStaff = async (id: string) => {
        const { error } = await supabase.from('staff').delete().eq('id', id);
        if (!error) {
            setStaffMembers(prev => prev.filter(s => s.id !== id));
        } else {
            throw error;
        }
    };

    return { editingStaff, setEditingStaff, openEditor, closeEditor, saveStaff, deleteStaff };
};
