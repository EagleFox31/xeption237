/** 4 colonnes × 4 rangées — assez pour comparer, assez court pour pager. */
export const SHOP_PAGE_SIZE = 16;

export const parsePageParam = (raw: string | null | undefined): number => {
  const n = Number.parseInt(raw ?? '1', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
};

export const totalPages = (itemCount: number, pageSize: number = SHOP_PAGE_SIZE): number => {
  if (itemCount <= 0) return 1;
  return Math.max(1, Math.ceil(itemCount / pageSize));
};

export const clampPage = (
  page: number,
  itemCount: number,
  pageSize: number = SHOP_PAGE_SIZE,
): number => Math.min(Math.max(1, page), totalPages(itemCount, pageSize));

export const paginateItems = <T>(
  items: T[],
  page: number,
  pageSize: number = SHOP_PAGE_SIZE,
): T[] => {
  const safe = clampPage(page, items.length, pageSize);
  const start = (safe - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

export type PageToken = number | 'ellipsis';

/** Pages visibles autour de la page courante (1 … 4 5 6 … 12). */
export const visiblePageTokens = (current: number, last: number): PageToken[] => {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }
  const cur = Math.min(Math.max(1, current), last);
  const keep = new Set([1, last, cur, cur - 1, cur + 1]);
  if (cur <= 3) {
    keep.add(2);
    keep.add(3);
  }
  if (cur >= last - 2) {
    keep.add(last - 1);
    keep.add(last - 2);
  }
  const nums = [...keep].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const tokens: PageToken[] = [];
  for (const n of nums) {
    const prev = tokens[tokens.length - 1];
    if (typeof prev === 'number' && n - prev > 1) tokens.push('ellipsis');
    tokens.push(n);
  }
  return tokens;
};
