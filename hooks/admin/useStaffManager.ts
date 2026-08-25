
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Staff } from '../../types';
import { DB_TABLES, DB_SCHEMA } from '../../constants/dbSchema';
import { DEFAULT_STAFF_ROLE, normalizeStaffRole } from '../../constants/staffRoles';
import {
  checkStaffAuthStatuses,
  provisionStaffAuthUser,
} from '../../services/staffAuthProvisioning';
import { logSecurityEvent } from '../../services/staffSecurity';

interface UseStaffManagerProps {
    staffMembers: Staff[];
    setStaffMembers: React.Dispatch<React.SetStateAction<Staff[]>>;
    onFeedback?: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

export const useStaffManager = ({ staffMembers, setStaffMembers, onFeedback }: UseStaffManagerProps) => {
    const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [provisioningId, setProvisioningId] = useState<string | null>(null);
    const [isBulkProvisioning, setIsBulkProvisioning] = useState(false);
    const [authByEmail, setAuthByEmail] = useState<Record<string, boolean>>({});

    const refreshAuthStatuses = useCallback(async (members: Staff[] = staffMembers) => {
        const emails = members.map((m) => m.email).filter(Boolean);
        if (!emails.length) {
            setAuthByEmail({});
            return;
        }
        try {
            const statuses = await checkStaffAuthStatuses(emails);
            setAuthByEmail(statuses);
        } catch (err) {
            console.error('Staff auth status check failed:', err);
        }
    }, [staffMembers]);

    useEffect(() => {
        void refreshAuthStatuses();
    }, [refreshAuthStatuses]);

    const openEditor = (staff?: Staff) => {
        setEditingStaff(staff || {
            id: `new_${Date.now()}`,
            name: '', email: '', role: DEFAULT_STAFF_ROLE, phone: ''
        });
    };

    const closeEditor = () => setEditingStaff(null);

    const provisionAuthForStaff = async (staff: Staff) => {
        setProvisioningId(staff.id);
        try {
            // Action explicite de l'admin : on (re)genere un mot de passe.
            const result = await provisionStaffAuthUser(staff.email, staff.name, {
                resetPassword: true,
            });
            // Journalisé même si le mot de passe n'a pas changé : la tentative
            // d'accès au compte d'un autre est en soi ce qu'on veut tracer.
            await logSecurityEvent('password_reset_by_admin', {
                targetEmail: staff.email,
                targetName: staff.name,
            });
            await refreshAuthStatuses();
            onFeedback?.(
                'Connexion prête',
                `${staff.name} — email ${staff.email} — mot de passe ${result.temporaryPassword ?? 'inchangé'} (à noter maintenant)`,
                'success',
            );
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Activation impossible.';
            onFeedback?.('Erreur connexion', message, 'error');
            throw err;
        } finally {
            setProvisioningId(null);
        }
    };

    /** Tous les membres : nom Auth + mot de passe 123456. */
    const provisionAllStaffAuth = async () => {
        const targets = staffMembers.filter((s) => s.email?.trim());
        if (!targets.length) return;

        setIsBulkProvisioning(true);
        const lines: string[] = [];
        let errors = 0;

        try {
            for (const member of targets) {
                try {
                    const res = await provisionStaffAuthUser(member.email, member.name);
                    lines.push(
                        `${member.name} : ${res.temporaryPassword ?? 'déjà en place, inchangé'}`,
                    );
                } catch (err) {
                    errors += 1;
                    lines.push(`${member.name} : ${err instanceof Error ? err.message : 'erreur'}`);
                }
            }

            await refreshAuthStatuses();
            onFeedback?.(
                errors ? 'Synchronisation partielle' : 'Toute l’équipe est prête',
                lines.join('\n'),
                errors ? 'error' : 'success',
            );
        } finally {
            setIsBulkProvisioning(false);
        }
    };

    const saveStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStaff) return;
        if (!editingStaff.name?.trim() || !editingStaff.email?.trim()) {
            throw new Error('Nom et email obligatoires.');
        }

