import React from 'react';
import { Staff } from '../../../types';

interface StaffEditorModalProps {
  staff: Staff;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onChange: (updates: Partial<Staff>) => void;
}

const StaffEditorModal: React.FC<StaffEditorModalProps> = ({ staff, onClose, onSave, onChange }) => {
  const isNew = (staff.id || '').startsWith('new');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-6 rounded-sm w-full max-w-md">
        <h3 className="text-xl font-bold font-tech text-white uppercase mb-4">
          {isNew ? 'Ajouter' : 'Modifier'} Staff
        </h3>
        <form onSubmit={onSave} className="space-y-4">
          <input
            className="w-full bg-black border border-white/10 p-3 text-white rounded-sm"
            placeholder="Nom"
            value={staff.name || ''}
            onChange={e => onChange({ name: e.target.value })}
          />
          <input
            type="email"
            className="w-full bg-black border border-white/10 p-3 text-white rounded-sm"
            placeholder="Email staff (compte auth Supabase)"
            value={staff.email || ''}
            onChange={e => onChange({ email: e.target.value })}
          />
          <select
            className="w-full bg-black border border-white/10 p-3 text-white rounded-sm"
            value={staff.role}
            onChange={e => onChange({ role: e.target.value as any })}
          >
            <option value="editor">Editeur</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <p className="text-[11px] text-gray-500">
            Le mot de passe staff est gere uniquement dans Supabase Auth (pas dans la table staff).
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-gray-500 text-xs font-bold uppercase">
              Annuler
            </button>
            <button type="submit" className="bg-xeption-gold text-black px-4 py-2 font-bold uppercase text-xs rounded-sm">
              Sauvegarder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffEditorModal;

