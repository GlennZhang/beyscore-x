// Beyblade X parts catalogue generated from the checked-in go-shoot data
// snapshot. Images are mirrored under /public/assets/parts for offline use.
import bladeData from './raw/part-blade.json';
import dividedBladeData from './raw/part-blade-divided.json';
import ratchetData from './raw/part-ratchet.json';
import bitData from './raw/part-bit.json';

export const SYSTEMS = {
  STANDARD: 'Standard',
  CX: 'CX',
};

export const CATEGORIES = {
  BLADE: 'Blade',
  RATCHET: 'Ratchet',
  BIT: 'Bit',
  LOCK_CHIP: 'Lock Chip',
  MAIN_BLADE: 'Main Blade',
  METAL_BLADE: 'Metal Blade',
  OVER_BLADE: 'Over Blade',
  ASSIST_BLADE: 'Assist Blade',
};

export const COMBO_SCHEMAS = {
  [SYSTEMS.STANDARD]: [
    { key: 'blade', label: '刃 Blade', category: CATEGORIES.BLADE },
    { key: 'ratchet', label: '齿盘 Ratchet', category: CATEGORIES.RATCHET },
    { key: 'bit', label: '轴心 Bit', category: CATEGORIES.BIT },
  ],
  [SYSTEMS.CX]: [
    { key: 'lockChip', label: '锁片 Lock Chip', category: CATEGORIES.LOCK_CHIP },
    { key: 'mainBlade', label: '主刃 Main Blade', category: CATEGORIES.MAIN_BLADE },
    { key: 'overBlade', label: '外刃 Over Blade', category: CATEGORIES.OVER_BLADE },
    { key: 'assistBlade', label: '辅助刃 Assist Blade', category: CATEGORIES.ASSIST_BLADE },
    { key: 'ratchet', label: '齿盘 Ratchet', category: CATEGORIES.RATCHET },
    { key: 'bit', label: '轴心 Bit', category: CATEGORIES.BIT },
  ],
};

const TYPE_LABELS = {
  att: '攻击',
  def: '防御',
  sta: '持久',
  bal: '平衡',
  right: '右旋',
  left: '左旋',
};

const BIT_PREFIX_EN = {
  B: 'Bound', D: 'Disk', F: 'Free', G: 'Gear', H: 'High', L: 'Low',
  M: 'Metal', R: 'Rubber', T: 'Trans', U: 'Under', W: 'Wall',
};

const BIT_PREFIX_ZH = {
  B: '弹簧', D: '圆盘', F: '自由', G: '齿轮', H: '高', L: '低',
  M: '金属', R: '橡胶', T: '变换', U: '超低', W: '护墙',
};

const BIT_NAME_ZH = {
  Accel: '加速', Ball: '球形', Cyclone: '旋风', Dot: '圆点', Elevate: '升降',
  Flat: '平面', Glide: '滑翔', Hexa: '六角', Ignition: '点火', Jolt: '震击',
  Kick: '踢击', Level: '水平', Merge: '融合', Needle: '针形', Narrow: '窄尖',
  Orb: '圆球', Point: '尖点', Quake: '震动', Rush: '冲刺', Spike: '尖刺',
  Taper: '锥形', Unite: '联合', Vortex: '涡旋', Wedge: '楔形',
  Yielding: '柔韧', Zap: '电击', Operate: '操控', Turbo: '涡轮',
};