        setIsSaving(true);
        try {
        const isNew = editingStaff.id?.startsWith('new_');
        const cleanData = editingStaff as Partial<Staff> & { phone?: string };
        // Relevé AVANT l'upsert : après, l'ancienne valeur n'existe plus nulle part.
        const previousRole = isNew
            ? null
            : staffMembers.find((m) => m.id === editingStaff.id)?.role ?? null;
        
        const payload = {
            [DB_SCHEMA.STAFF.NAME]: cleanData.name!.trim(),
            [DB_SCHEMA.STAFF.EMAIL]: cleanData.email!.trim().toLowerCase(),
            [DB_SCHEMA.STAFF.ROLE]: normalizeStaffRole(cleanData.role),
            [DB_SCHEMA.STAFF.PHONE]: cleanData.phone,
            [DB_SCHEMA.STAFF.STORE_ID]: cleanData.store_id || null,
        };
        
        if (!isNew) {
            (payload as Record<string, unknown>)[DB_SCHEMA.STAFF.ID] = editingStaff.id;
        }

        const { data, error } = await supabase.from(DB_TABLES.STAFF).upsert(payload).select();

        if (!error && data) {
            const savedDb = data[0];
            const savedApp: Staff = {
                id: savedDb[DB_SCHEMA.STAFF.ID],
                name: savedDb[DB_SCHEMA.STAFF.NAME],
                email: savedDb[DB_SCHEMA.STAFF.EMAIL],
                role: normalizeStaffRole(savedDb[DB_SCHEMA.STAFF.ROLE]),
                store_id: savedDb[DB_SCHEMA.STAFF.STORE_ID] ?? null,
            };

            if (previousRole && previousRole !== savedApp.role) {
                await logSecurityEvent('role_changed', {
                    targetEmail: savedApp.email,
                    targetName: savedApp.name,
                    detail: `${previousRole} → ${savedApp.role}`,
                });
            }

            try {
                // Sans resetPassword : changer le role ou la boutique d'un membre
                // ne doit pas lui reprendre son mot de passe au passage.
                const res = await provisionStaffAuthUser(savedApp.email, savedApp.name);
                onFeedback?.(
                    isNew ? 'Membre ajouté' : 'Membre mis à jour',
                    res.temporaryPassword
                        ? `${savedApp.name} — mot de passe ${res.temporaryPassword} (à noter maintenant)`
                        : `${savedApp.name} — profil mis à jour`,
                    'success',
                );
                await refreshAuthStatuses(
                    isNew ? [...staffMembers, savedApp] : staffMembers.map((s) => (s.id === savedApp.id ? savedApp : s)),
                );
            } catch (provisionError) {
                console.error('Staff auth provisioning failed:', provisionError);
                if (isNew) setStaffMembers((prev) => [...prev, savedApp]);
                closeEditor();
                throw new Error(
                    `Profil enregistré, connexion Auth en échec : ${
                        provisionError instanceof Error ? provisionError.message : 'erreur'
                    }`,
                );
            }

            setStaffMembers(prev => isNew ? [...prev, savedApp] : prev.map(s => s.id === savedApp.id ? savedApp : s));
            closeEditor();
        } else {
            console.error(error);
            throw error || new Error('Erreur lors de l’enregistrement.');
        }
        } finally {
            setIsSaving(false);
        }
    };

    const deleteStaff = async (id: string) => {
        const { error } = await supabase.from(DB_TABLES.STAFF).delete().eq(DB_SCHEMA.STAFF.ID, id);
        if (!error) {
            setStaffMembers(prev => prev.filter(s => s.id !== id));
            await refreshAuthStatuses(staffMembers.filter((s) => s.id !== id));
        } else {
            throw error;
        }
    };

    return {
        editingStaff,
        setEditingStaff,
        openEditor,
        closeEditor,
        saveStaff,
        deleteStaff,
        isSaving,
        authByEmail,
        provisioningId,
        isBulkProvisioning,
        provisionAuthForStaff,
        provisionAllStaffAuth,
        refreshAuthStatuses,
    };
};
