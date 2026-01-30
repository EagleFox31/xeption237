import React from 'react';
import { Helmet } from 'react-helmet-async';
import OrderTracking from '../components/OrderTracking';

const TrackingPage: React.FC = () => {
    return (
        <div className="pt-8 min-h-screen">
            <Helmet>
                <title>Suivi de Commande | Xeption 237</title>
                <meta name="description" content="Suivez votre commande Xeption en temps réel. Livraison rapide et sécurisée." />
            </Helmet>
            <OrderTracking />
        </div>
    );
};

export default TrackingPage;
