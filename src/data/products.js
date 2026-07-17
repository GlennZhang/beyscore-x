import officialProducts from './raw/official-products.json';
import productRows from './raw/prod-beys.json';
import { PARTS, CATEGORIES } from './parts';

const bladesByCode = new Map(
  PARTS.filter((part) => part.category === CATEGORIES.BLADE).map((part) => [part.code, part])
);
const cxChipsByCode = new Map(
  PARTS.filter((part) => part.category === CATEGORIES.LOCK_CHIP).map((part) => [part.code, part])
);

function productBlade(combo = '') {
  const bladeCode = combo.trim().split(/\s+/)[0];
  if (!bladeCode || bladeCode === '/') return null;
  if (bladeCode.includes('.')) return cxChipsByCode.get(bladeCode.split('.')[0]) || null;
  return bladesByCode.get(bladeCode) || null;
}

// Community rows include recolours, prizes and regional variants. They are
// retained as a secondary dataset and used to enrich the official catalogue
// with combo specifications when an exact product code is available.
export const PRODUCT_VARIANTS = productRows.map((row, index) => {
  const [code, rawType, combo] = row;
  const blade = productBlade(combo);
  const videoId = row.find((value, position) => position > 2 && typeof value === 'string');
  const meta = row.find((value) => value && typeof value === 'object' && !Array.isArray(value)) || {};
  return {
    id: `variant-${code}-${index}`,
    code,
    combo,
    rawType,
    blade,
    videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
    coat: meta.coat || '',
  };
});

const firstVariantByCode = new Map();
PRODUCT_VARIANTS.forEach((variant) => {
  if (!firstVariantByCode.has(variant.code)) firstVariantByCode.set(variant.code, variant);
});

export const PRODUCTS = officialProducts.map((official) => {
  const variant = firstVariantByCode.get(official.code);
  return {
    ...official,
    combo: variant?.combo || '',
    rawType: variant?.rawType || official.category,
    name: variant?.blade?.name || official.nameJa,
    nameZh: variant?.blade?.nameZh || official.nameJa,
    coat: variant?.coat || '',
    videoUrl: variant?.videoUrl || '',
  };
});
