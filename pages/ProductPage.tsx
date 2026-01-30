import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductDetail from '../components/ProductDetail';
import { Product } from '../types';

interface ProductPageProps {
    products: Product[];
    onAddToCart: (product: Product) => void;
}

const ProductPage: React.FC<ProductPageProps> = ({ products, onAddToCart }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Find product by ID
    const product = products.find(p => p.id === id);

    if (!product) {
        if (products.length === 0) {
            // Loading state
            return (
                <div className="min-h-screen pt-32 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-xeption-gold border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }
        return (
            <div className="min-h-screen pt-32 text-center text-white">
                <h2 className="text-2xl font-bold mb-4">Produit Introuvable</h2>
                <button onClick={() => navigate('/shop')} className="text-xeption-gold underline">Retour au shop</button>
            </div>
        );
    }

    const handleBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate('/shop');
        }
    };

    return (
        <ProductDetail
            product={product}
            onBack={handleBack}
            onAddToCart={onAddToCart}
        />
    );
};

export default ProductPage;