function readableName(value = '') {
  return value
    .replaceAll('\\', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstChinese(names = {}) {
  return (names.chi || names.aka || names.jap || names.eng || '未知').replaceAll('\\', ' ');
}

function commonFields(code, info, extra) {
  return {
    code,
    desc: info.desc || '',
    stat: info.stat || [],
    attrs: info.attr || [],
    tags: (info.attr || []).map((attr) => TYPE_LABELS[attr] || attr),
    ...extra,
  };
}

const standardBlades = Object.entries(bladeData).map(([code, info]) =>
  commonFields(code, info, {
    id: `blade-${code}`,
    name: readableName(info.names?.eng || code),
    nameZh: firstChinese(info.names),
    nameJa: info.names?.jap || '',
    hasbroName: info.names?.hasbro || '',
    system: SYSTEMS.STANDARD,
    line: info.group || 'BX',
    category: CATEGORIES.BLADE,
    image: `/assets/parts/blade/${code}.png`,
  })
);

const cxCategoryMeta = {
  chip: [CATEGORIES.LOCK_CHIP, 'Lock Chip', '锁片'],
  main: [CATEGORIES.MAIN_BLADE, 'Main Blade', '主刃'],
  metal: [CATEGORIES.METAL_BLADE, 'Metal Blade', '金属刃'],
  over: [CATEGORIES.OVER_BLADE, 'Over Blade', '外刃'],
  assist: [CATEGORIES.ASSIST_BLADE, 'Assist Blade', '辅助刃'],
};

const cxBlades = Object.entries(dividedBladeData.CX)
  .filter(([kind]) => cxCategoryMeta[kind])
  .flatMap(([kind, records]) => {
    const [category, englishSuffix, chineseSuffix] = cxCategoryMeta[kind];
    return Object.entries(records).map(([code, info]) =>
      commonFields(code, info, {
        id: `cx-${kind}-${code}`,
        name: `${readableName(info.names?.eng || code)} ${englishSuffix}`,
        nameZh: `${firstChinese(info.names)}${chineseSuffix}`,
        nameJa: info.names?.jap || '',
        hasbroName: info.names?.hasbro || '',
        system: SYSTEMS.CX,
        line: 'CX',
        category,
        image: `/assets/parts/blade/CX/${kind}/${code}.png`,
      })
    );
  });

const ratchets = Object.entries(ratchetData).map(([code, info]) =>
  commonFields(code, info, {
    id: `ratchet-${code}`,
    name: code,
    nameZh: `${code} 齿盘`,
    nameJa: '',
    hasbroName: '',
    system: SYSTEMS.STANDARD,
    line: 'Universal',
    category: CATEGORIES.RATCHET,
    image: `/assets/parts/ratchet/${code}.png`,
  })
);

const namedBits = Object.entries(bitData)
  .filter(([, info]) => info.names?.eng)
  .sort(([a], [b]) => b.length - a.length);

function resolveBitName(code) {
  const direct = bitData[code]?.names?.eng;
  if (direct) return { english: direct, chinese: BIT_NAME_ZH[direct] || direct };

  const base = namedBits.find(([suffix]) => code.endsWith(suffix));
  if (!base) return { english: code, chinese: code };
  const [suffix, info] = base;
  const prefix = code.slice(0, -suffix.length);
  const englishBase = info.names.eng;
  return {
    english: `${[...prefix].map((p) => BIT_PREFIX_EN[p] || p).join(' ')} ${englishBase}`.trim(),
    chinese: `${[...prefix].map((p) => BIT_PREFIX_ZH[p] || p).join('')}${BIT_NAME_ZH[englishBase] || englishBase}`,
  };
}

const bits = Object.entries(bitData).map(([code, info]) => {
  const names = resolveBitName(code);
  return commonFields(code, info, {
    id: `bit-${code}`,
    name: names.english,
    nameZh: names.chinese,
    nameJa: info.names?.jap || '',
    hasbroName: '',
    system: SYSTEMS.STANDARD,
    line: 'Universal',
    category: CATEGORIES.BIT,
    image: `/assets/parts/bit/${code}.png`,
  });
});

export const PARTS = [...standardBlades, ...cxBlades, ...ratchets, ...bits];

export function isPartCompatible(part, system) {
  if (part.system === system) return true;
  return system === SYSTEMS.CX &&
    (part.category === CATEGORIES.RATCHET || part.category === CATEGORIES.BIT);
}

export function getPartById(id) {
  if (!id) return null;
  return PARTS.find((part) => part.id === id) || null;
}

export function partLabel(id) {
  const part = getPartById(id);
  return part ? `${part.nameZh} (${part.code})` : '—';
}

export function partsByCategory(system, category) {
  return PARTS.filter((part) => part.category === category && isPartCompatible(part, system));
}

export function categoriesForSystem(system) {
  const schemaCategories = COMBO_SCHEMAS[system]?.map((slot) => slot.category) || [];
  const catalogueCategories = PARTS
    .filter((part) => part.system === system)
    .map((part) => part.category);
  return [...new Set([...schemaCategories, ...catalogueCategories])];
}
