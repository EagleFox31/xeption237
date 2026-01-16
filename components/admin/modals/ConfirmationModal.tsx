
import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'info' | 'success';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel, type = 'info' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md bg-black/90 backdrop-blur-xl border p-6 rounded-lg shadow-2xl transform transition-all scale-100 ${
        type === 'danger' ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-xeption-gold/50 shadow-[0_0_30px_rgba(255,215,0,0.2)]'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {type === 'danger' ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <Info className="w-8 h-8 text-xeption-gold" />}
          <h3 className={`text-xl font-bold font-tech uppercase ${type === 'danger' ? 'text-red-500' : 'text-white'}`}>{title}</h3>
        </div>
        <p className="text-gray-300 text-sm mb-8 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Annuler
          </button>
          <button 
            onClick={onConfirm}
            className={`px-6 py-2 text-black font-bold font-tech uppercase tracking-wider rounded-sm transition-all shadow-lg ${
                type === 'danger' ? 'bg-red-500 hover:bg-white' : 'bg-xeption-gold hover:bg-white'
            }`}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
