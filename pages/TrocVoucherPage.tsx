import React from 'react';
import { Link } from 'react-router-dom';
import { PageSEO } from '../utils/seo';
import TrocVoucherPortal from '../components/troc/TrocVoucherPortal';
import { ArrowLeft } from 'lucide-react';

const TrocVoucherPage: React.FC = () => (
  <div className="min-h-screen">
    <PageSEO
      title="Mon bon Smart Troc — Xeption Network"
      description="Consultez votre bon de reprise Smart Troc, modifiez l'appareil souhaité et retéléchargez votre PDF."
      path="/bon"
    />
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
      <Link
        to="/tracking"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-xeption-gold text-black text-xs font-tech font-bold uppercase tracking-widest hover:bg-white transition-colors shadow-[0_0_16px_rgba(255,215,0,0.25)]"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Retour au suivi
      </Link>
    </div>
    <TrocVoucherPortal />
  </div>
);

export default TrocVoucherPage;
