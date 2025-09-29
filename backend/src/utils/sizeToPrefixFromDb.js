const SizeRule = require('../models/sizeRule.model');
const r1 = n => Math.round(n*10)/10;
const toNum = x => (x==null?NaN : (typeof x==='number'? x : parseFloat(String(x).replace(',','.'))));

function normalizeRule(r){
  const out={ wMin:(r.widthMin??r.wMin??r.minB??null), wMax:(r.widthMax??r.wMax??r.maxB??null), priority:r.priority??0, bands:[] };
  const bands = Array.isArray(r.bands)&&r.bands.length? r.bands : (Array.isArray(r.legacyBands)? r.legacyBands : []);
  for(const b of (bands||[])){
    const equals = Array.isArray(b.heightEquals)? b.heightEquals : (Array.isArray(b.equals)? b.equals : []);
    if(equals.length) out.bands.push({ type:'eq', values: equals.map(v=>r1(toNum(v))), prefix:b.prefix });
    else out.bands.push({ type:'range', hMin:(b.heightMin??b.hMin??null), hMax:(b.heightMax??b.hMax??null), prefix:b.prefix });
  }
  return out;
}
function widthMatches(w,r){ if(r.wMin!=null && w<toNum(r.wMin)) return false; if(r.wMax!=null && w>toNum(r.wMax)) return false; return true; }
function bandMatches(h,b){ if(b.type==='eq'){ const hh=r1(h); return b.values.some(v=>v===hh); } if(b.hMin!=null && h<toNum(b.hMin)) return false; if(b.hMax!=null && h>toNum(b.hMax)) return false; return true; }

module.exports = async function sizeToPrefixFromDb(width, height){
  const w=toNum(width), h=toNum(height);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  const rules = await SizeRule.find({}).lean();
  if (!rules.length) return null;
  const cand = rules.map(normalizeRule).filter(r=>widthMatches(w,r));
  cand.sort((a,b)=> (a.priority??0)-(b.priority??0) || ((a.wMax??Infinity)-(b.wMax??Infinity)));
  for(const r of cand){
    for(const b of r.bands.filter(b=>b.type==='eq'))    if (bandMatches(h,b)) return b.prefix;
    for(const b of r.bands.filter(b=>b.type==='range')) if (bandMatches(h,b)) return b.prefix;
  }
  return null;
};
