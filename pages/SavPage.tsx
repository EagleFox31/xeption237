import React from 'react';
import { Helmet } from 'react-helmet-async';
import RepairSection from '../components/RepairSection';

const SavPage: React.FC = () => {
    return (
        <div className="pt-8 min-h-screen">
            <Helmet>
                <title>SAV & Garantie | Xeption</title>
                <meta name="description" content="Service Après-Vente Xeption. Réparations, garantie et assistance technique pour vos appareils." />
            </Helmet>
            <RepairSection />
        </div>
    );
};

export default SavPage;
