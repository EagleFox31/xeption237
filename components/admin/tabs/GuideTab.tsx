
import React from 'react';
import { CreditCard, Wrench, Clapperboard, Shield } from 'lucide-react';

const GuideTab: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 max-w-5xl">
        <div>
            <h2 className="text-3xl font-tech font-bold uppercase text-white mb-2">Guide de Survie Staff</h2>
            <p className="text-gray-400">Procédures opérationnelles pour Xeption Network Boutique 2063.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Section POS */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <div className="flex items-center gap-3 mb-6 text-xeption-gold">
                    <CreditCard className="w-6 h-6" />
                    <h3 className="text-xl font-bold uppercase font-tech">Ventes & Caisse (POS)</h3>
                </div>
                <ul className="space-y-4">
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-xeption-gold/10 text-xeption-gold flex items-center justify-center text-xs font-bold shrink-0">1</div>
                        <p className="text-gray-300 text-sm">Sélectionnez les articles dans le <strong>POS</strong> en cliquant sur les vignettes.</p>
                    </li>
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-xeption-gold/10 text-xeption-gold flex items-center justify-center text-xs font-bold shrink-0">2</div>
                        <p className="text-gray-300 text-sm">Demandez le <strong>Nom</strong> et <strong>Email</strong> du client pour le CRM et la facture.</p>
                    </li>
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-xeption-gold/10 text-xeption-gold flex items-center justify-center text-xs font-bold shrink-0">3</div>
                        <p className="text-gray-300 text-sm">Cliquez sur <strong>Valider</strong> pour déduire le stock et imprimer la facture automatiquement.</p>
                    </li>
                </ul>
            </div>

            {/* Section SAV */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <div className="flex items-center gap-3 mb-6 text-blue-400">
                    <Wrench className="w-6 h-6" />
                    <h3 className="text-xl font-bold uppercase font-tech">Atelier SAV & Garantie</h3>
                </div>
                <ul className="space-y-4">
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-400/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">!</div>
                        <p className="text-gray-300 text-sm"><strong>Vérifiez l'ID Commande</strong> sur la facture du client avant toute intervention.</p>
                    </li>
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-400/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                        <p className="text-gray-300 text-sm">Changez le statut à <strong>"Reçu"</strong> dès que vous prenez l'appareil en main.</p>
                    </li>
                    <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-400/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                        <p className="text-gray-300 text-sm">Une fois réparé, passez à <strong>"Terminé"</strong>. Le client recevra une alerte (bientôt).</p>
                    </li>
                </ul>
            </div>

            {/* Section Marketing */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <div className="flex items-center gap-3 mb-6 text-purple-400">
                    <Clapperboard className="w-6 h-6" />
                    <h3 className="text-xl font-bold uppercase font-tech">Marketing & Vidéo</h3>
                </div>
                <div className="bg-white/5 p-4 rounded-sm border border-white/5">
                    <p className="text-xs text-gray-400 italic leading-relaxed">
                        "Pour les promos sur WhatsApp, utilisez le <strong>Studio Vidéo</strong>. Demandez à l'IA de générer des visuels futuristes avec votre prompt (ex: iPhone 15 dans un volcan doré)."
                    </p>
                </div>
            </div>

            {/* Section Codes Conduite */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <div className="flex items-center gap-3 mb-6 text-green-400">
                    <Shield className="w-6 h-6" />
                    <h3 className="text-xl font-bold uppercase font-tech">Ton Xeption</h3>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                        <span className="text-gray-500">Approche</span>
                        <span className="text-white font-bold">Expert & Chill</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                        <span className="text-gray-500">Service</span>
                        <span className="text-white font-bold">"On gère ça"</span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                        <span className="text-gray-500">SAV</span>
                        <span className="text-white font-bold">Zéro Stress</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default GuideTab;
