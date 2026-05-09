import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Shield, Mail, Phone, MapPin, Eye, Database,
  Lock, UserCheck, Trash2, RefreshCw, Cookie,
  Share2, FileText, AlertCircle, AlertTriangle, Info, Smartphone, MessageSquare, ChevronRight
} from 'lucide-react';

const Section: React.FC<{ id: string; icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ id, icon, title, children }) => (
  <section
    id={id}
    className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6 md:p-8 hover:border-xeption-gold/20 transition-all duration-300 scroll-mt-32 snap-start"
  >
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
      <div className="w-10 h-10 bg-xeption-gold/10 rounded-lg flex items-center justify-center text-xeption-gold">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-white font-tech uppercase tracking-wider">{title}</h2>
    </div>
    <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
      {children}
    </div>
  </section>
);

const InfoBadge: React.FC<{ icon: React.ReactNode; text: string; highlight?: boolean }> = ({ icon, text, highlight }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
    highlight ? 'bg-xeption-gold/10 border-xeption-gold/30 text-xeption-gold' : 'bg-white/5 border-white/10 text-gray-300'
  }`}>
    <span className={highlight ? 'text-xeption-gold' : 'text-gray-500'}>{icon}</span>
    {text}
  </div>
);

const DataRow: React.FC<{ type: string; purpose: string; retention: string }> = ({ type, purpose, retention }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-3 border-b border-white/5 last:border-0 text-xs">
    <span className="text-white font-bold">{type}</span>
    <span className="text-gray-400">{purpose}</span>
    <span className="text-xeption-gold font-mono">{retention}</span>
  </div>
);

const SECTIONS = [
  { id: 'cadre-legal', label: 'Cadre légal' },
  { id: 'responsable-traitement', label: 'Responsable' },
  { id: 'donnees-collectees', label: 'Données collectées' },
  { id: 'base-legale', label: 'Base légale' },
  { id: 'communications-commerciales', label: 'Communications' },
  { id: 'destinataires-transferts', label: 'Destinataires' },
  { id: 'vos-droits', label: 'Vos droits' },
  { id: 'cookies-traceurs', label: 'Cookies' },
  { id: 'smart-troc', label: 'Smart Troc' },
  { id: 'securite-donnees', label: 'Sécurité' },
  { id: 'contact-reclamations', label: 'Contact' },
];

const TOC: React.FC<{ activeId: string }> = ({ activeId }) => (
  <nav className="fixed top-24 right-4 w-[min(20rem,calc(100vw-2rem))] max-h-[calc(100vh-7rem)] overflow-auto bg-black/70 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl z-40" aria-label="Sommaire">
    <p className="text-[10px] font-tech text-xeption-gold uppercase tracking-widest mb-4">Sommaire</p>
    <ol className="flex flex-col gap-2 text-sm">
      {SECTIONS.map((item, idx) => {
        const isActive = activeId === item.id;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-all duration-300 group ${
                isActive ? 'bg-xeption-gold/10 border border-xeption-gold/20 text-xeption-gold' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ChevronRight className={`w-3 h-3 transition-transform duration-300 shrink-0 ${isActive ? 'text-xeption-gold translate-x-1' : 'text-gray-600 group-hover:text-xeption-gold group-hover:translate-x-0.5'}`} />
              <span className={`font-mono text-xs w-5 shrink-0 ${isActive ? 'text-xeption-gold' : 'text-xeption-gold/50'}`}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="font-medium">{item.label}</span>
            </a>
          </li>
        );
      })}
    </ol>
  </nav>
);

const PolitiqueConfidentialitePage: React.FC = () => {
  const lastUpdated = '08 mai 2026';
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Helmet>
        <title>Politique de Confidentialité | Xeption Network — ETS XEPTION</title>
        <meta
          name="description"
          content="Politique de confidentialité du site xeptionetwork.shop — comment ETS XEPTION collecte, utilise et protège vos données personnelles conformément à la loi camerounaise n° 2024/017."
        />
        <link rel="canonical" href="https://www.xeptionetwork.shop/politique-confidentialite" />
      </Helmet>

      <div className="min-h-screen pt-28 pb-20 px-4 relative">
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-0 pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <TOC activeId={activeSection} />

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-xeption-gold/10 border border-xeption-gold/30 rounded-full px-4 py-2 text-xeption-gold text-xs font-bold uppercase tracking-widest mb-6">
              <Lock className="w-3.5 h-3.5" />
              Protection des données
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white font-tech uppercase drop-shadow-lg mb-4">
              Politique de <span className="text-xeption-gold">Confidentialité</span>
            </h1>
            <p className="text-gray-300 max-w-xl mx-auto text-sm">
              ETS XEPTION s'engage à traiter vos données personnelles avec transparence et responsabilité,
              conformément à la loi camerounaise n° 2024/017 du 23 décembre 2024 relative à la protection
              des données à caractère personnel.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-gray-500 text-xs">
              <RefreshCw className="w-3 h-3" />
              Dernière mise à jour : {lastUpdated}
            </div>
          </div>

          <div className="space-y-6 snap-y snap-proximity">

            {/* Cadre légal */}
            <section id="cadre-legal" className="bg-xeption-gold/5 border border-xeption-gold/20 rounded-xl p-4 flex gap-3 scroll-mt-32 snap-start">
              <FileText className="w-5 h-5 text-xeption-gold shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300 leading-relaxed">
                <span className="text-xeption-gold font-bold uppercase tracking-wider block mb-1">Cadre légal applicable</span>
                Ce document est rédigé conformément à la <strong className="text-white">loi n° 2024/017 du 23 décembre 2024</strong> relative
                à la protection des données à caractère personnel au Cameroun. Si vous êtes situé dans l'Union Européenne,
                le RGPD (Règlement UE 2016/679) peut également s'appliquer à votre situation.
              </div>
            </section>

            {/* Responsable du traitement */}
            <Section id="responsable-traitement" icon={<UserCheck className="w-5 h-5" />} title="Responsable du traitement">
              <p>
                Le responsable du traitement des données collectées via le site{' '}
                <span className="text-xeption-gold font-mono">xeptionetwork.shop</span> est :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <InfoBadge icon={<FileText className="w-3.5 h-3.5" />} text="ETS XEPTION — Entrepreneur Individuel" highlight />
                <InfoBadge icon={<MapPin className="w-3.5 h-3.5" />} text="Mfoundi Mall, Boutique 2063, Yaoundé, Cameroun" />
                <InfoBadge icon={<Phone className="w-3.5 h-3.5" />} text="+237 697 686 684" />
                <InfoBadge icon={<Mail className="w-3.5 h-3.5" />} text="support@xeptionetwork.shop" />
              </div>
            </Section>

            {/* Données collectées */}
            <Section id="donnees-collectees" icon={<Database className="w-5 h-5" />} title="Données collectées">
              <p>Lors de l'utilisation du site ou du service Smart Troc, nous collectons les données suivantes :</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-white/10 pb-2">
                <span>Type de donnée</span>
                <span>Finalité</span>
                <span>Durée indicative</span>
              </div>

              <DataRow type="Nom & Prénom" purpose="Commandes, facturation, CRM" retention="Durée de la relation commerciale + obligations légales" />
              <DataRow type="Adresse e-mail" purpose="Envoi de factures, support client" retention="Durée de la relation commerciale" />
              <DataRow type="Numéro de téléphone" purpose="Livraison, SAV, WhatsApp support" retention="Durée de la relation commerciale" />
              <DataRow type="Ville / Zone de livraison" purpose="Calcul et suivi des livraisons" retention="Durée de la commande + archivage" />
              <DataRow type="Historique d'achats" purpose="SAV, garantie, CRM" retention="Durée imposée par les obligations comptables et fiscales applicables" />
              <DataRow type="Numéro IMEI (Smart Troc)" purpose="Vérification statut appareil" retention="Durée du processus Troc uniquement" />
              <DataRow type="Photos / diagnostic appareil" purpose="Évaluation Smart Troc" retention="Supprimées après confirmation en boutique" />
              <DataRow type="Référence de transaction mobile" purpose="Rapprochement paiement OM/MTN" retention="Durée légale comptable" />
              <DataRow type="Données techniques anti-abus (hCaptcha)" purpose="Protection contre les robots, abus et soumissions frauduleuses" retention="Selon les durées techniques strictement nécessaires au contrôle de sécurité" />
              <DataRow type="Données de navigation (logs serveur)" purpose="Stabilité et performance du site" retention="3 jours (runtime logs par défaut)" />

              <div className="bg-white/5 border border-white/10 rounded-lg p-3 mt-2 text-xs text-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-white font-bold block">À propos des paiements</span>
                </div>
                Nous ne stockons aucun numéro de carte bancaire. Les paiements mobiles (Orange Money, MTN MoMo) sont traités
                directement par leurs infrastructures. Nous pouvons conserver les références de transaction, le statut du paiement
                et le numéro de téléphone payeur à des fins de rapprochement comptable.
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-bold block">Smart Troc — précision importante</span>
                </div>
                L'évaluation Smart Troc est une <strong className="text-white">aide à la décision</strong> basée sur les informations
                fournies (IMEI, état déclaré, photos). Elle ne produit pas à elle seule une offre définitive. Une vérification
                humaine en boutique est toujours requise avant tout accord de reprise.
              </div>

              <p className="text-gray-500 text-xs italic">
                Les durées indiquées sont indicatives. Elles sont susceptibles d'être ajustées selon les obligations légales
                camerounaises et les contraintes opérationnelles réelles du service.
              </p>
            </Section>

            {/* Base légale */}
            <Section id="base-legale" icon={<Shield className="w-5 h-5" />} title="Base légale du traitement">
              <p>Le traitement de vos données repose sur les bases légales suivantes (art. 7 et suivants, loi 2024/017) :</p>
              <ul className="space-y-2 mt-2">
                {[
                  { base: 'Exécution du contrat', desc: 'Traitement des commandes, livraisons, facturation, SAV et garantie.' },
                  { base: 'Obligation légale', desc: 'Conservation des données comptables et fiscales conformément au droit camerounais et aux normes OHADA.' },
                  { base: 'Intérêt légitime', desc: 'Amélioration du service, gestion CRM, prévention des fraudes et sécurité du site.' },
                  { base: 'Consentement', desc: 'Communications commerciales et marketing (voir section dédiée ci-dessous).' },
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 bg-white/5 border border-white/5 rounded-lg p-3">
                    <span className="text-xeption-gold font-bold text-xs shrink-0 mt-0.5">›</span>
                    <div>
                      <span className="text-white font-bold text-xs uppercase tracking-wider">{item.base} — </span>
                      <span className="text-gray-400 text-xs">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            {/* Communications commerciales */}
            <Section id="communications-commerciales" icon={<MessageSquare className="w-5 h-5" />} title="Communications commerciales">
              <p>
                Conformément à la réglementation camerounaise sur le commerce électronique, toute prospection
                commerciale par voie électronique (email, SMS, WhatsApp) est soumise à votre <strong className="text-white">consentement préalable</strong>.
              </p>
              <ul className="space-y-2 mt-2 text-xs">
                {[
                  'Nous ne vous enverrons aucun message marketing sans accord préalable de votre part.',
                  'Si vous avez passé commande, nous pouvons vous contacter uniquement pour les communications relatives à cette commande (confirmation, livraison, SAV).',
                  'Tout message marketing ultérieur nécessite un opt-in explicite.',
                  'Vous pouvez à tout moment vous désabonner en répondant STOP ou en écrivant à support@xeptionetwork.shop.',
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-xeption-gold mt-0.5">›</span>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* Partage des données */}
            <Section id="destinataires-transferts" icon={<Share2 className="w-5 h-5" />} title="Destinataires & transferts">
              <p>
                Vos données ne sont <strong className="text-white">jamais vendues</strong>. Elles peuvent être transmises aux
                sous-traitants techniques suivants, strictement nécessaires à l'exploitation du service :
              </p>
              <div className="space-y-3 mt-2">
                {[
                  { name: 'Prestataire d\'hébergement Cloud', role: 'Hébergeur du site', detail: 'Données transitant par leurs serveurs dans le cadre de l\'hébergement web.', location: 'États-Unis', transfer: true },
                  { name: 'Fournisseur de Base de données', role: 'Stockage & authentification', detail: 'Stockage sécurisé des commandes, clients et tickets SAV.', location: 'États-Unis', transfer: true },
                  { name: 'Orange Money / MTN MoMo', role: 'Paiement mobile', detail: 'Traitement des transactions selon leurs propres politiques de confidentialité.', location: 'Cameroun', transfer: false },
                  { name: 'Service d\'optimisation média', role: 'Hébergement des médias', detail: 'Stockage et optimisation des images produits.', location: 'États-Unis', transfer: true },
                  { name: 'hCaptcha', role: 'Sécurité des formulaires', detail: 'Protection contre les soumissions automatisées, bots et abus lors de certaines actions sensibles.', location: 'États-Unis', transfer: true },
                ].map((partner, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                      <span className="text-white font-bold text-sm">{partner.name}</span>
                      <div className="flex gap-2">
                        <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded font-mono">{partner.location}</span>
                        {partner.transfer && (
                          <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded font-bold">Transfert hors Cameroun</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xeption-gold text-xs font-bold uppercase tracking-wider mb-1">{partner.role}</p>
                    <p className="text-gray-400 text-xs">{partner.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-xs italic mt-2">
                Ces prestataires mettent en œuvre leurs propres mesures de sécurité et de conformité. ETS XEPTION s'efforce
                de limiter les données transférées au strict nécessaire et d'encadrer ces traitements conformément à la
                réglementation applicable, notamment la loi camerounaise n° 2024/017 du 23 décembre 2024.
              </p>
            </Section>

            {/* Vos droits */}
            <Section id="vos-droits" icon={<Eye className="w-5 h-5" />} title="Vos droits">
              <p>
                Conformément à la <strong className="text-white">loi camerounaise n° 2024/017 du 23 décembre 2024</strong>,
                vous disposez des droits suivants sur vos données personnelles :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {[
                  { icon: <Eye className="w-4 h-4" />, title: 'Droit d\'accès', desc: 'Obtenir une copie des données que nous détenons sur vous.' },
                  { icon: <RefreshCw className="w-4 h-4" />, title: 'Droit de rectification', desc: 'Corriger des données inexactes ou incomplètes.' },
                  { icon: <Trash2 className="w-4 h-4" />, title: 'Droit à l\'effacement', desc: 'Demander la suppression dans les limites de nos obligations légales.' },
                  { icon: <AlertCircle className="w-4 h-4" />, title: 'Droit d\'opposition', desc: 'Vous opposer au traitement pour motif légitime, notamment pour la prospection.' },
                ].map((right, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4 flex gap-3">
                    <div className="w-8 h-8 bg-xeption-gold/10 rounded-lg flex items-center justify-center text-xeption-gold shrink-0 mt-0.5">
                      {right.icon}
                    </div>
                    <div>
                      <p className="text-white font-bold text-xs uppercase tracking-wider mb-1">{right.title}</p>
                      <p className="text-gray-400 text-xs">{right.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 bg-xeption-gold/5 border border-xeption-gold/20 rounded-lg px-4 py-3 mt-4">
                <Mail className="w-4 h-4 text-xeption-gold shrink-0" />
                <p className="text-xs text-gray-300">
                  Pour exercer ces droits, écrivez à{' '}
                  <a href="mailto:support@xeptionetwork.shop" className="text-xeption-gold hover:underline font-mono">
                    support@xeptionetwork.shop
                  </a>. Nous répondons sous <strong className="text-white">30 jours</strong>. En cas de réponse insatisfaisante,
                  vous pouvez saisir l'autorité nationale compétente conformément à la loi 2024/017.
                </p>
              </div>
            </Section>

            {/* Cookies */}
            <Section id="cookies-traceurs" icon={<Cookie className="w-5 h-5" />} title="Cookies & traceurs">
              <p>
                Le site utilise uniquement des cookies <strong className="text-white">techniques et fonctionnels</strong>,
                exemptés de consentement préalable :
              </p>
              <div className="space-y-2 mt-2">
                {[
                  { name: 'Cookies de session', desc: 'Maintien de votre panier et de la session d\'authentification staff.', type: 'Essentiel' },
                  { name: 'Cookies techniques de performance', desc: 'Performance et disponibilité du site (logs anonymes).', type: 'Technique' },
                  { name: 'Cookies d\'authentification', desc: 'Authentification sécurisée du personnel uniquement.', type: 'Essentiel' },
                  { name: 'hCaptcha', desc: 'Mécanismes techniques anti-abus et de sécurité lors de certaines soumissions de formulaires.', type: 'Technique' },
                ].map((cookie, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-lg p-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 mt-0.5 ${
                      cookie.type === 'Essentiel' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {cookie.type}
                    </span>
                    <div>
                      <p className="text-white font-bold text-xs">{cookie.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{cookie.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-xs italic mt-3">
                Aucun cookie publicitaire, tracker tiers (Google Analytics, Meta Pixel, Hotjar, etc.) n'est utilisé sur ce site
                à la date de dernière mise à jour. Si cette situation venait à changer, cette politique sera mise à jour et un
                mécanisme de consentement sera mis en place.
              </p>
            </Section>

            {/* Smart Troc */}
            <Section id="smart-troc" icon={<Smartphone className="w-5 h-5" />} title="Smart Troc & traitement automatisé">
              <p>
                Le service Smart Troc peut collecter et traiter les données suivantes lors d'une demande d'évaluation :
              </p>
              <ul className="space-y-2 mt-2 text-xs">
                {[
                  'Numéro IMEI de l\'appareil (vérification statut via des bases de données techniques et sources de vérification disponibles)',
                  'État déclaré de l\'appareil (écran, batterie, châssis)',
                  'Photos de l\'appareil transmises pour évaluation',
                  'Données techniques du modèle (marque, capacité, année)',
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 items-start bg-white/5 p-2 rounded">
                    <span className="text-xeption-gold mt-0.5 shrink-0">›</span>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mt-3 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 font-bold block">Estimation automatique — non contraignante</span>
                </div>
                <p className="text-gray-400">
                  L'évaluation générée par le système Smart Troc est une <strong className="text-white">aide à la décision</strong>.
                  Elle ne constitue pas une offre ferme et ne produit aucun effet juridique. Une vérification physique en boutique
                  par un technicien reste obligatoire avant tout accord de reprise ou de paiement.
                </p>
              </div>
              <p className="text-gray-500 text-xs italic">
                Les données collectées dans ce cadre sont supprimées dès la clôture du dossier Troc (confirmation ou refus en boutique).
              </p>
            </Section>

            {/* Sécurité */}
            <Section id="securite-donnees" icon={<Lock className="w-5 h-5" />} title="Sécurité des données">
              <p>
                Nous mettons en œuvre des mesures techniques adaptées à la nature de notre service pour limiter
                les risques d'accès non autorisé, de perte ou d'altération de vos données :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                {[
                  { label: 'HTTPS / TLS', desc: 'Chiffrement des communications entre votre navigateur et nos serveurs.' },
                  { label: 'Row Level Security', desc: 'Isolation stricte des données par utilisateur au niveau de la base de données.' },
                  { label: 'Accès restreint', desc: 'L\'accès à l\'interface d\'administration est protégé par authentification et limité au personnel autorisé.' },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <p className="text-xeption-gold font-bold text-xs uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-gray-400 text-xs">{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-xs italic mt-3">
                Aucune mesure de sécurité n'est absolue. En cas de violation de données susceptible d'affecter vos droits,
                nous nous engageons à vous en informer dans les meilleurs délais.
              </p>
            </Section>

            {/* Contact */}
            <Section id="contact-reclamations" icon={<Mail className="w-5 h-5" />} title="Contact & réclamations">
              <p>Pour toute question sur cette politique ou pour exercer vos droits :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <a href="mailto:support@xeptionetwork.shop"
                  className="flex items-center gap-3 bg-xeption-gold/10 border border-xeption-gold/30 rounded-lg px-4 py-3 hover:bg-xeption-gold/20 transition-all group">
                  <Mail className="w-4 h-4 text-xeption-gold" />
                  <span className="text-xeption-gold text-sm font-mono group-hover:underline">support@xeptionetwork.shop</span>
                </a>
                <a href="https://wa.me/237697686684" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:border-xeption-gold/30 transition-all">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300 text-sm">+237 697 686 684</span>
                </a>
              </div>
              <p className="text-gray-500 text-xs italic mt-3">
                En cas de désaccord persistant sur le traitement de vos données, vous disposez du droit de saisir
                l'autorité nationale de protection des données compétente au Cameroun, conformément à la loi n° 2024/017.
              </p>
            </Section>

            <div className="text-center text-gray-600 text-xs pt-4 pb-8">
              <p>© {new Date().getFullYear()} ETS XEPTION — Tous droits réservés.</p>
              <p className="mt-1">Site réalisé par <span className="text-gray-500">Agenstudio</span> — entité de <span className="text-gray-500">Trigenys Group</span></p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default PolitiqueConfidentialitePage;
