const PBEV_CSV_URL = 'https://raw.githubusercontent.com/guiajf/pbev/main/data/tabela_pbev_2026.csv';
const PBEV_SOURCE_URL = 'https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const KNOWN_IMAGES = [
  {test: v => /dolphin\s*mini|seagull/i.test(carName(v)), file:'BYD_DOLPHIN_MINI_(BRAZIL)_BYD_SEAGULL.jpg', credit:'Mateusmatsuda'},
  {test: v => /civic/i.test(carName(v)) && /e:?hev|hybrid/i.test(`${v.model} ${v.version}`), file:'Honda_CIVIC_e-HEV_(6AA-FL4)_front.jpg', credit:'Tokumeigakarinoaoshima'},
  {test: v => /dolphin/i.test(carName(v)), file:'2024_BYD_Dolphin.jpg', credit:'RL GNZLZ'},
  {test: v => /pulse/i.test(carName(v)), file:'2022_Fiat_Pulse_1.3_GSE_Drive.jpg', credit:'Morio'},
  {test: v => /corolla/i.test(carName(v)), file:'Toyota_Corolla_sedan_E210_hydrid.jpg', credit:''}
];
function knownImage(v){const hit=KNOWN_IMAGES.find(x=>x.test(v));return hit?{imageUrl:`https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${encodeURIComponent(hit.file)}&width=700`,imageSource:`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(hit.file)}`,imageCredit:hit.credit}:null;}
let VEHICLES = [];
let slots = [null, null];
let activeSlot = 0;
const imageCache = new Map();
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>\"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&#92;','"':'&quot;'}[m]));
const money = v => Number.isFinite(v) ? v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) : '—';
const money2 = v => Number.isFinite(v) ? v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
function num(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null;}
function parseCSV(text){const out=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(q&&n==='"'){cell+='"';i++;}else q=!q;}else if(c===';'&&!q){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(x=>x.trim()))out.push(row);row=[];}else cell+=c;}if(cell||row.length){row.push(cell);if(row.some(x=>x.trim()))out.push(row);}return out;}
function uid(brand,model,version,i){return `${brand}-${model}-${version}-${i}`.toLowerCase().replace(/[^a-z0-9]+/gi,'-');}
function mapPBEV(text){const rows=parseCSV(text);const h=rows.shift().map(x=>x.replace(/^\uFEFF/,'').trim());const ix=Object.fromEntries(h.map((x,i)=>[x,i]));return rows.map((r,i)=>{const brand=r[ix.marca]||'',model=r[ix.modelo]||'',version=r[ix.versao]||'',prop=r[ix.propulsao]||'',fuel=r[ix.combustivel]||'',mj=num(r[ix.consumo_mj_km]);return{id:uid(brand,model,version,i),brand,model,version,type:prop||'Não informado',fuel,motor:r[ix.motor]||'',transmission:r[ix.transmissao]||'',category:r[ix.categoria]||'',gasCity:num(r[ix.gas_diesel_cid_kml]),gasRoad:num(r[ix.gas_diesel_est_kml]),ethCity:num(r[ix.etanol_cid_kml]),ethRoad:num(r[ix.etanol_est_kml]),kwhPerKm:mj?mj/3.6:null,autonomy:num(r[ix.autonomia_km]),source:'INMETRO PBEV 2026',imageUrl:null,imageSource:null,imageCredit:null};}).filter(v=>v.brand&&v.model);}
function carName(v){return `${v.brand} ${v.model}`.trim();}
function avg(a,b){return Number.isFinite(a)&&Number.isFinite(b)?a*.55+b*.45:(a??b);}
function isElectric(v){return /el[eé]tr/i.test(v.type)||/el[eé]tr/i.test(v.fuel)||Number.isFinite(v.kwhPerKm)&&!Number.isFinite(v.gasCity);}
function profile(){const km=num($('#kmMonth').value)||0,gas=parseMoney($('#gasPrice').value),eth=parseMoney($('#ethPrice').value),kwh=parseMoney($('#kwhPrice').value);return{km,gas,eth,kwh:$('#solar').checked?0:kwh,state:$('#state').value,annualKm:km*12};}
function energy(v,p){if(isElectric(v)&&Number.isFinite(v.kwhPerKm))return{costKm:v.kwhPerKm*p.kwh,kind:'eletricidade',detail:`${(v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`};const g=avg(v.gasCity,v.gasRoad),e=avg(v.ethCity,v.ethRoad),options=[];if(Number.isFinite(g)&&p.gas>0)options.push({kind:'gasolina',costKm:p.gas/g,detail:`${g.toFixed(1).replace('.',',')} km/l · gasolina`});if(Number.isFinite(e)&&p.eth>0)options.push({kind:'etanol',costKm:p.eth/e,detail:`${e.toFixed(1).replace('.',',')} km/l · etanol`});return options.length?options.sort((a,b)=>a.costKm-b.costKm)[0]:{kind:'combustível',costKm:null,detail:'Informe os preços de combustível'};}
function ipvaNote(v,p){if(!p.state)return{annual:null,label:'Selecione o estado',source:'SEFAZ estadual'};if(p.state==='RS'&&isElectric(v))return{annual:0,label:'R$ 0 · isenção identificada no RS',source:'Receita Estadual RS'};if(p.state==='RS')return{annual:null,label:'Valor venal não integrado',source:'SEFAZ/RS'};return{annual:null,label:'Regra estadual ainda não integrada',source:'SEFAZ estadual'};}
function calc(v,p){const e=energy(v,p),ip=ipvaNote(v,p),energyAnnual=Number.isFinite(e.costKm)?e.costKm*p.annualKm:null;return{e,ip,energyAnnual,annual:Number.isFinite(energyAnnual)&&Number.isFinite(ip.annual)?energyAnnual+ip.annual:null,costKm:e.costKm};}
function photoMarkup(v, cls='car-photo'){
  const fallback=`<div class="car-placeholder" aria-hidden="true">🚗</div>`;
  if(!v?.imageUrl)return `<div class="${cls}">${fallback}</div>`;
  return `<div class="${cls}"><img src="${esc(v.imageUrl)}" alt="${esc(carName(v))}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'car-placeholder',textContent:'🚗'}));"><span class="photo-badge">Foto ilustrativa</span></div>`;
}
function slotCard(i){const id=slots[i],v=id?VEHICLES.find(x=>x.id===id):null;const removable=i>=2;return `<article class="car-card ${v?'filled':'empty'}" data-slot="${i}">${removable?`<button type="button" class="remove" data-remove="${i}" aria-label="Remover carro" title="Fechar este carro">×</button>`:''}${v?`${photoMarkup(v)}<h3>${esc(carName(v))}</h3><div class="version">${esc(v.version||'Versão PBEV 2026')}</div><div class="price-note">Preço de referência: ainda não integrado</div><button class="spec-link" data-spec="${v.id}">Ficha técnica →</button>`:`<div class="car-photo"><button class="select-plus" data-select="${i}" aria-label="Selecionar carro">+</button></div><h3>Selecionar carro</h3><p class="empty-copy">Escolha marca, modelo e versão.</p><button class="select-button" data-select="${i}">Selecionar</button>`}</article>`;}
function renderCars(){const host=$('#carColumns');host.innerHTML=slots.map((_,i)=>slotCard(i)).join('');$('#compareGrid').style.setProperty('--car-count',slots.length);$('#compareGrid').style.setProperty('--car-min',slots.length>2?'210px':'0px');const add=$('#addCar');add.disabled=slots.length>=4;add.style.display=slots.length>=4?'none':'flex';}
function searchVehicles(q){const s=q.trim().toLowerCase();if(!s)return VEHICLES.slice(0,18);return VEHICLES.filter(v=>`${v.brand} ${v.model} ${v.version}`.toLowerCase().includes(s)).slice(0,40);}
function pickerThumb(v){return v.imageUrl?`<img src="${esc(v.imageUrl)}" alt="" loading="lazy">`:'<span class="picker-car">🚗</span>';}
function renderPicker(q=''){const list=searchVehicles(q),host=$('#pickerResults');if(!list.length){host.innerHTML='<div class="no-results">Nenhum veículo encontrado. Tente outra marca ou modelo.</div>';return;}host.innerHTML=list.map(v=>`<button class="picker-item" data-pick="${esc(v.id)}"><span class="picker-thumb">${pickerThumb(v)}</span><span><b>${esc(carName(v))}</b><small>${esc(v.version||'Versão não informada')} · ${esc(v.type)}</small></span><span class="picker-arrow">›</span></button>`).join('');hydratePickerImages(list.slice(0,12));}
async function hydratePickerImages(list){await Promise.all(list.map(v=>resolveVehicleImage(v)));const host=$('#pickerResults');if(!host)return;list.forEach(v=>{const item=host.querySelector(`[data-pick="${CSS.escape(v.id)}"] .picker-thumb`);if(item)item.innerHTML=pickerThumb(v);});}
function openPicker(i){activeSlot=i;$('#pickerSearch').value='';$('#pickerTitle').textContent=`Selecionar carro ${i+1}`;renderPicker('');$('#pickerBackdrop').hidden=false;requestAnimationFrame(()=>$('#pickerModal').classList.add('open'));$('#pickerModal').setAttribute('aria-hidden','false');setTimeout(()=>$('#pickerSearch').focus(),50);}
function closePicker(){$('#pickerModal').classList.remove('open');$('#pickerModal').setAttribute('aria-hidden','true');setTimeout(()=>$('#pickerBackdrop').hidden=true,180);}
function table(){
  const slotVehicles=slots.map(id=>id?VEHICLES.find(x=>x.id===id):null);
  const active=slotVehicles.filter(Boolean);
  const host=$('#comparisonTable');
  if(!active.length){
    host.innerHTML='<div class="empty-table"><b>Selecione os carros acima para começar.</b><span>Comece escolhendo os dois veículos.</span></div>';
    $('#verdictContent').innerHTML='<div class="empty-verdict">Escolha os dois carros acima para ver o resultado.</div>';
    return;
  }
  const p=profile();
  const results=slotVehicles.map(v=>v?({v,r:calc(v,p)}):null);
  const activeResults=results.filter(Boolean);
  const costs=activeResults.map(x=>x.r.costKm).filter(Number.isFinite);
  const minCost=costs.length?Math.min(...costs):null;
  const cols=slotVehicles.length;
  const grid=`style="--car-count:${cols}"`;
  const display=fn=>results.map(x=>{
    if(!x)return '<div class="empty-value">—</div>';
    const val=typeof fn==='function'?fn(x):fn;
    return `<div>${esc(val)}</div>`;
  }).join('');
  const displayCost=fn=>results.map(x=>{
    if(!x)return '<div class="empty-value">—</div>';
    const val=typeof fn==='function'?fn(x):fn;
    const win=Number.isFinite(x.r.costKm)&&x.r.costKm===minCost;
    return `<div class="${win?'winner-cell':''}">${esc(val)}</div>`;
  }).join('');
  const rows=[
    {group:'Dados técnicos',items:[
      ['Propulsão',x=>x.v.type||'—'],
      ['Combustível',x=>x.v.fuel||'—'],
      ['Motor',x=>x.v.motor||'—'],
      ['Câmbio',x=>x.v.transmission||'—']
    ]},
    {group:'Consumo e energia',items:[
      ['Consumo cidade',x=>isElectric(x.v)?(Number.isFinite(x.v.kwhPerKm)?`${(x.v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`:'—'):(Number.isFinite(x.v.gasCity)?`${x.v.gasCity.toFixed(1).replace('.',',')} km/l`:'—')],
      ['Consumo estrada',x=>isElectric(x.v)?(Number.isFinite(x.v.kwhPerKm)?`${(x.v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`:'—'):(Number.isFinite(x.v.gasRoad)?`${x.v.gasRoad.toFixed(1).replace('.',',')} km/l`:'—')],
      ['Autonomia (PBEV)',x=>Number.isFinite(x.v.autonomy)?`${x.v.autonomy.toLocaleString('pt-BR')} km`:'—'],
      ['Custo por km',x=>Number.isFinite(x.r.costKm)?money2(x.r.costKm):'—']
    ]},
    {group:'Impostos',items:[
      ['IPVA anual',x=>x.r.ip.annual===0?'R$ 0':x.r.ip.label],
      ['Base do cálculo',x=>x.r.ip.source]
    ]},
    {group:'Manutenção',items:[
      ['Revisões','Ainda não integrada'],
      ['Fonte','A definir por fabricante/versão']
    ]},
    {group:'Custo estimado',items:[
      ['Energia/combustível por mês',x=>Number.isFinite(x.r.e.costKm)?money(x.r.e.costKm*p.km):'—'],
      ['Energia/combustível por ano',x=>Number.isFinite(x.r.energyAnnual)?money(x.r.energyAnnual):'—'],
      ['Custo total anual',x=>Number.isFinite(x.r.annual)?money(x.r.annual):'Parcial'],
      ['Custo em 5 anos',x=>Number.isFinite(x.r.annual)?money(x.r.annual*5):'Parcial']
    ]}
  ];
  let html=`<div class="table-scroll"><div class="table-head-row" ${grid}><div>Dados</div>${results.map(x=>`<div>${x?esc(carName(x.v)):'Selecionar carro'}</div>`).join('')}</div>`;
  for(const g of rows){
    html+=`<div class="table-row group-row" ${grid}><div>${g.group}</div>${results.map(()=>'<div></div>').join('')}</div>`;
    for(const [label,fn] of g.items){
      html+=`<div class="table-row" ${grid}><div>${label}</div>${label==='Custo por km'?displayCost(fn):display(fn)}</div>`;
    }
  }
  html+='</div>';
  host.innerHTML=html;
  renderVerdict(activeResults,p);
}
function renderVerdict(results,p){if(results.length<2){$('#verdictContent').innerHTML='<div class="empty-verdict">Escolha os dois carros acima para ver o resultado.</div>';return;}const valid=results.filter(x=>Number.isFinite(x.r.costKm));if(valid.length<2){$('#verdictContent').innerHTML='<div class="empty-verdict">Ainda não há dados de custo suficientes para comparar estes veículos.</div>';return;}const sorted=[...valid].sort((a,b)=>a.r.costKm-b.r.costKm),winner=sorted[0],second=sorted[1],annualSaving=Number.isFinite(winner.r.energyAnnual)&&Number.isFinite(second.r.energyAnnual)?Math.max(0,second.r.energyAnnual-winner.r.energyAnnual):null;const bars=sorted.map(x=>`<div class="bar ${x===winner?'best':''}"><label>${esc(carName(x.v))}</label><i style="width:${Math.max(18,Math.min(100,(x.r.costKm/winner.r.costKm)*100))}%"></i><b>${money2(x.r.costKm)}/km</b></div>`).join('');$('#verdictContent').innerHTML=`<div class="verdict-grid"><article class="winner-panel"><span class="trophy">🏆</span><small>MENOR CUSTO CALCULÁVEL</small><h3>${esc(carName(winner.v))}</h3><p>${esc(winner.r.e.detail)}</p>${annualSaving!==null?`<span class="saving">Economia estimada de ${money(annualSaving)}/ano</span>`:'<span class="saving">Menor custo de energia/combustível</span>'}</article><article class="break-panel"><b>⚖️ Ponto de equilíbrio</b><p>O ponto de equilíbrio completo depende também de preço, IPVA e manutenção comparáveis.</p><div class="big-number">A calcular</div><p>Não inventamos custos fixos que ainda não têm fonte integrada.</p></article><article class="chart-panel"><b>Comparativo por km</b>${bars}</article></div><p class="calc-foot">O resultado usa somente dados disponíveis no PBEV e os preços informados por você.</p>`;}
function openDrawer(id){const v=VEHICLES.find(x=>x.id===id);if(!v)return;const rows=[['Marca',v.brand],['Modelo',v.model],['Versão',v.version||'—'],['Propulsão',v.type],['Combustível',v.fuel||'—'],['Consumo cidade',Number.isFinite(v.gasCity)?`${v.gasCity} km/l`:Number.isFinite(v.kwhPerKm)?`${(v.kwhPerKm*100).toFixed(1)} kWh/100 km`:'—'],['Consumo estrada',Number.isFinite(v.gasRoad)?`${v.gasRoad} km/l`:Number.isFinite(v.kwhPerKm)?`${(v.kwhPerKm*100).toFixed(1)} kWh/100 km`:'—'],['Autonomia elétrica',Number.isFinite(v.autonomy)?`${v.autonomy} km`:'—']];$('#drawerContent').innerHTML=`<p class="eyebrow">PBEV 2026</p><h2>${esc(carName(v))}</h2><div class="drawer-sub">${esc(v.version||'Versão conforme cadastro do Inmetro')}</div>${photoMarkup(v,'drawer-photo')}<p class="photo-credit">${v.imageSource?`Foto: <a href="${esc(v.imageSource)}" target="_blank" rel="noopener">Wikimedia Commons</a>${v.imageCredit?` · ${esc(v.imageCredit)}`:''}`:'Foto ainda não localizada.'}</p><div class="drawer-section"><h3>Dados disponíveis</h3>${rows.map(r=>`<div class="drawer-row"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div><p class="drawer-source">Fonte dos dados técnicos: <a href="${PBEV_SOURCE_URL}" target="_blank" rel="noopener">INMETRO / PBEV 2026</a>. Os valores de consumo são padronizados e podem variar em uso real.</p>`;$('#drawerBackdrop').hidden=false;requestAnimationFrame(()=>$('#specDrawer').classList.add('open'));$('#specDrawer').setAttribute('aria-hidden','false');}
function closeDrawer(){$('#specDrawer').classList.remove('open');$('#specDrawer').setAttribute('aria-hidden','true');setTimeout(()=>$('#drawerBackdrop').hidden=true,180);}
function parseMoney(value){const s=String(value??'').trim();if(!s)return 0;return Number(s.replace(/\./g,'').replace(',','.'))||0;}
function formatCentsInput(el){const digits=el.value.replace(/\D/g,'').slice(0,7);if(!digits){el.value='';return;}const cents=Math.max(1,parseInt(digits,10));el.value=(cents/100).toFixed(2).replace('.',',');}
function initMoneyInputs(){document.querySelectorAll('.money-input').forEach(el=>{el.addEventListener('input',()=>{formatCentsInput(el);table();});el.addEventListener('focus',()=>{el.select();});el.addEventListener('blur',()=>{if(el.value)formatCentsInput(el);});});}
function cacheKey(v){return `qcr-photo-v8:${carName(v).toLowerCase()}`;}
async function resolveVehicleImage(v){if(!v)return null;if(v.imageUrl)return v.imageUrl;if(imageCache.has(v.id)){Object.assign(v,imageCache.get(v.id));return v.imageUrl;}try{const cached=localStorage.getItem(cacheKey(v));if(cached){Object.assign(v,JSON.parse(cached));imageCache.set(v.id,JSON.parse(cached));return v.imageUrl;}}catch(_){ }
  const known=knownImage(v); if(known){Object.assign(v,known);imageCache.set(v.id,known);try{localStorage.setItem(cacheKey(v),JSON.stringify(known));}catch(_){ }return v.imageUrl;}
  const q=encodeURIComponent(`${v.brand} ${v.model} automobile`);
  const url=`${COMMONS_API}?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=700&format=json&origin=*`;
  try{const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error('commons');const data=await res.json();const pages=Object.values(data.query?.pages||{});const modelWords=`${v.brand} ${v.model}`.toLowerCase().split(/\s+/).filter(w=>w.length>2);const ranked=pages.map(p=>{const title=(p.title||'').toLowerCase();const score=modelWords.reduce((n,w)=>n+(title.includes(w)?1:0),0)+(title.includes('car')?0.2:0);return{p,score};}).sort((a,b)=>b.score-a.score);const best=ranked.find(x=>x.score>=Math.min(2,modelWords.length))?.p||ranked[0]?.p;const info=best?.imageinfo?.[0];if(!info?.thumburl&&!info?.url)throw new Error('no image');const meta=info.extmetadata||{};const credit=(meta.Artist?.value||meta.Credit?.value||'').replace(/<[^>]+>/g,'').trim().slice(0,100);const found={imageUrl:info.thumburl||info.url,imageSource:`https://commons.wikimedia.org/wiki/${encodeURIComponent((best.title||'').replace(/ /g,'_'))}`,imageCredit:credit};Object.assign(v,found);imageCache.set(v.id,found);try{localStorage.setItem(cacheKey(v),JSON.stringify(found));}catch(_){ }return v.imageUrl;}catch(_){return null;}}
async function hydrateImages(ids){const selected=ids.map(id=>VEHICLES.find(v=>v.id===id)).filter(Boolean);await Promise.all(selected.map(v=>resolveVehicleImage(v)));renderCars();selected.forEach(v=>{document.querySelectorAll(`[data-spec="${CSS.escape(v.id)}"]`).forEach(()=>{});});}
function renderAll(){renderCars();table();}

// Eventos delegados: funcionam mesmo depois de cada re-render e no toque do celular.
function addCarSlot(){if(slots.length>=4)return;const newIndex=slots.length;slots.push(null);renderAll();requestAnimationFrame(()=>{const card=document.querySelector(`[data-slot="${newIndex}"]`);card?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});openPicker(newIndex);});}
window.__qcrAddCar=addCarSlot;
const addCarButton=$('#addCar'); if(addCarButton){addCarButton.addEventListener('click',addCarSlot);}
document.addEventListener('click',e=>{const select=e.target.closest('[data-select]');if(select){openPicker(Number(select.dataset.select));return;}const pick=e.target.closest('[data-pick]');if(pick){slots[activeSlot]=pick.dataset.pick;closePicker();renderAll();requestAnimationFrame(()=>document.querySelector(`[data-slot="${activeSlot}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));const v=VEHICLES.find(x=>x.id===pick.dataset.pick);if(v){resolveVehicleImage(v).then(()=>renderCars());}return;}const remove=e.target.closest('[data-remove]');if(remove){const index=Number(remove.dataset.remove);slots.splice(index,1);if(slots.length<2)slots.push(null);renderAll();return;}const spec=e.target.closest('[data-spec]');if(spec){openDrawer(spec.dataset.spec);return;}if(e.target.closest('[data-add-car]')){addCarSlot();return;}});
$('#recalculate').addEventListener('click',table);
function openAllSpecs(){
  const selected=slots.map(id=>id?VEHICLES.find(x=>x.id===id):null).filter(Boolean);
  if(!selected.length)return;
  const blocks=selected.map(v=>{
    const rows=[
      ['Marca',v.brand],['Modelo',v.model],['Versão',v.version||'—'],['Categoria',v.category||'—'],
      ['Propulsão',v.type||'—'],['Combustível',v.fuel||'—'],['Motor',v.motor||'—'],['Câmbio',v.transmission||'—'],
      ['Consumo cidade',Number.isFinite(v.gasCity)?`${v.gasCity.toFixed(1).replace('.',',')} km/l`:Number.isFinite(v.kwhPerKm)?`${(v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`:'—'],
      ['Consumo estrada',Number.isFinite(v.gasRoad)?`${v.gasRoad.toFixed(1).replace('.',',')} km/l`:Number.isFinite(v.kwhPerKm)?`${(v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`:'—'],
      ['Autonomia (PBEV)',Number.isFinite(v.autonomy)?`${v.autonomy.toLocaleString('pt-BR')} km`:'—']
    ];
    return `<article class="all-spec-card"><div class="all-spec-photo">${photoMarkup(v,'drawer-photo')}</div><div class="all-spec-title"><div><p class="eyebrow">PBEV 2026</p><h3>${esc(carName(v))}</h3><span>${esc(v.version||'Versão conforme cadastro do Inmetro')}</span></div><button class="mini-spec" type="button" data-spec="${esc(v.id)}">Abrir ficha</button></div><div class="all-spec-grid">${rows.map(r=>`<div><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div></article>`;
  }).join('');
  $('#drawerContent').innerHTML=`<p class="eyebrow">ESPECIFICAÇÕES DOS CARROS</p><h2>Ficha técnica completa</h2><p class="drawer-sub">Todos os veículos selecionados nesta comparação.</p><div class="all-specs-list">${blocks}</div><p class="drawer-source">Fonte dos dados técnicos: <a href="${PBEV_SOURCE_URL}" target="_blank" rel="noopener">INMETRO / PBEV 2026</a>. Os valores de consumo são padronizados e podem variar em uso real.</p>`;
  $('#drawerBackdrop').hidden=false;requestAnimationFrame(()=>$('#specDrawer').classList.add('open'));$('#specDrawer').setAttribute('aria-hidden','false');
  selected.forEach(v=>resolveVehicleImage(v).then(()=>{const card=$(`#drawerContent [data-spec="${CSS.escape(v.id)}"]`)?.closest('.all-spec-card');if(card)card.querySelector('.all-spec-photo').innerHTML=photoMarkup(v,'drawer-photo');}));
}
$('#showAllSpecs').addEventListener('click',openAllSpecs);
$('#pickerClose').addEventListener('click',closePicker);$('#pickerBackdrop').addEventListener('click',closePicker);$('#pickerSearch').addEventListener('input',e=>renderPicker(e.target.value));
$('#drawerClose').addEventListener('click',closeDrawer);$('#drawerBackdrop').addEventListener('click',closeDrawer);document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePicker();closeDrawer();}});
['#kmMonth','#state','#solar'].forEach(sel=>$(sel).addEventListener('input',()=>{if(sel==='#solar')$('#solarHint').textContent=$('#solar').checked?'custo considerado: R$ 0,00/kWh':'considera R$ 0,00/kWh';table();}));

async function load(){try{const r=await fetch(PBEV_CSV_URL,{cache:'no-store'});if(!r.ok)throw new Error('PBEV indisponível');VEHICLES=mapPBEV(await r.text());if(VEHICLES.length<100)throw new Error('base incompleta');$('#dataStatus').textContent=`${VEHICLES.length} registros carregados · PBEV 2026`;$('#dataStatus').classList.add('ok');renderAll();}catch(e){$('#dataStatus').textContent='Base PBEV indisponível no momento.';renderAll();}}
initMoneyInputs();load();
