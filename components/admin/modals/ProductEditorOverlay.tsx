
import React, { useRef, useState } from 'react';
import { Product, Category, Brand, ProductRange } from '../../../types';
import { Loader2, Sparkles, Image as ImageIcon, ArrowLeft, Tag, ShieldCheck, Check, X, Cpu, ListPlus, CreditCard, Film, Trash2, Plus, Upload, Star, Smartphone, RefreshCw, MessageCircle } from 'lucide-react';
import { uploadImageToCloudinary, uploadVideoToCloudinary } from '../../../services/uploadService';
import { generateProductDetails } from '../../../services/geminiService';
import { generateProductReviews } from '../../../services/reviewGenerator';

interface ProductEditorOverlayProps {
    product: Product;
    categories: Category[];
    brands?: Brand[];
    ranges?: ProductRange[];
    onClose: () => void;
    onSave: (e: React.FormEvent) => void;
    onChange: (updates: Partial<Product>) => void;
}

const ProductEditorOverlay: React.FC<ProductEditorOverlayProps> = ({ product, categories, brands = [], ranges = [], onClose, onSave, onChange }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingReviews, setIsGeneratingReviews] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);

    const mainImageInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    // --- HELPER FORMATAGE PRIX ---
    const formatPriceDisplay = (value: number | undefined) => {
        if (value === undefined || value === null || value === 0) return '';
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    };

    const handlePriceChange = (value: string, field: 'price' | 'oldPrice') => {
        const rawValue = value.replace(/\s/g, '');
        if (rawValue === '' || /^\d+$/.test(rawValue)) {
            onChange({ [field]: Number(rawValue) });
        }
    };

    // --- LOGIC MARQUE / GAMME ---
    const isTechProduct = ['smartphones', 'phones', 'laptops', 'ordinateurs', 'tablettes'].some(slug => product.category.toLowerCase().includes(slug));
    const availableRanges = ranges.filter(r => r.brand_id === product.brand);

    // --- HANDLERS MEDIA ---
    const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setUploadingImage(true);
        try {
            const url = await uploadImageToCloudinary(e.target.files[0]);
            onChange({ image: url });
        } finally { setUploadingImage(false); }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const filesList = e.target.files;
        if (!filesList || filesList.length === 0) return;

        setUploadingGallery(true);
        try {
            const files = Array.from(filesList) as File[];
            const newUrls = await Promise.all(files.map(file => uploadImageToCloudinary(file)));

            const currentImages = product.images || [];
            onChange({ images: [...currentImages, ...newUrls] });
        } finally { setUploadingGallery(false); }
    };

    const removeGalleryImage = (indexToRemove: number) => {
        const currentImages = product.images || [];
        onChange({ images: currentImages.filter((_, idx) => idx !== indexToRemove) });
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setUploadingVideo(true);
        try {
            const url = await uploadVideoToCloudinary(e.target.files[0]);
            onChange({ video: url });
        } finally { setUploadingVideo(false); }
    };

    // --- AI HANDLER ---
    const handleAiGeneration = async () => {
        if (!product.name) return;
        setIsGenerating(true);
        try {
            const details = await generateProductDetails(product.name, product.category);
            onChange({
                ...details,
                pros: details.pros || [],
                cons: details.cons || [],
                specs: details.specs || []
            });
        } finally { setIsGenerating(false); }
    };

    // --- AI REVIEWS HANDLER ---
    const handleReviewsGeneration = async () => {
        if (!product.name || !product.description) {
            alert("Ajoutez un nom et une description avant de générer des avis.");
            return;
        }
        setIsGeneratingReviews(true);
        try {
            const reviews = await generateProductReviews(product.name, product.category, product.description);

            // Calculer la nouvelle note moyenne
            const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = reviews.length > 0 ? parseFloat((totalRating / reviews.length).toFixed(1)) : 5;

            onChange({ reviews, rating: avgRating });
        } finally {
            setIsGeneratingReviews(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-5 duration-300 w-full pb-20">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-white/10 pb-6 sticky top-0 bg-[#09090b]/90 backdrop-blur-md z-40 pt-2">
                <div>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-gray-500 hover:text-xeption-gold transition-colors text-xs font-bold uppercase tracking-widest mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Retour à l'inventaire
                    </button>
                    <h2 className="text-3xl font-tech font-bold text-white uppercase tracking-tight">
                        {product.id.startsWith('new') ? 'Ajouter une pépite' : 'Modifier le produit'}
                    </h2>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={onSave}
                        className="flex-1 md:flex-none bg-xeption-gold text-black px-8 py-3 font-tech font-bold uppercase text-sm tracking-wider rounded-sm hover:bg-white transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)]"
                    >
                        Sauvegarder
                    </button>
                </div>
            </div>

            <form className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* --- COLONNE GAUCHE (Infos Texte) --- */}
                <div className="xl:col-span-2 space-y-6">

                    {/* BLOC : IDENTITÉ */}
                    <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                        <h3 className="text-white font-tech font-bold uppercase mb-6 text-sm flex items-center gap-2">
                            <Tag className="w-4 h-4 text-xeption-gold" /> Identité du produit
                        </h3>

                        <div className="space-y-4">
                            {/* TOGGLE CONDITION */}
                            <div className="flex bg-black/50 p-1 rounded-sm border border-white/10 w-full mb-2">
                                <button
                                    type="button"
                                    onClick={() => onChange({ condition: 'refurbished' })}
                                    className={`flex-1 py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 rounded-sm transition-all ${product.condition === 'refurbished' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/50' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    <RefreshCw className="w-3 h-3" /> Reconditionné
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onChange({ condition: 'new' })}
                                    className={`flex-1 py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 rounded-sm transition-all ${product.condition === 'new' ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    <Sparkles className="w-3 h-3" /> Neuf
                                </button>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 block tracking-widest">Nom Commercial</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 p-4 text-white focus:border-xeption-gold outline-none transition-all rounded-sm"
                                    placeholder="ex: iPhone 15 Pro Max 256GB"
                                    value={product.name}
                                    onChange={e => onChange({ name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 block tracking-widest">Type (Catégorie)</label>
                                    <select
                                        className="w-full bg-black/40 border border-white/10 p-4 text-white focus:border-xeption-gold outline-none transition-all rounded-sm"
                                        value={product.category}
                                        onChange={e => onChange({ category: e.target.value })}
                                    >
                                        <option value="">-- Choisir un type --</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.slug}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 block tracking-widest">Stock Boutique</label>
                                    <input
                                        type="number"
                                        className="w-full bg-black/40 border border-white/10 p-4 text-white focus:border-xeption-gold outline-none transition-all rounded-sm font-mono"
                                        placeholder="Quantité dispo"
                                        value={product.stock}
                                        onChange={e => onChange({ stock: Math.max(0, +e.target.value) })}
                                        min="0" />
                                </div>
                            </div>

                            {/* --- SELECTEURS MARQUE & GAMME (Conditionnels) --- */}
                            {isTechProduct && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 bg-white/5 p-4 rounded border border-white/5">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-xeption-gold mb-1.5 flex items-center gap-1 tracking-widest">
                                            <Smartphone className="w-3 h-3" /> Marque (Obligatoire)
                                        </label>
                                        <select
                                            className="w-full bg-black/40 border border-white/10 p-3 text-white focus:border-xeption-gold outline-none transition-all rounded-sm text-sm"
                                            value={product.brand || ''}
                                            onChange={e => onChange({ brand: e.target.value, productRange: '' })} // Reset range on brand change
                                            required
                                        >
                                            <option value="">-- Sélectionner Marque --</option>
                                            {brands.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-xeption-gold mb-1.5 flex items-center gap-1 tracking-widest">
                                            <Tag className="w-3 h-3" /> Gamme / Série (Obligatoire)
                                        </label>
                                        <select
                                            className="w-full bg-black/40 border border-white/10 p-3 text-white focus:border-xeption-gold outline-none transition-all rounded-sm text-sm disabled:opacity-50"
                                            value={product.productRange || ''}
                                            onChange={e => onChange({ productRange: e.target.value })}
                                            disabled={!product.brand}
                                            required
                                        >
                                            <option value="">-- Sélectionner Gamme --</option>
                                            {availableRanges.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* OPTION FEATURED / PÉPITE */}
                            <div className="bg-white/5 border border-white/5 p-4 rounded-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${product.isFeatured ? 'bg-xeption-gold text-black' : 'bg-white/10 text-gray-400'}`}>
                                        <Star className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-white text-xs font-bold uppercase">Mettre à la Une</h4>
                                        <p className="text-[10px] text-gray-400">Afficher dans les "Pépites" en page d'accueil.</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={product.isFeatured || false}
                                        onChange={e => onChange({ isFeatured: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-xeption-gold"></div>
                                </label>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Description Marketing</label>
                                    <button
                                        type="button"
                                        onClick={handleAiGeneration}
                                        disabled={isGenerating}
                                        className="text-[10px] text-xeption-gold border border-xeption-gold/30 px-3 py-1 rounded-sm uppercase font-bold flex items-center gap-2 hover:bg-xeption-gold hover:text-black transition-all"
                                    >
                                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Auto-Fill IA
                                    </button>
                                </div>
                                <textarea
                                    className="w-full bg-black/40 border border-white/10 p-4 h-32 text-white text-sm focus:border-xeption-gold outline-none transition-all rounded-sm resize-none"
                                    placeholder="Texte de vente chill & expert..."
                                    value={product.description}
                                    onChange={e => onChange({ description: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* BLOC : AVIS CLIENTS (RAG) */}
                    <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-tech font-bold uppercase text-sm flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-purple-400" /> Avis Clients (IA Social Proof)
                            </h3>
                            <button
                                type="button"
                                onClick={handleReviewsGeneration}
                                disabled={isGeneratingReviews}
                                className="bg-purple-500/10 hover:bg-purple-500 hover:text-white text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                            >
                                {isGeneratingReviews ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Générer Avis
                            </button>
                        </div>

                        <div className="space-y-3">
                            {(product.reviews || []).length === 0 ? (
                                <div className="text-center py-6 text-gray-500 text-xs italic border border-dashed border-white/10 rounded-sm">
                                    Aucun avis généré. Cliquez sur le bouton pour simuler des avis locaux.
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {(product.reviews || []).map((review) => (
                                        <div key={review.id} className="bg-white/5 p-3 rounded-sm border border-white/5">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-white">{review.author} <span className="text-[10px] text-gray-500 font-normal ml-1">({review.location})</span></span>
                                                <span className="flex items-center text-[10px] text-xeption-gold font-bold">
                                                    {review.rating} <Star className="w-2 h-2 ml-0.5 fill-current" />
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 leading-tight">"{review.text}"</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {product.reviews && product.reviews.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => onChange({ reviews: [], rating: 0 })}
                                    className="text-[10px] text-red-500 hover:text-white flex items-center gap-1 mt-2"
                                >
                                    <Trash2 className="w-3 h-3" /> Effacer les avis
                                </button>
                            )}
                        </div>
                    </div>

                    {/* BLOC : POINTS FORTS / FAIBLES */}
                    <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-green-500 font-tech font-bold uppercase mb-4 text-xs flex items-center gap-2">
                                <Check className="w-4 h-4" /> Points Forts (Pros)
                            </h3>
                            <textarea
                                className="w-full bg-black/40 border border-white/10 p-3 h-24 text-white text-xs focus:border-green-500 outline-none transition-all rounded-sm resize-none"
                                placeholder="Un point par ligne..."
                                value={product.pros?.join('\n')}
                                onChange={e => onChange({ pros: e.target.value.split('\n') })}
                            />
                        </div>
                        <div>
                            <h3 className="text-red-500 font-tech font-bold uppercase mb-4 text-xs flex items-center gap-2">
                                <X className="w-4 h-4" /> Points Faibles (Cons)
                            </h3>
                            <textarea
                                className="w-full bg-black/40 border border-white/10 p-3 h-24 text-white text-xs focus:border-red-500 outline-none transition-all rounded-sm resize-none"
                                placeholder="Un point par ligne..."
                                value={product.cons?.join('\n')}
                                onChange={e => onChange({ cons: e.target.value.split('\n') })}
                            />
                        </div>
                    </div>

                    {/* BLOC : SPECS TECHNIQUES */}
                    <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                        <h3 className="text-white font-tech font-bold uppercase mb-4 text-sm flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-blue-400" /> Fiche Technique (Specs)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(product.specs || []).map((spec, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        className="flex-1 bg-black/40 border border-white/10 p-2 text-xs text-gray-400 font-bold uppercase"
                                        value={spec.label}
                                        placeholder="LABEL (ex: RAM)"
                                        onChange={e => {
                                            const newSpecs = [...(product.specs || [])];
                                            newSpecs[idx].label = e.target.value;
                                            onChange({ specs: newSpecs });
                                        }}
                                    />
                                    <input
                                        className="flex-1 bg-black/40 border border-white/10 p-2 text-xs text-white"
                                        value={spec.value}
                                        placeholder="VALEUR (ex: 16Go)"
                                        onChange={e => {
                                            const newSpecs = [...(product.specs || [])];
                                            newSpecs[idx].value = e.target.value;
                                            onChange({ specs: newSpecs });
                                        }}
                                    />
                                    <button type="button" onClick={() => {
                                        const newSpecs = (product.specs || []).filter((_, i) => i !== idx);
                                        onChange({ specs: newSpecs });
                                    }} className="text-red-500 hover:text-white"><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => onChange({ specs: [...(product.specs || []), { label: '', value: '' }] })}
                                className="p-2 border border-dashed border-white/10 text-gray-500 hover:text-white hover:border-white/30 text-xs flex items-center justify-center gap-2 transition-all col-span-2"
                            >
                                <ListPlus className="w-3 h-3" /> Ajouter une spec
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- COLONNE DROITE (Prix & Media) --- */}
                <div className="space-y-6">

                    {/* BLOC : PRIX */}
                    <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                        <h3 className="text-white font-tech font-bold uppercase mb-6 text-sm flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-green-500" /> Prix & Promotion
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 block tracking-widest">Prix de Vente (FCFA)</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 p-4 text-white text-2xl font-tech font-bold focus:border-xeption-gold outline-none transition-all rounded-sm"
                                    placeholder="0"
                                    value={formatPriceDisplay(product.price)}
                                    onChange={e => handlePriceChange(e.target.value, 'price')}
                                />
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <label className="flex items-center gap-3 cursor-pointer group mb-4">
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={product.isPromo}
                                        onChange={e => onChange({ isPromo: e.target.checked })}
                                    />
                                    <div className={`w-10 h-6 rounded-full relative transition-all ${product.isPromo ? 'bg-xeption-red shadow-[0_0_10px_#ff0033]' : 'bg-gray-800'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${product.isPromo ? 'left-5' : 'left-1'}`}></div>
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${product.isPromo ? 'text-xeption-red' : 'text-gray-500'}`}>Activer Promotion</span>
                                </label>

                                {product.isPromo && (
                                    <div className="animate-in slide-in-from-top-2">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 block tracking-widest">Ancien Prix (Prix barré)</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-red-500/30 p-4 text-gray-400 font-mono line-through focus:border-xeption-red outline-none transition-all rounded-sm"
                                            placeholder="ex: 850 000"
                                            value={formatPriceDisplay(product.oldPrice)}
                                            onChange={e => handlePriceChange(e.target.value, 'oldPrice')}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* BLOC : GARANTIE */}
                    <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm">
                        <h3 className="text-white font-tech font-bold uppercase mb-4 text-sm flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-blue-500" /> Service Garantie
                        </h3>
                        <div className="space-y-4">
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 block tracking-widest">Durée de la Garantie (Mois)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    className="flex-1 bg-black/40 border border-white/10 p-4 text-white font-mono focus:border-blue-500 outline-none transition-all rounded-sm"
                                    placeholder="0"
                                    value={product.warrantyMonths || ''}
                                    onChange={e => onChange({ warrantyMonths: Math.max(0, +e.target.value) })}
                                    min="0" />
                                <span className="text-gray-500 font-tech uppercase font-bold text-xs">Mois</span>
                            </div>
                        </div>
                    </div>

                    {/* BLOC : MEDIA MANAGER */}
                    <div className="bg-black/40 backdrop-blur-md p-6 border border-white/10 rounded-sm space-y-6">
                        <h3 className="text-white font-tech font-bold uppercase mb-4 text-sm flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-xeption-gold" /> Multimédia
                        </h3>

                        {/* 1. Main Image */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block tracking-widest">Image Principale</label>
                            <div className="aspect-video bg-black flex items-center justify-center border border-white/10 relative overflow-hidden group rounded-sm">
                                {product.image ? (
                                    <img src={product.image} className="h-full object-contain" alt="Main" />
                                ) : (
                                    <ImageIcon className="w-8 h-8 text-gray-700" />
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <button type="button" onClick={() => mainImageInputRef.current?.click()} className="bg-white text-black text-xs font-bold px-3 py-1 uppercase rounded-sm flex items-center gap-1">
                                        {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Changer
                                    </button>
                                </div>
                            </div>
                            <input type="file" ref={mainImageInputRef} className="hidden" onChange={handleMainImageUpload} accept="image/*" />
                        </div>

                        {/* 2. Gallery (Multi Images) */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Galerie Photos</label>
                                <button type="button" onClick={() => galleryInputRef.current?.click()} className="text-[10px] text-xeption-gold hover:text-white uppercase font-bold flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Ajouter
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {(product.images || []).map((img, idx) => (
                                    <div key={idx} className="aspect-square bg-black border border-white/10 relative group rounded-sm overflow-hidden">
                                        <img src={img} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt={`Gallery ${idx}`} />
                                        <button
                                            type="button"
                                            onClick={() => removeGalleryImage(idx)}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => galleryInputRef.current?.click()}
                                    className="aspect-square border border-dashed border-white/20 flex items-center justify-center hover:bg-white/5 transition-colors rounded-sm"
                                >
                                    {uploadingGallery ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <Plus className="w-4 h-4 text-gray-500" />}
                                </button>
                            </div>
                            <input type="file" ref={galleryInputRef} className="hidden" onChange={handleGalleryUpload} accept="image/*" multiple />
                        </div>

                        {/* 3. Video */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block tracking-widest">Vidéo Produit (MP4)</label>
                            {product.video ? (
                                <div className="relative border border-white/10 bg-black rounded-sm overflow-hidden group">
                                    <video src={product.video} className="w-full h-32 object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <button type="button" onClick={() => onChange({ video: '' })} className="bg-red-500 p-1 rounded text-white"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => videoInputRef.current?.click()}
                                    className="w-full border border-dashed border-white/20 h-24 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors rounded-sm group"
                                >
                                    {uploadingVideo ? <Loader2 className="w-6 h-6 animate-spin text-xeption-gold" /> : <Film className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" />}
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">{uploadingVideo ? 'Envoi...' : 'Ajouter une vidéo'}</span>
                                </button>
                            )}
                            <input type="file" ref={videoInputRef} className="hidden" onChange={handleVideoUpload} accept="video/mp4,video/webm" />

                            {/* Fallback URL input */}
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 p-2 text-xs text-gray-400 mt-2 rounded-sm"
                                placeholder="Ou coller une URL vidéo..."
                                value={product.video || ''}
                                onChange={e => onChange({ video: e.target.value })}
                            />
                        </div>

                    </div>
                </div>
            </form>
        </div>
    );
};

export default ProductEditorOverlay;
