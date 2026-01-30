import React from 'react';
import { Helmet } from 'react-helmet-async';
import TrocSection from '../components/TrocSection';
import { useNavigate } from 'react-router-dom';

const TrocPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="pt-8 min-h-screen">
            <Helmet>
                <title>Troc Téléphone Douala & Yaoundé | Xeption</title>
                <meta name="description" content="Échangez votre ancien smartphone contre un nouveau. Estimation rapide et reprise au meilleur prix." />
            </Helmet>

            <TrocSection onNavigate={(page) => navigate(`/${page}`)} />
            <div className="max-w-4xl mx-auto px-4 text-center mt-12 bg-black/60 backdrop-blur-md p-8 rounded-2xl border border-white/10">
                <h3 className="text-2xl font-bold mb-4">Comment ça marche ?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-6 bg-white/5 rounded-xl border border-white/5 hover:border-xeption-gold/30 transition-all">
                        <span className="text-4xl font-bold text-xeption-gold mb-2 block">1</span>
                        <p className="text-gray-300">Passe avec ton appareil à la boutique.</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-xl border border-white/5 hover:border-xeption-gold/30 transition-all">
                        <span className="text-4xl font-bold text-xeption-gold mb-2 block">2</span>
                        <p className="text-gray-300">On check l'état et on te donne un prix.</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-xl border border-white/5 hover:border-xeption-gold/30 transition-all">
                        <span className="text-4xl font-bold text-xeption-gold mb-2 block">3</span>
                        <p className="text-gray-300">Tu ajoutes la différence et tu prends le nouveau.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrocPage;
