import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { hydrateBandwidthTier } from './utils/bandwidthDetector';
import { initAnalytics } from './utils/analyticsInit';
import App from './App';
import './styles/app.css';

/** Tier réseau (cache session ou API synchrone) avant toute URL Cloudinary. */
hydrateBandwidthTier();

/** GTM (GA4 + Meta Pixel) — no-op si VITE_GTM_ID absent. */
initAnalytics();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);