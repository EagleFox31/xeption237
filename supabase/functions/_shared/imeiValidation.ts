export const sanitizeImei = (value?: string): string => (value || '').replace(/\D/g, '').trim();

export const luhnCheck = (imei: string): boolean => {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(imei[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return (10 - (sum % 10)) % 10 === parseInt(imei[14], 10);
};

/**
 * IMEI manifestement faux - ce que Luhn ne peut PAS attraper.
 *
 * Luhn n'est qu'une somme de controle : il detecte les fautes de frappe, pas
 * les numeros inventes. 000000000000000 a une somme de 0, donc divisible par
 * 10 : Luhn le declare valide. Sans ce filtre la cascade interroge un
 * fournisseur externe, qui repond avec assurance (Apple iPhone 15, 92 % de
 * confiance) sur un TAC inexistant, et le resultat part en cache.
 */
export const isTrivialTestImei = (imei: string): boolean => {
  if (!/^[0-9]{15}$/.test(imei)) return false;
  if (new Set(imei).size === 1) return true;              // 000..., 111..., 999...
  if ('01234567890123456789'.includes(imei)) return true; // suite croissante
  if ('98765432109876543210'.includes(imei)) return true; // suite decroissante
  if (imei.startsWith('00000000')) return true;           // TAC entierement a zero
  return false;
};
