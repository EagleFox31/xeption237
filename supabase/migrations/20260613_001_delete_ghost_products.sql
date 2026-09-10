-- Produits vides créés par erreur (nom vide, prix/stock 0, placeholder)
-- Visible en admin Accessoires : lignes identiques « Accessoires », image cassée

DELETE FROM products
WHERE trim(coalesce(name, '')) = ''
  AND coalesce(price, 0) = 0
  AND coalesce(stock, 0) = 0;
