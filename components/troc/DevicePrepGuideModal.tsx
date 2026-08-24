import React from 'react';
import { ShieldAlert, LogOut, RefreshCcw, Smartphone, X } from 'lucide-react';

interface DevicePrepGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevicePrepGuideModal: React.FC<DevicePrepGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-xeption-gold/30 max-w-md w-full rounded-sm shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="bg-[#1c1c16]/90 border-b border-white/20 p-5 flex justify-between items-center">
          <h3 className="text-lg font-tech font-bold uppercase tracking-wider text-xeption-gold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Préparation de l'appareil
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          <p className="text-sm text-white/80 font-sans leading-relaxed">
            Pour garantir la sécurité de vos données personnelles et finaliser le troc, vous devez effectuer ces 3 étapes obligatoires avant le dépôt :
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-tech font-bold uppercase tracking-widest text-xs mb-1">1. Déconnexion des comptes</h4>
                <p className="text-xs text-white/70 font-sans">
                  Déconnectez impérativement votre compte <strong>iCloud (Apple)</strong> ou <strong>Google (Android)</strong>. Sans cela, l'appareil est inutilisable et sera refusé.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                <RefreshCcw className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-tech font-bold uppercase tracking-widest text-xs mb-1">2. Sauvegarde de vos données</h4>
                <p className="text-xs text-white/70 font-sans">
                  Sauvegardez vos photos, contacts et messages sur le cloud ou un ordinateur. Nous effacerons tout de manière irréversible.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className="text-white font-tech font-bold uppercase tracking-widest text-xs mb-1">3. Réinitialisation d'usine</h4>
                <p className="text-xs text-white/70 font-sans">
                  Allez dans les paramètres et effectuez une réinitialisation complète (effacer contenu et réglages) pour vider le téléphone.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-2 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-3 text-sm transition-all"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};
