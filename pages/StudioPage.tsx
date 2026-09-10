import React from 'react';
import { Helmet } from 'react-helmet-async';
import StudioPanel from '../components/studio/StudioPanel';
import StaffLogin from '../components/StaffLogin';
import { Product } from '../types';

interface StudioPageProps {
  isSuperAdmin: boolean;
  setIsSuperAdmin: (auth: boolean) => void;
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  userEmail?: string;
}

const StudioPage: React.FC<StudioPageProps> = ({
  isSuperAdmin,
  setIsSuperAdmin,
  products,
  onUpdateProducts,
  userEmail,
}) => {
  return (
    <>
      <Helmet>
        <title>Studio | Xeption — Créateur</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {isSuperAdmin ? (
        <StudioPanel
          products={products}
          onUpdateProducts={onUpdateProducts}
          userEmail={userEmail}
        />
      ) : (
        <StaffLogin
          mode="studio"
          onLogin={() => setIsSuperAdmin(true)}
        />
      )}
    </>
  );
};

export default StudioPage;
