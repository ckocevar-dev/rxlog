// frontend-react/src/lib/dimensions.js
export function parseDimension(raw) {
  if (raw == null) return { mm: null, cm: null, unit: null };
  let s = String(raw).trim().toLowerCase();
  if (!s) return { mm: null, cm: null, unit: null };

  // normalize decimal separator
  s = s.replace(',', '.');

  // detect unit
  let unit = null;
  if (/\bmm\b/.test(s)) unit = 'mm';
  else if (/\bcm\b/.test(s)) unit = 'cm';

  // strip unit tokens
  s = s.replace(/(mm|millimeter|cm|zentimeter)/g, '').trim();

  const val = Number(s);
  if (!Number.isFinite(val)) return { mm: null, cm: null, unit: null };

  if (unit === 'mm') {
    const mm = Math.round(val);
    return { mm, cm: mm / 10, unit: 'mm' };
  }
  if (unit === 'cm') {
    const cm = val;
    return { mm: Math.round(cm * 10), cm, unit: 'cm' };
  }

  // no unit → heuristic
  if (val <= 40) {
    const cm = val;
    return { mm: Math.round(cm * 10), cm, unit: 'cm?' };
  } else {
    const mm = Math.round(val);
    return { mm, cm: mm / 10, unit: 'mm?' };
  }
}

export function parseDimensionToMM(raw) {
  return parseDimension(raw).mm;
}
