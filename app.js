const PBEV_CSV_URL = "https://raw.githubusercontent.com/guiajf/pbev/main/data/tabela_pbev_2026.csv";
const PBEV_SOURCE_URL = "https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

let VEHICLES = [];
let slots = [null, null];
let activeSlot = 0;
const imageCache = new Map();
const imagePending = new Set();

const PHOTO_MAP = [
  { test: /\bBYD\b.*\bDOLPHIN\s*MINI\b/i, url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/BYD_DOLPHIN_MINI_%28BRAZIL%29_BYD_SEAGULL.jpg/1280px-BYD_DOLPHIN_MINI_%28BRAZIL%29_BYD_SEAGULL.jpg", credit: "Mateusmatsuda / Wikimedia Commons — CC BY 4.0" },
  { test: /\bTOYOTA\b.*\bCOROLLA\b/i, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/2024_Toyota_Corolla_LE.jpg/960px-2024_Toyota_Corolla_LE.jpg", credit: "AnalyserOP / Wikimedia Commons — CC BY 4.0" },
  { test: /\bHONDA\b.*\bCIVIC\b/i, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/2024_Honda_Civic_e-HEV_RS.jpg/1280px-2024_Honda_Civic_e-HEV_RS.jpg", credit: "Chanokchon / Wikimedia Commons — CC BY-SA 4.0" }
];

const $ = s => document.querySelector(s);
const money = v => Number.isFinite(v) ? v.toLocaleString('pt-BR', {style:'currency', currency:'BRL', maximumFractionDigits:0}) : '—';
const money2 = v => Number.isFinite(v) ? v.toLocaleString('pt-BR', {style:'currency', currency:'BRL', minimumFractionDigits:2, maximumFractionDigits:2}) : '—';
const esc = s => String(s ?? '').replace(/[&<>\"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\\':'&#92;'}[m]));

function parseCSV(text){
  const out=[]; let row=[], cell='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c==='"'){ if(q&&n==='"'){cell+='"';i++;} else q=!q; }
    else if(c===';'&&!q){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(x=>x.trim()))out.push(row);row=[];}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);if(row.some(x=>x.trim()))out.push(row);}
  return out;
}
function num(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null;}
function uid(r,i){return `${r.marca}-${r.modelo}-${r.versao}-${i}`.toLowerCase().replace(/[^a-z0-9]+/gi,'-');}
function mapPBEV(text){
  const rows=parseCSV(text); const h=rows.shift().map(x=>x.replace(/^\uFEFF/,'').trim()); const ix=Object.fromEntries(h.map((x,i)=>[x,i]));
  return rows.map((r,i)=>{
    const prop=r[ix.propulsao]||'', fuel=r[ix.combustivel]||'', mj=num(r[ix.consumo_mj_km]);
    const gc=num(r[ix.gas_diesel_cid_kml]), gr=num(r[ix.gas_diesel_est_kml]), ec=num(r[ix.etanol_cid_kml]), er=num(r[ix.etanol_est_kml]);
    return {id:uid({marca:r[ix.marca],modelo:r[ix.modelo],versao:r[ix.versao]},i),brand:r[ix.marca]||'',model:r[ix.modelo]||'',version:r[ix.versao]||'',type:prop||'Não informado',fuel,category:r[ix.categoria]||'',gasCity:gc,gasRoad:gr,ethCity:ec,ethRoad:er,kwhPerKm:mj?mj/3.6:null,autonomy:num(r[ix.autonomia_km]),source:'INMETRO PBEV 2026'};
  }).filter(v=>v.brand&&v.model);
}
function carName(v){return `${v.brand} ${v.model}`.trim();}
function avg(a,b){return Number.isFinite(a)&&Number.isFinite(b)?a*.55+b*.45:(a??b);}
function isElectric(v){return /elétric/i.test(v.type)||/elétric/i.test(v.fuel)||Number.isFinite(v.kwhPerKm)&&!Number.isFinite(v.gasCity);}

function parseDecimalField(value){
  const raw=String(value ?? '').trim().replace(/[^0-9]/g,'');
  if(!raw) return '';
  const n=Number(raw)/100;
  return n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function bindDecimalField(id){
  const el=$(id); if(!el) return;
  el.type='text'; el.inputMode='decimal'; el.autocomplete='off';
  el.addEventListener('focus',()=>el.select());
  el.addEventListener('input',()=>{
    const formatted=parseDecimalField(el.value);
    el.value=formatted;
    table();
  });
}
function decimalValue(id){
  const el=$(id); if(!el) return 0;
  const raw=String(el.value||'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');
  return Number(raw)||0;
}
function integerValue(id){return Number(String($(id)?.value||'').replace(/\D/g,''))||0;}
function profile(){
  const km=integerValue('kmMonth'), gas=decimalValue('gasPrice'), eth=decimalValue('ethPrice'), kwh=decimalValue('kwhPrice');
  return {km,gas,eth,kwh:$('#solar').checked?0:kwh,state:$('#state').value,annualKm:km*12};
}
function energy(v,p){
  if(isElectric(v)&&Number.isFinite(v.kwhPerKm)) return {costKm:v.kwhPerKm*p.kwh,kind:'eletricidade',detail:`${(v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`};
  const g=avg(v.gasCity,v.gasRoad),e=avg(v.ethCity,v.ethRoad),options=[];
  if(Number.isFinite(g)&&p.gas>0) options.push({kind:'gasolina',costKm:p.gas/g,detail:`${g.toFixed(1).replace('.',',')} km/l · gasolina`});
  if(Number.isFinite(e)&&p.eth>0) options.push({kind:'etanol',costKm:p.eth/e,detail:`${e.toFixed(1).replace('.',',')} km/l · etanol`});
  return options.length?options.sort((a,b)=>a.costKm-b.costKm)[0]:{kind:'combustível',costKm:null,detail:'Informe os preços de combustível'};
}
function ipvaNote(v,p){
  if(p.state==='RS'&&isElectric(v)) return {annual:0,label:'R$ 0 · isenção identificada no RS',source:'Receita Estadual RS'};
  if(p.state==='RS') return {annual:null,label:'Valor venal não integrado',source:'SEFAZ/RS'};
  return {annual:null,label:'Regra estadual ainda não integrada',source:'SEFAZ estadual'};
}
function calc(v,p){const e=energy(v,p),ip=ipvaNote(v,p),energyAnnual=Number.isFinite(e.costKm)?e.costKm*p.annualKm:null;return{e,ip,energyAnnual,annual:Number.isFinite(energyAnnual)&&Number.isFinite(ip.annual)?energyAnnual+ip.annual:null,costKm:e.costKm};}

function photoKey(v){return `${v.brand}|${v.model}`.toLowerCase();}
function mappedPhoto(v){const item=PHOTO_MAP.find(x=>x.test.test(`${v.brand} ${v.model}`));return item||null;}
async function findCommonsImage(v){
  const key=photoKey(v);
  if(imageCache.has(key)) return imageCache.get(key);
  const fixed=mappedPhoto(v);
  if(fixed){imageCache.set(key,fixed);return fixed;}
  if(imagePending.has(key)) return null;
  imagePending.add(key);
  try{
    const q=encodeURIComponent(`${v.brand} ${v.model}`);
    const url=`${COMMONS_API}?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&format=json&origin=*`;
    const res=await fetch(url);
    if(!res.ok) throw new Error('Commons indisponível');
    const data=await res.json();
    const pages=Object.values(data.query?.pages||{});
    const candidates=pages.map(p=>p.imageinfo?.[0]).filter(Boolean).filter(i=>/^image\/(jpeg|png|webp)/i.test(i.mime||''));
    if(!candidates.length) return null;
    const info=candidates[0];
    const credit=info.extmetadata?.Artist?.value ? stripHtml(info.extmetadata.Artist.value) : 'Wikimedia Commons';
    const result={url:info.thumburl||info.url,credit:`${credit} / Wikimedia Commons`};
    imageCache.set(key,result); return result;
  }catch(e){return null;}finally{imagePending.delete(key);}
}
function stripHtml(s){return String(s||'').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();}
function carImageMarkup(v, context='card'){
  const cached=imageCache.get(photoKey(v));
  if(cached?.url) return `<img src="${esc(cached.url)}" alt="${esc(carName(v))}" loading="lazy" data-photo-for="${esc(v.id)}"><small class="photo-note">Foto ilustrativa</small>`;
  return `<div class="car-placeholder" data-photo-placeholder="${esc(v.id)}">🚗</div>`;
}
async function hydrateImage(v){
  const info=await findCommonsImage(v); if(!info) return;
  document.querySelectorAll(`[data-photo-placeholder="${CSS.escape(v.id)}"]`).forEach(el=>{el.outerHTML=`<img src="${esc(info.url)}" alt="${esc(carName(v))}" loading="lazy"><small class="photo-note">Foto ilustrativa</small>`;});
  document.querySelectorAll(`[data-photo-for="${CSS.escape(v.id)}"]`).forEach(img=>{img.src=info.url;});
}

function slotCard(i){
  const id=slots[i],v=id?VEHICLES.find(x=>x.id===id):null;
  return `<article class="car-card ${v?'filled':'empty'}" data-slot="${i}">
    ${v?`<button class="remove" data-remove="${i}" aria-label="Remover carro">×</button>`:''}
    <div class="car-photo">${v?carImageMarkup(v):'<div class="select-plus">+</div>'}</div>
    ${v?`<h3>${esc(carName(v))}</h3><div class="version">${esc(v.version||'Versão PBEV 2026')}</div><div class="price-note">Preço de referência: ainda não integrado</div><button class="spec-link" data-spec="${v.id}">Ficha técnica →</button>`:
      `<h3>Selecionar carro</h3><p class="empty-copy">Escolha marca, modelo e versão para começar.</p><button class="select-button" data-select="${i}">Selecionar</button>`}
  </article>`;
}
function renderCars(){
  $('#compareGrid').style.setProperty('--slot-count', slots.length);
  $('#carColumns').innerHTML=slots.map((_,i)=>slotCard(i)).join('');
  $('#addCar').disabled=slots.length>=4;
  $('#addCar').classList.toggle('disabled',slots.length>=4);
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{slots.splice(Number(b.dataset.remove),1);if(slots.length<2)slots.push(null);renderAll();});
  document.querySelectorAll('[data-spec]').forEach(b=>b.onclick=()=>openDrawer(b.dataset.spec));
  document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>openPicker(Number(b.dataset.select)));
  slots.filter(Boolean).forEach(id=>{const v=VEHICLES.find(x=>x.id===id);if(v)hydrateImage(v);});
}
function searchVehicles(q){
  const s=q.trim().toLowerCase();
  if(!s) return VEHICLES.slice(0,20);
  const terms=s.split(/\s+/).filter(Boolean);
  return VEHICLES.filter(v=>{const hay=`${v.brand} ${v.model} ${v.version}`.toLowerCase();return terms.every(t=>hay.includes(t));}).slice(0,40);
}
function renderPicker(q=''){
  const list=searchVehicles(q),host=$('#pickerResults');
  if(!list.length){host.innerHTML='<div class="no-results">Nenhum veículo encontrado. Tente outra marca ou modelo.</div>';return;}
  host.innerHTML=list.map(v=>`<button class="picker-item" data-pick="${v.id}"><span class="picker-thumb">${imageCache.get(photoKey(v))?.url?`<img src="${esc(imageCache.get(photoKey(v)).url)}" alt="">`:'🚗'}</span><span><b>${esc(carName(v))}</b><small>${esc(v.version||'Versão não informada')} · ${esc(v.type)}</small></span><span class="picker-arrow">›</span></button>`).join('');
  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{slots[activeSlot]=b.dataset.pick;closePicker();renderAll();});
}
function openPicker(i){activeSlot=i;$('#pickerSearch').value='';$('#pickerTitle').textContent=`Selecionar carro ${i+1}`;renderPicker('');$('#pickerBackdrop').hidden=false;requestAnimationFrame(()=>$('#pickerModal').classList.add('open'));$('#pickerModal').setAttribute('aria-hidden','false');setTimeout(()=>$('#pickerSearch').focus(),60);}
function closePicker(){$('#pickerModal').classList.remove('open');$('#pickerModal').setAttribute('aria-hidden','true');setTimeout(()=>$('#pickerBackdrop').hidden=true,220);}

