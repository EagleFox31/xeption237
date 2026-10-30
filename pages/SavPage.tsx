import React from 'react';
import { PageSEO, JsonLd, breadcrumbJsonLd } from '../utils/seo';
import RepairSection from '../components/RepairSection';
import RelatedLinks from '../components/content/RelatedLinks';
import { helpLinks } from '../components/content/contentLinks';
import { helpPath } from '../utils/routes';

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
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <RelatedLinks
                    title="Aide & SAV"
                    links={[...helpLinks(['garanties', 'retours', 'livraison']), { to: helpPath(), label: "Toute l'aide" }]}
                />
            </div>
        </div>
    );
};

export default SavPage;
