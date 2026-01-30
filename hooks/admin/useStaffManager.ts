
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Staff } from '../../types';
import { DB_TABLES, DB_SCHEMA } from '../../constants/dbSchema';

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
        
        // Construction Payload DB
        const payload = {
            [DB_SCHEMA.STAFF.NAME]: cleanData.name,
            [DB_SCHEMA.STAFF.EMAIL]: cleanData.email,
            [DB_SCHEMA.STAFF.PASSWORD]: cleanData.password,
            [DB_SCHEMA.STAFF.ROLE]: cleanData.role,
            [DB_SCHEMA.STAFF.PHONE]: cleanData.phone
        };
        
        if (!isNew) {
            (payload as any)[DB_SCHEMA.STAFF.ID] = editingStaff.id;
        }

        const { data, error } = await supabase.from(DB_TABLES.STAFF).upsert(payload).select();

        if (!error && data) {
            const savedDb = data[0];
            const savedApp: Staff = {
                id: savedDb[DB_SCHEMA.STAFF.ID],
                name: savedDb[DB_SCHEMA.STAFF.NAME],
                email: savedDb[DB_SCHEMA.STAFF.EMAIL],
                role: savedDb[DB_SCHEMA.STAFF.ROLE],
                username: savedDb[DB_SCHEMA.STAFF.NAME] // Fallback
            };
            setStaffMembers(prev => isNew ? [...prev, savedApp] : prev.map(s => s.id === savedApp.id ? savedApp : s));
            closeEditor();
        } else {
            console.error(error);
            throw error || new Error("Erreur sauvegarde staff");
        }
    };

    const deleteStaff = async (id: string) => {
        const { error } = await supabase.from(DB_TABLES.STAFF).delete().eq(DB_SCHEMA.STAFF.ID, id);
        if (!error) {
            setStaffMembers(prev => prev.filter(s => s.id !== id));
        } else {
            throw error;
        }
    };

    return { editingStaff, setEditingStaff, openEditor, closeEditor, saveStaff, deleteStaff };
};
