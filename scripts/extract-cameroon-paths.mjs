import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = fs.readFileSync(path.join(__dirname, '../public/cameroon.svg'), 'utf8');
const geo = raw.match(/mapsvg:geoViewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number) ?? [];
const width = Number(raw.match(/width="([^"]+)"/)?.[1]);
const height = Number(raw.match(/height="([^"]+)"/)?.[1]);
const paths = [];
for (const block of raw.match(/<path[\s\S]*?\/>/g) ?? []) {
  const id = block.match(/id="([^"]+)"/)?.[1];
  const d = block.match(/\sd="([^"]+)"/)?.[1];
  if (id && d) paths.push({ id, d });
}

const out = `/** Auto-généré depuis public/cameroon.svg — ne pas éditer à la main. */
export const CAMEROON_SVG_SIZE = { width: ${width}, height: ${height} } as const;

/** mapsvg:geoViewBox → west, north, east, south */
export const CAMEROON_GEO_BOUNDS = {
  left: ${geo[0]},
  top: ${geo[1]},
  right: ${geo[2]},
  bottom: ${geo[3]},
} as const;

export const CAMEROON_REGION_PATHS: ReadonlyArray<{ id: string; d: string }> = ${JSON.stringify(paths, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../components/tracking/cameroonRegions.generated.ts'), out);
console.log('Wrote', paths.length, 'paths', width, height, geo);
