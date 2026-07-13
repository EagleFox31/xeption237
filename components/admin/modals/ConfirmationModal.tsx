
import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { adminUi } from '../shared/adminUi';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'info' | 'success';
  isConfirming?: boolean;
  confirmLabel?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  type = 'info',
  isConfirming = false,
  confirmLabel = 'Confirmer',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md ${adminUi.surface} p-6 transform transition-all scale-100 ${
        type === 'danger' ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-xeption-gold/50 shadow-[0_0_30px_rgba(255,215,0,0.2)]'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {type === 'danger' ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <Info className="w-8 h-8 text-xeption-gold" />}
          <h3 className={`text-xl font-bold font-tech uppercase ${type === 'danger' ? 'text-red-500' : 'text-white'}`}>{title}</h3>
        </div>
        <p className={`${adminUi.body} mb-8 leading-relaxed whitespace-pre-line`}>{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className={`${adminUi.btnGhost} disabled:opacity-40`}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`disabled:opacity-60 ${
              type === 'danger'
                ? 'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-red-500 text-black text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50'
                : adminUi.btnPrimary
            }`}
          >
            {isConfirming ? 'En cours…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
