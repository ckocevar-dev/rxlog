// frontend/ui.js
const API_BASE = 'http://localhost:3000';
const API = `${API_BASE}/api/books`;
const API_BARCODES = `${API_BASE}/api/barcodes`;

function $(id){return document.getElementById(id)}
function setActive(hash){ const tabs=['register','update','search'];
  tabs.forEach(t=>{ const s=$('page-'+t); if(s) s.classList.add('hidden'); const n=$('nav-'+t); if(n) n.classList.remove('active'); });
  const key=(hash||'#register').replace('#',''); const s=$('page-'+key); if(s) s.classList.remove('hidden'); const n=$('nav-'+key); if(n) n.classList.add('active'); }
window.addEventListener('hashchange', ()=>setActive(location.hash)); setActive(location.hash||'#register');

const parseNum = v => { if (v==null) return NaN; if (typeof v==='number') return v; const s=String(v).replace(',','.').trim(); const f=parseFloat(s); return Number.isFinite(f)?f:NaN; };
const debounce = (fn,ms=250)=>{ let t; return(...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

async function previewBarcodeBySize(w,h){
  if (!Number.isFinite(w)||!Number.isFinite(h)) return { prefix:null, candidate:null };
  const r=await fetch(`${API_BARCODES}/preview-by-size?BookWidth=${encodeURIComponent(w)}&BookHeight=${encodeURIComponent(h)}`);
  if (!r.ok) return { prefix:null, candidate:null };
  return r.json();
}

const updateLivePreview = debounce(async ()=>{
  const w=parseNum($('rwidth').value), h=parseNum($('rheight').value);
  if(!Number.isFinite(w)||!Number.isFinite(h)){
    $('reg-prefix').value=''; $('reg-preview-barcode').value=''; $('reg-pool-note').value='enter width & height'; $('btnCreate').disabled=true; return;
  }
  const { prefix, candidate } = await previewBarcodeBySize(w,h);
  $('reg-prefix').value = prefix || '';
  $('reg-preview-barcode').value = candidate?.Barcode || '';
  $('reg-pool-note').value = prefix ? (candidate ? 'available' : 'none found') : 'enter width & height';
  $('btnCreate').disabled = !candidate;
}, 200);

async function create(){
  const suggested = $('reg-preview-barcode')?.value;
  if (!suggested){ $('rstatus').textContent='No barcode available for these dimensions. Registration not possible until barcodes are freed/seeded.'; return; }
  const clamp = n => { const x=Number.isFinite(n)?n:0; return x<0?0:x>19?19:Math.trunc(x); };
  const pN = v => { const f=parseFloat(String(v).replace(',','.')); return Number.isFinite(f)?f:NaN; };
  const kw=[]; const pushKW=(wId,pId)=>{ const wv=$(wId).value.trim(); if(!wv) return; kw.push({word:wv, position:clamp(pN($(pId).value))}); };
  pushKW('kw1','pos1'); pushKW('kw2','pos2'); pushKW('kw3','pos3');
  const body={ author:$('rauthor').value.trim(), publisher:$('rpub').value, pages:parseInt($('rpages').value,10), width:parseNum($('rwidth').value), height:parseNum($('rheight').value), titleKeywords:kw };
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){ $('rstatus').textContent=d.message||r.statusText||'Error'; return; }
  $('rstatus').textContent=`Created ✅${d.Barcode?` (Barcode ${d.Barcode})`:''}`;
}
async function load(){ const id=$('uid').value.trim(); if(!id) return;
  const r=await fetch(API+'/'+id); if(!r.ok){ $('ustatus').textContent='Not found'; return; }
  const b=await r.json(); $('uform').classList.remove('hidden');
  $('uauthor').value=b.author||''; $('upub').value=b.publisher||''; $('upages').value=b.pages||'';
  $('ukw1').value=b.titleKeywords?.[0]?.word||''; $('upos1').value=b.titleKeywords?.[0]?.position??'';
  $('ukw2').value=b.titleKeywords?.[1]?.word||''; $('upos2').value=b.titleKeywords?.[1]?.position??'';
  $('ukw3').value=b.titleKeywords?.[2]?.word||''; $('upos3').value=b.titleKeywords?.[2]?.position??'';
}
async function save(){ const id=$('uid').value.trim();
  const clamp=n=>{ const x=Number.isFinite(n)?n:0; return x<0?0:x>19?19:Math.trunc(x); };
  const pN=v=>{ const f=parseFloat(String(v).replace(',','.')); return Number.isFinite(f)?f:NaN; };
  const kw=[]; const pushKW=(wId,pId)=>{ const wv=$(wId).value.trim(); if(!wv) return; kw.push({word:wv, position:clamp(pN($(pId).value))}); };
  pushKW('ukw1','upos1'); pushKW('ukw2','upos2'); pushKW('ukw3','upos3');
  const body={ author:$('uauthor').value.trim(), publisher:$('upub').value, pages:parseInt($('upages').value,10), titleKeywords:kw };
  const r=await fetch(API+'/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  $('ustatus').textContent=r.ok?'Saved ✅':'Error';
}
$('rwidth').addEventListener('input', updateLivePreview);
$('rheight').addEventListener('input', updateLivePreview);
$('rwidth').addEventListener('blur', updateLivePreview);
$('rheight').addEventListener('blur', updateLivePreview);
document.getElementById('btnCreate').addEventListener('click', create);
document.getElementById('btnLoad').addEventListener('click', load);
document.getElementById('btnSave').addEventListener('click', save);
setActive(location.hash||'#register');
updateLivePreview();
