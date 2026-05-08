import React from 'react';
import { PageSEO } from '../utils/seo';
import OrderTracking from '../components/OrderTracking';

const TrackingPage: React.FC = () => {
    return (
        <div className="pt-8 min-h-screen">
            <PageSEO
                title="Suivi de Commande — Xeption Network Cameroun"
                description="Suivez votre commande Xeption en temps réel. Livraison rapide et sécurisée à Yaoundé, Douala et partout au Cameroun."
                path="/tracking"
            />
            <OrderTracking />
        </div>
    );
};

export default TrackingPage;
