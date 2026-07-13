import React from 'react';
import { X, Smartphone, Settings, Package } from 'lucide-react';

interface ImeiHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Smartphone,
    title: 'Composer *#06#',
    body: "Sur le clavier téléphone de l'appareil à évaluer, composez *#06# puis appelez. Utilisez l'IMEI 1 (carte SIM principale).",
  },
  {
    icon: Settings,
    title: 'Réglages',
    body: "iPhone : Réglages → Général → Informations. Android : Paramètres → À propos du téléphone → État.",
  },
  {
    icon: Package,
    title: 'Boîte ou appareil',
    body: "L'IMEI figure sur l'étiquette de la boîte d'origine ou au dos de l'appareil (si accessible).",
  },
] as const;

export const ImeiHelpModal: React.FC<ImeiHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="imei-help-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-black/95 border border-xeption-gold/30 shadow-2xl rounded-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-gray-500 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2
          id="imei-help-title"
          className="text-lg font-tech font-bold uppercase tracking-wider text-white mb-1 pr-8"
        >
          Comment trouver mon IMEI ?
        </h2>
        <p className="text-xs text-gray-500 font-sans mb-5">15 chiffres — indispensable pour la vérification anti-vol.</p>

        <ul className="space-y-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex gap-3">
              <div className="shrink-0 w-9 h-9 border border-xeption-gold/30 bg-xeption-gold/10 flex items-center justify-center text-xeption-gold font-tech text-xs font-bold">
                {i + 1}
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-tech font-bold text-white uppercase tracking-wide">
                  <Icon className="w-3.5 h-3.5 text-xeption-gold" />
                  {title}
                </p>
                <p className="text-xs text-gray-400 font-sans mt-1 leading-relaxed">
                  {i === 0 ? (
                    <>
                      Sur le clavier, composez{' '}
                      <span className="text-xeption-gold font-mono font-bold">*#06#</span>
                      {' '}puis validez. Retenez l&apos;<strong className="text-white">IMEI 1</strong>.
                    </>
                  ) : (
                    body
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-3 text-sm transition-all"
        >
          Compris
        </button>
      </div>
    </div>
  );
};
