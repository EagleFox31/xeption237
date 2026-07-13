-- Renommer les rôles staff : libellés métier Xeption (vendeur, responsable, direction)
UPDATE staff SET role = 'vendeur' WHERE role = 'editor';
UPDATE staff SET role = 'responsable' WHERE role = 'manager';
UPDATE staff SET role = 'direction' WHERE role = 'admin';
