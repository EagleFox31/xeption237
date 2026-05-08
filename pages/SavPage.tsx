import React from 'react';
import { PageSEO, JsonLd, breadcrumbJsonLd } from '../utils/seo';
import RepairSection from '../components/RepairSection';

const SavPage: React.FC = () => {
    return (
        <div className="pt-8 min-h-screen">
            <PageSEO
                title="SAV & Garantie — Réparations Smartphone | Xeption Cameroun"
                description="Service Après-Vente Xeption Network. Réparations, garantie et assistance technique pour smartphones et PC. Suivi en ligne de votre dossier."
                path="/sav"
            />
            <JsonLd data={breadcrumbJsonLd([
                { name: 'Accueil', path: '/' },
                { name: 'SAV & Garantie' },
            ])} />
            <RepairSection />
        </div>
    );
};

export default SavPage;
