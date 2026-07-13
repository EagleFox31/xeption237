/** Description marketing réelle vs stub import / placeholder. */
export function isWeakProductDescription(
  desc?: string | null,
  name?: string | null,
): boolean {
  const d = (desc || '').trim();
  if (!d) return true;
  if (/^import mfoundi mall/i.test(d)) return true;
  if (d.length < 50) return true;
  const words = d.split(/\s+/).filter(Boolean);
  if (words.length < 12) return true;
  const lower = d.toLowerCase();
  const nameLower = (name || '').toLowerCase().trim();
  if (nameLower && lower === nameLower) return true;
  return false;
}
