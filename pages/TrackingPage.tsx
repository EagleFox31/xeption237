import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { PageSEO } from '../utils/seo';
import TrackingHub from '../components/TrackingHub';
import OrderTracking from '../components/OrderTracking';

const TrackingCommandePage: React.FC = () => <OrderTracking />;

const TrackingPage: React.FC = () => (
  <>
    <Routes>
      <Route
        index
        element={
          <>
            <PageSEO
              title="Suivi — Commande & Smart Troc | Xeption Network"
              description="Suivez votre commande ou votre bon de reprise Smart Troc chez Xeption Network."
              path="/tracking"
            />
            <TrackingHub />
          </>
        }
      />
      <Route
        path="commande"
        element={
          <>
            <PageSEO
              title="Suivi de Commande — Xeption Network Cameroun"
              description="Suivez votre commande Xeption en temps réel. Livraison rapide à Yaoundé, Douala et partout au Cameroun."
              path="/tracking/commande"
            />
            <TrackingCommandePage />
          </>
        }
      />
    </Routes>
  </>
);

export default TrackingPage;
