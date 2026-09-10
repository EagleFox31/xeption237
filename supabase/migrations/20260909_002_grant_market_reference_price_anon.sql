-- Autorise le rôle anon à exécuter la fonction de calcul de prix médian marché pour le Smart Troc.
-- La fonction est SECURITY DEFINER et renvoie uniquement un agrégat (médiane, date, count),
-- sans jamais donner accès à la table sous-jacente market_reference_prices (qui reste réservée au staff).

GRANT EXECUTE ON FUNCTION public.market_reference_price(TEXT, TEXT, TEXT) TO anon;
