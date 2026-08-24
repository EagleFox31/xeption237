import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPanel from '../components/admin/AdminPanel';
import StaffLogin from '../components/StaffLogin';
import { Product } from '../types';
import { registerAdminServiceWorker } from '../utils/registerAdminServiceWorker';

interface AdminPageProps {
    isAuthenticated: boolean;
    setIsAuthenticated: (auth: boolean) => void;
    products: Product[];
    onUpdateProducts: (products: Product[]) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ isAuthenticated, setIsAuthenticated, products, onUpdateProducts }) => {
    useEffect(() => {
        if (isAuthenticated) void registerAdminServiceWorker();
    }, [isAuthenticated]);

    return (
        <>
            <Helmet>
                <title>Staff Portal | Xeption</title>
                <meta name="robots" content="noindex" />
            </Helmet>

            {isAuthenticated ? (
                <AdminPanel
                    products={products}
                    onUpdateProducts={onUpdateProducts}
                />
            ) : (
                <StaffLogin mode="erp" onLogin={() => setIsAuthenticated(true)} />
            )}
        </>
    );
};

export default AdminPage;
