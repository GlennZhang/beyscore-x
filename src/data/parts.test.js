import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CATEGORIES,
  PARTS,
  SYSTEMS,
  partsByCategory,
} from './parts';
import { PRODUCTS, PRODUCT_VARIANTS } from './products';

describe('real catalogue data', () => {
  it('loads the complete checked-in parts and product snapshots', () => {
    expect(PARTS).toHaveLength(223);
    expect(PRODUCTS).toHaveLength(146);
    expect(PRODUCT_VARIANTS).toHaveLength(301);
    expect(new Set(PARTS.map((part) => part.id)).size).toBe(PARTS.length);
    expect(new Set(PRODUCTS.map((product) => product.id)).size).toBe(PRODUCTS.length);
  });

  it('makes universal ratchets and bits available to CX combinations', () => {
    expect(partsByCategory(SYSTEMS.CX, CATEGORIES.RATCHET)).toHaveLength(37);
    expect(partsByCategory(SYSTEMS.CX, CATEGORIES.BIT)).toHaveLength(53);
  });

  it('has local images for every published part except two upstream placeholders', () => {
    const missing = PARTS
      .filter((part) => {
        const localPath = path.join(process.cwd(), 'public', part.image.replace(/^\//, ''));
        return !fs.existsSync(localPath);
      })
      .map((part) => `${part.category}:${part.code}`)
      .sort();

    expect(missing).toEqual(['Bit:LP', 'Ratchet:5-50']);
  });

  it('has a downloaded Takara Tomy image for every official product card', () => {
    const missing = PRODUCTS.filter((product) => {
      const localPath = path.join(process.cwd(), 'public', product.image.replace(/^\//, ''));
      return !fs.existsSync(localPath);
    });

    expect(missing).toEqual([]);
  });
});