function table(){
  const active=slots.filter(Boolean).map(id=>VEHICLES.find(x=>x.id===id)).filter(Boolean),host=$('#comparisonTable');
  if(active.length<1){host.innerHTML='<div class="empty-table"><b>Selecione os carros acima para começar.</b><span>Comece escolhendo dois veículos.</span></div>';$('#verdictContent').innerHTML='<div class="empty-verdict">Escolha os dois carros acima para ver o resultado.</div>';return;}
  const p=profile(),results=active.map(v=>({v,r:calc(v,p)})),costs=results.map(x=>x.r.costKm).filter(Number.isFinite),minCost=costs.length?Math.min(...costs):null;
  const rows=[
    {group:'Consumo e energia',items:[['Consumo cidade',x=>isElectric(x.v)?(Number.isFinite(x.v.kwhPerKm)?`${(x.v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`:'—'):(Number.isFinite(x.v.gasCity)?`${x.v.gasCity.toFixed(1).replace('.',',')} km/l`:'—')],['Consumo estrada',x=>isElectric(x.v)?(Number.isFinite(x.v.kwhPerKm)?`${(x.v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`:'—'):(Number.isFinite(x.v.gasRoad)?`${x.v.gasRoad.toFixed(1).replace('.',',')} km/l`:'—')],['Autonomia (PBEV)',x=>Number.isFinite(x.v.autonomy)?`${x.v.autonomy.toLocaleString('pt-BR')} km`:'—'],['Custo por km',x=>Number.isFinite(x.r.costKm)?money2(x.r.costKm):'—']]},
    {group:'Impostos',items:[['IPVA anual',x=>x.r.ip.annual===0?'R$ 0':x.r.ip.label],['Base do cálculo',x=>x.r.ip.source]]},
    {group:'Manutenção',items:[['Revisões','Ainda não integrada'],['Fonte','A definir por fabricante/versão']]},
    {group:'Custo estimado',items:[['Energia/combustível por mês',x=>Number.isFinite(x.r.e.costKm)?money(x.r.e.costKm*p.km):'—'],['Energia/combustível por ano',x=>Number.isFinite(x.r.energyAnnual)?money(x.r.energyAnnual):'—'],['Custo total anual',x=>Number.isFinite(x.r.annual)?money(x.r.annual):'Parcial'],['Custo em 5 anos',x=>Number.isFinite(x.r.annual)?money(x.r.annual*5):'Parcial']]}
  ];
  const cols=results.length;
  host.classList.toggle('many-columns', cols>2);
  let html=`<div class="table-scroll"><div class="table-head-row" style="--car-count:${cols}"><div>Dados</div>${results.map(x=>`<div>${esc(carName(x.v))}</div>`).join('')}</div>`;
  for(const g of rows){
    html+=`<div class="table-row group-row" style="--car-count:${cols}"><div>${g.group}</div>${results.map(()=>'<div></div>').join('')}</div>`;
    for(const [label,fn] of g.items){
      html+=`<div class="table-row" style="--car-count:${cols}"><div>${label}</div>${results.map(x=>{const val=typeof fn==='function'?fn(x):fn,win=label==='Custo por km'&&Number.isFinite(x.r.costKm)&&x.r.costKm===minCost;return `<div class="${win?'winner-cell':''}">${esc(val)}</div>`}).join('')}</div>`;
    }
  }
  html+='</div>';host.innerHTML=html;renderVerdict(results,p);
}
function renderVerdict(results,p){
  if(results.length<2){$('#verdictContent').innerHTML='<div class="empty-verdict">Escolha os dois carros acima para ver o resultado.</div>';return;}
  const valid=results.filter(x=>Number.isFinite(x.r.costKm));
  if(valid.length<2){$('#verdictContent').innerHTML='<div class="empty-verdict">Ainda não há dados de custo suficientes para comparar estes veículos.</div>';return;}
  const sorted=[...valid].sort((a,b)=>a.r.costKm-b.r.costKm),winner=sorted[0],second=sorted[1];
  const annualSaving=Number.isFinite(winner.r.energyAnnual)&&Number.isFinite(second.r.energyAnnual)?Math.max(0,second.r.energyAnnual-winner.r.energyAnnual):null;
  const bars=sorted.map(x=>`<div class="bar ${x===winner?'best':''}"><label>${esc(carName(x.v))}</label><i style="width:${Math.max(18,Math.min(100,(x.r.costKm/winner.r.costKm)*100))}%"></i><b>${money2(x.r.costKm)}/km</b></div>`).join('');
  $('#verdictContent').innerHTML=`<div class="verdict-grid"><article class="winner-panel"><span class="trophy">🏆</span><small>MENOR CUSTO CALCULÁVEL</small><h3>${esc(carName(winner.v))}</h3><p>${esc(winner.r.e.detail)}</p>${annualSaving!==null?`<span class="saving">Economia estimada de ${money(annualSaving)}/ano</span>`:'<span class="saving">Menor custo de energia/combustível</span>'}</article><article class="break-panel"><b>⚖️ Ponto de equilíbrio</b><p>O ponto de equilíbrio completo depende também de preço, IPVA e manutenção comparáveis.</p><div class="big-number">A calcular</div><p>Não inventamos custos fixos que ainda não têm fonte integrada.</p></article><article class="chart-panel"><b>Comparativo por km</b>${bars}</article></div><p class="calc-foot">O resultado usa somente dados disponíveis no PBEV e os preços informados por você.</p>`;
}
function openDrawer(id){
  const v=VEHICLES.find(x=>x.id===id);if(!v)return;
  const photo=imageCache.get(photoKey(v));
  const rows=[['Marca',v.brand],['Modelo',v.model],['Versão',v.version||'—'],['Propulsão',v.type],['Combustível',v.fuel||'—'],['Consumo cidade',Number.isFinite(v.gasCity)?`${v.gasCity} km/l`:Number.isFinite(v.kwhPerKm)?`${(v.kwhPerKm*100).toFixed(1)} kWh/100 km`:'—'],['Consumo estrada',Number.isFinite(v.gasRoad)?`${v.gasRoad} km/l`:'—'],['Autonomia elétrica',Number.isFinite(v.autonomy)?`${v.autonomy} km`:'—']];
  $('#drawerContent').innerHTML=`<p class="eyebrow">PBEV 2026</p><h2>${esc(carName(v))}</h2><div class="drawer-sub">${esc(v.version||'Versão conforme cadastro do Inmetro')}</div><div class="drawer-photo">${photo?.url?`<img src="${esc(photo.url)}" alt="${esc(carName(v))}"><small>Foto ilustrativa</small>`:'<div class="car-placeholder">🚗</div>'}</div><div class="drawer-section"><h3>Dados disponíveis</h3>${rows.map(r=>`<div class="drawer-row"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div><p class="drawer-source">Fonte dos dados: <a href="${PBEV_SOURCE_URL}" target="_blank" rel="noopener">INMETRO / PBEV 2026</a>.<br>${photo?.credit?`Crédito da foto: ${esc(photo.credit)}.`:'Foto ilustrativa; fonte da imagem será identificada quando disponível.'}</p>`;
  if(!photo) hydrateImage(v).then(()=>{if($('#specDrawer').classList.contains('open'))openDrawer(v.id);});
  $('#drawerBackdrop').hidden=false;requestAnimationFrame(()=>$('#specDrawer').classList.add('open'));$('#specDrawer').setAttribute('aria-hidden','false');
}
function closeDrawer(){$('#specDrawer').classList.remove('open');$('#specDrawer').setAttribute('aria-hidden','true');setTimeout(()=>$('#drawerBackdrop').hidden=true,220);}
function addCar(){
  if(slots.length>=4)return;
  slots.push(null); const newIndex=slots.length-1; renderAll(); setTimeout(()=>openPicker(newIndex),80);
}
function renderAll(){renderCars();table();}

$('#addCar').addEventListener('click',addCar);
$('#recalculate').addEventListener('click',table);
['#state','#solar'].forEach(s=>$(s).addEventListener('change',()=>{if(s==='#solar')$('#solarHint').textContent=$('#solar').checked?'custo considerado: R$ 0,00/kWh':'custo conforme preço informado';table();}));
$('#kmMonth').addEventListener('input',table);
bindDecimalField('#gasPrice');bindDecimalField('#ethPrice');bindDecimalField('#kwhPrice');
$('#showAllSpecs').onclick=()=>{const first=slots.find(Boolean);if(first)openDrawer(first);};
$('#drawerClose').onclick=closeDrawer;$('#drawerBackdrop').onclick=closeDrawer;$('#pickerClose').onclick=closePicker;$('#pickerBackdrop').onclick=closePicker;
$('#pickerSearch').addEventListener('input',e=>renderPicker(e.target.value));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePicker();closeDrawer();}});

async function load(){
  try{
    const r=await fetch(PBEV_CSV_URL,{cache:'no-store'});if(!r.ok)throw new Error('PBEV indisponível');
    VEHICLES=mapPBEV(await r.text());if(VEHICLES.length<100)throw new Error('base incompleta');
    $('#dataStatus').textContent=`${VEHICLES.length} registros carregados · PBEV 2026`;$('#dataStatus').classList.add('ok');renderAll();
  }catch(e){$('#dataStatus').textContent='Base PBEV indisponível no momento.';renderAll();}
}
load();
