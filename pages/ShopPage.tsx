import React from 'react';
import { Helmet } from 'react-helmet-async';
import ProductList from '../components/ProductList';
import { Product } from '../types';
import { useNavigate } from 'react-router-dom';

interface ShopPageProps {
    products: Product[];
    onAddToCart: (product: Product) => void;
}

const ShopPage: React.FC<ShopPageProps> = ({ products, onAddToCart }) => {
    const navigate = useNavigate();

    return (
        <div className="pt-8 min-h-screen">
            <Helmet>
                <title>Le Shop High-Tech Cameroun | Xeption</title>
                <meta name="description" content="Découvrez notre catalogue complet : Smartphones, Laptops, Gadgets. Livraison rapide à Douala et Yaoundé." />
            </Helmet>

            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">La Boutique <span className="text-xeption-gold">237</span></h1>
                <p className="text-gray-300 mt-2 font-medium bg-black/40 inline-block px-4 py-1 rounded-full backdrop-blur-md border border-white/10">Choisis ton matos, on livre au calme.</p>
            </div>
            <ProductList
                products={products}
                onAddToCart={onAddToCart}
                onProductClick={(p) => navigate(`/product/${p.id}`)}
                title="Catalogue Complet"
            />
        </div>
    );
};

export default ShopPage;
