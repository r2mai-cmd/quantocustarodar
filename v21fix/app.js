const PBEV_CSV_URL = 'https://raw.githubusercontent.com/guiajf/pbev/main/data/tabela_pbev_2026.csv';
const PBEV_SOURCE_URL = 'https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const FIPE_API_BASE = 'https://fipe.parallelum.com.br/api/v2/cars';
const fipeCache = new Map();
const KNOWN_IMAGES = [
  {test: v => /dolphin\s*mini|seagull/i.test(carName(v)), file:'BYD_DOLPHIN_MINI_(BRAZIL)_BYD_SEAGULL.jpg', credit:'Mateusmatsuda'},
  {test: v => /civic/i.test(carName(v)) && /e:?hev|hybrid/i.test(`${v.model} ${v.version}`), file:'Honda_CIVIC_e-HEV_(6AA-FL4)_front.jpg', credit:'Tokumeigakarinoaoshima'},
  {test: v => /dolphin/i.test(carName(v)), file:'2024_BYD_Dolphin.jpg', credit:'RL GNZLZ'},
  {test: v => /pulse/i.test(carName(v)), file:'2022_Fiat_Pulse_1.3_GSE_Drive.jpg', credit:'Just a Man'},
  {test: v => /500e/i.test(carName(v)), file:'FIAT_500e_ICON_(ZAA-FA1)_front.jpg', credit:'Tokumeigakarinoaoshima'},
  {test: v => /corolla/i.test(carName(v)), file:'Toyota_Corolla_sedan_E210_hydrid.jpg', credit:''}
];
function knownImage(v){const hit=KNOWN_IMAGES.find(x=>x.test(v));return hit?{imageUrl:`https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${encodeURIComponent(hit.file)}&width=700`,imageSource:`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(hit.file)}`,imageCredit:hit.credit}:null;}

// Base histórica oficial do Inmetro — ciclo 2020.
// Mantida separada da base 2026 para permitir localizar veículos descontinuados
// sem misturar ciclos diferentes do PBEV.
const HISTORICAL_VEHICLES = [
  ['VW','Fox','1.6-8V','Connect','M-5','F',7.8,9.7,11.6,13.9,1.74],
  ['VW','Fox','1.6-8V','Xtreme','M-5','F',7.7,9.2,11.3,13.3,1.80],
  ['HONDA','Fit','1.5-16V','DX','M-5','F',8.3,9.5,11.6,13.6,1.72],
  ['HONDA','Fit','1.5-16V','LX','M-5','F',8.3,9.5,11.6,13.6,1.72],
  ['HONDA','Fit','1.5-16V','DX CVT','CVT','F',8.3,9.9,12.3,14.1,1.66],
  ['HONDA','Fit','1.5-16V','LX CVT','CVT','F',8.3,9.9,12.3,14.1,1.66],
  ['HONDA','Fit','1.5-16V','EX CVT','CVT','F',8.3,9.9,12.3,14.1,1.66],
  ['HONDA','Fit','1.5-16V','EXL CVT','CVT','F',8.3,9.9,12.3,14.1,1.66],
  ['HONDA','Fit','1.5-16V','Personal CVT','CVT','F',8.3,9.9,12.3,14.1,1.66],
  ['VW','Gol','1.0-12V','roda aro 14','M-5','F',9.1,10.1,13.3,14.4,1.56],
  ['VW','Gol','1.0-12V','roda aro 15','M-5','F',9.0,9.9,12.9,14.2,1.59],
  ['VW','Gol','1.6-8V','','M-5','F',7.8,9.5,11.1,13.6,1.78],
  ['VW','Gol','1.6-8V','Patrulheiro','M-5','F',7.7,9.0,11.2,13.0,1.82],
  ['VW','Gol','1.6-16V','MSI','A-6','F',7.7,9.6,11.1,13.6,1.79],
  ['FIAT','Mobi','1.0-6V','Drive','M-5','F',9.7,11.5,13.8,16.4,1.43],
  ['FIAT','Mobi','1.0-8V','Drive GSR','M-5','F',9.5,11.3,13.7,15.9,1.45],
  ['FIAT','Mobi','1.0-8V','Easy','M-5','F',9.2,10.2,13.5,15.2,1.52],
  ['FIAT','Mobi','1.0-8V','Like','M-5','F',8.8,9.9,12.7,14.3,1.61],
  ['FIAT','Novo Uno','1.0-6V','Drive','M-5','F',9.1,10.6,13.2,15.2,1.52],
  ['FIAT','Novo Uno','1.0-8V','Attractive','M-5','F',8.0,9.4,11.6,13.4,1.75],
  ['FIAT','Novo Uno','1.0-6V','Way','M-5','F',9.1,10.6,13.2,15.2,1.52],
  ['FIAT','Argo','1.0-6V','','M-5','F',9.3,10.0,13.2,14.2,1.56],
  ['FIAT','Argo','1.0-6V','Drive','M-5','F',9.3,10.0,13.2,14.2,1.56],
  ['FIAT','Argo','1.0-6V','Drive (Stop & Start)','M-5','F',9.8,10.3,14.2,14.5,1.48],
  ['FIAT','Argo','1.3-8V','Drive','M-5','F',8.9,10.4,12.5,14.7,1.58],
  ['FIAT','Argo','1.3-8V','Drive (Stop & Start)','M-5','F',9.4,10.5,13.4,15.0,1.51],
  ['FIAT','Argo','1.3-8V','Drive','MTA-5','F',8.5,10.0,12.2,14.1,1.64],
  ['FIAT','Argo','1.8-16V','Precision','A-6','F',6.9,9.2,9.7,12.8,1.99],
  ['FIAT','Argo','1.8-16V','HGT','A-6','F',6.9,9.2,9.7,12.8,1.99],
  ['RENAULT','Sandero','1.0-12V','Authentique','M-5','F',9.5,9.6,14.2,14.1,1.52],
  ['RENAULT','Sandero','1.6-16V','Expression','M-5','F',8.6,9.2,12.8,13.4,1.66],
  ['RENAULT','Sandero','1.6-16V','Expression','MTA-5','F',8.1,8.8,11.8,12.8,1.77],
  ['RENAULT','Sandero','1.6-16V','Dynamique','MTA-5','F',8.1,8.8,11.8,12.8,1.77],
  ['RENAULT','Sandero','1.6-16V','GT Line','M-5','F',8.4,8.9,12.5,13.0,1.71],
  ['RENAULT','Logan','1.0-12V','Authentique','M-5','F',9.4,10.2,14.0,14.9,1.50],
  ['RENAULT','Logan','1.0-12V','Expression','M-5','F',9.4,10.2,14.0,14.9,1.50],
  ['RENAULT','Logan','1.6-16V','Dynamique','M-5','F',8.7,9.7,13.0,14.1,1.61],
  ['RENAULT','Logan','1.6-16V','Expression','M-5','F',8.7,9.7,13.0,14.1,1.61],
  ['RENAULT','Logan','1.0-12V','Life','M-5','F',9.0,10.0,13.2,14.1,1.57],
  ['RENAULT','Logan','1.0-12V','Zen','M-5','F',9.0,10.0,13.2,14.1,1.57],
  ['RENAULT','Logan','1.6-16V','Zen','M-5','F',8.3,9.0,11.9,13.1,1.74],
  ['CHEVROLET','Onix Plus','1.0-12V Turbo','4LT','A-6','F',8.6,10.9,12.0,15.0,1.61],
  ['CHEVROLET','Onix Plus','1.0-12V Turbo','1LS','A-6','F',8.6,10.9,12.0,15.0,1.61],
  ['CHEVROLET','Onix Plus','1.0-12V','2LT','M-6','F',10.1,12.5,14.3,17.7,1.34],
  ['HONDA','Civic','2.0-16V','LX / EX / EXL / Sport CVT','CVT','F',7.2,8.9,10.5,13.0,1.91],
  ['HONDA','Civic','1.5-16V Turbo','Touring CVT','CVT','G',null,null,11.8,14.4,1.68],
  ['TOYOTA','Corolla','1.8-16V','Altis Premium H','CVT','F',10.9,9.9,16.3,14.5,1.38],
  ['TOYOTA','Corolla','1.8-16V','Altis HV','CVT','F',10.9,9.9,16.3,14.5,1.38],
  ['TOYOTA','Corolla','2.0-16V','XEI','CVT','F',8.0,9.7,11.6,13.9,1.73],
  ['TOYOTA','Corolla','2.0-16V','GLI','CVT','F',8.0,9.7,11.6,13.9,1.73],
  ['TOYOTA','Yaris','1.5-16V','Sedã XL Live','M-6','F',8.3,10.1,12.0,14.6,1.65],
  ['TOYOTA','Yaris','1.5-16V','Sedã XL Live CVT','CVT','F',9.0,10.6,13.0,14.5,1.56],
  ['TOYOTA','Yaris','1.5-16V','Sedã XS CVT','CVT','F',9.0,10.6,13.0,14.5,1.56],
  ['TOYOTA','Yaris','1.5-16V','Sedã Plus CVT','CVT','F',9.0,10.6,13.0,14.5,1.56],
  ['VW','Voyage','1.6-8V','','M-5','F',8.0,9.9,11.6,14.1,1.72],
  ['VW','Voyage','1.6-8V','Patrulheiro','M-5','F',7.7,9.0,11.2,13.0,1.82],
  ['VW','Voyage','1.6-16V','MSI','A-6','F',8.0,10.1,11.1,14.3,1.73],
  ['VW','Virtus','1.6-16V','MSI','M-5','F',8.2,9.5,11.9,13.8,1.71],
  ['VW','Virtus','1.6-16V','MSI','A-6','F',7.8,9.8,10.8,13.8,1.79],
  ['VW','Virtus','1.6-16V','Sense MSI','A-6','F',7.8,9.8,10.8,13.8,1.79],
  ['VW','Virtus','1.0-12V','200 TSI','A-6','F',7.8,10.2,11.2,14.6,1.73],
  ['VW','Virtus','1.0-12V','Highline 200 TSI','A-6','F',7.8,10.2,11.2,14.6,1.73],
  ['VW','T-Cross','1.0-12V','200TSI','M-6','F',8.5,10.1,12.2,14.5,1.64],
  ['VW','T-Cross','1.0-12V','200TSI','A-6','F',7.6,9.5,11.0,13.5,1.81],
  ['NISSAN','Kicks','1.6-16V','SPC,ED','M-5','F',7.8,9.0,11.1,13.0,1.82],
  ['NISSAN','Kicks','1.6-16V','S CVT','CVT','F',7.7,9.4,11.4,13.7,1.78],
  ['NISSAN','Kicks','1.6-16V','SV CVT','CVT','F',7.7,9.4,11.4,13.7,1.78],
  ['NISSAN','Kicks','1.6-16V','SL CVT','CVT','F',7.7,9.4,11.4,13.7,1.78],
  ['NISSAN','Kicks','1.6-16V','UEFA CL CVT','CVT','F',7.7,9.4,11.4,13.7,1.78],
  ['HONDA','HR-V','1.8-16V','EXL CVT','CVT','F',7.7,8.6,11.0,12.3,1.87],
  ['JEEP','Renegade','1.8-16V','Longitude','A-6','F',6.9,8.6,10.0,12.0,2.02],
  ['FORD','Ka Hatch','1.0-12V','SE','M-5','F',9.3,10.8,13.3,15.6,1.49],
  ['FORD','Ka Hatch','1.0-12V','SE Plus','M-5','F',9.3,10.8,13.3,15.6,1.49],
  ['FORD','Ka Hatch','1.0-12V','FreeStyle','M-5','F',9.1,10.4,13.0,15.1,1.54],
  ['FORD','Ka Hatch','1.5-12V','SE','M-5','F',8.8,10.5,12.4,14.8,1.59],
  ['FORD','Ka Hatch','1.5-12V','SE Plus','M-5','F',8.8,10.5,12.4,14.8,1.59],
  ['FORD','Ka Hatch','1.5-12V','SE','A-6','F',8.4,9.9,11.7,14.5,1.67],
  ['FORD','Ka Hatch','1.5-12V','Titanium','A-6','F',8.4,9.9,11.7,14.5,1.67],
];
const HISTORICAL_SOURCE_URL='https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular/veiculos-leves-2020/@@download/file';
function makeHistoricalVehicle(a,i){const [brand,model,motor,version,transmission,fuel,ethCity,ethRoad,gasCity,gasRoad,mj]=a;return{id:`hist-2020-${uid(brand,model,version||motor,i)}`,brand,model,version,motor,transmission,type:'Combustão',fuel,category:'',gasCity:num(gasCity),gasRoad:num(gasRoad),ethCity:num(ethCity),ethRoad:num(ethRoad),kwhPerKm:mj?mj/3.6:null,autonomy:null,source:'INMETRO PBEV 2020',sourceYear:2020,imageUrl:null,imageSource:null,imageCredit:null};}
const HISTORICAL = HISTORICAL_VEHICLES.map(makeHistoricalVehicle);

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
function mapPBEV(text){const rows=parseCSV(text);const h=rows.shift().map(x=>x.replace(/^\uFEFF/,'').trim());const ix=Object.fromEntries(h.map((x,i)=>[x,i]));return rows.map((r,i)=>{const brand=r[ix.marca]||'',model=r[ix.modelo]||'',version=r[ix.versao]||'',prop=r[ix.propulsao]||'',fuel=r[ix.combustivel]||'',mj=num(r[ix.consumo_mj_km]);return{id:uid(brand,model,version,i),brand,model,version,type:prop||'Não informado',fuel,motor:r[ix.motor]||'',transmission:r[ix.transmissao]||'',category:r[ix.categoria]||'',gasCity:num(r[ix.gas_diesel_cid_kml]),gasRoad:num(r[ix.gas_diesel_est_kml]),ethCity:num(r[ix.etanol_cid_kml]),ethRoad:num(r[ix.etanol_est_kml]),kwhPerKm:mj?mj/3.6:null,autonomy:num(r[ix.autonomia_km]),source:'INMETRO PBEV 2026',sourceYear:2026,imageUrl:null,imageSource:null,imageCredit:null};}).filter(v=>v.brand&&v.model);}
function carName(v){return `${v.brand} ${v.model}`.trim();}
function cycleLabel(v){return `PBEV ${v.sourceYear||2026}`;}
function carFullName(v){return `${v.brand} ${v.model}${v.version?` · ${v.version}`:''}`.trim();}
function normalizeSearch(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function fuelLabel(v){const raw=normalizeSearch(v?.fuel||''); if(/eletr/.test(raw)||raw==='e')return 'Eletricidade'; if(raw==='f'||raw.includes('flex'))return 'Flex (gasolina/etanol)'; if(raw==='g'||raw.includes('gasolina'))return 'Gasolina'; if(raw==='d'||raw.includes('diesel'))return 'Diesel'; if(raw.includes('etanol')||raw==='a')return 'Etanol'; if(!raw)return '—'; return v.fuel;}
function parseFipePrice(s){const n=String(s??'').replace(/[^0-9,]/g,'').replace(/\./g,'').replace(',','.');const v=Number(n);return Number.isFinite(v)?v:null;}
function avg(a,b){return Number.isFinite(a)&&Number.isFinite(b)?a*.55+b*.45:(a??b);}
function isElectric(v){return /el[eé]tr/i.test(v.type)||/el[eé]tr/i.test(v.fuel)||Number.isFinite(v.kwhPerKm)&&!Number.isFinite(v.gasCity);}
function profile(){const km=num($('#kmMonth').value)||0,gas=parseMoney($('#gasPrice').value),eth=parseMoney($('#ethPrice').value),kwh=parseMoney($('#kwhPrice').value);return{km,gas,eth,kwh:$('#solar').checked?0:kwh,annualKm:km*12};}
function energy(v,p){if(isElectric(v)&&Number.isFinite(v.kwhPerKm))return{costKm:v.kwhPerKm*p.kwh,kind:'eletricidade',detail:`${(v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`};const g=avg(v.gasCity,v.gasRoad),e=avg(v.ethCity,v.ethRoad),options=[];if(Number.isFinite(g)&&p.gas>0)options.push({kind:'gasolina',costKm:p.gas/g,detail:`${g.toFixed(1).replace('.',',')} km/l · gasolina`});if(Number.isFinite(e)&&p.eth>0)options.push({kind:'etanol',costKm:p.eth/e,detail:`${e.toFixed(1).replace('.',',')} km/l · etanol`});return options.length?options.sort((a,b)=>a.costKm-b.costKm)[0]:{kind:'combustível',costKm:null,detail:'Informe os preços de combustível'};}
function calc(v,p){const e=energy(v,p),energyAnnual=Number.isFinite(e.costKm)?e.costKm*p.annualKm:null;return{e,energyAnnual,annual:null,costKm:e.costKm};}
function photoMarkup(v, cls='car-photo'){
  const fallback=`<div class="car-placeholder" aria-hidden="true">🚗</div>`;
  if(!v?.imageUrl)return `<div class="${cls}">${fallback}</div>`;
  return `<div class="${cls}"><img src="${esc(v.imageUrl)}" alt="${esc(carName(v))}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'car-placeholder',textContent:'🚗'}));"><span class="photo-badge">Foto ilustrativa</span></div>`;
}
function slotCard(i){const id=slots[i],v=id?VEHICLES.find(x=>x.id===id):null;return `<article class="car-card ${v?'filled':'empty'}" data-slot="${i}">${v?`<button type="button" class="remove" data-remove="${i}" aria-label="Remover carro" title="Remover este carro">×</button>${photoMarkup(v)}<h3>${esc(carFullName(v))}</h3><div class="version">${esc(v.type||'Propulsão não informada')} · ${cycleLabel(v)}</div><div class="car-price" data-fipe-price="${esc(v.id)}">Preço de referência (FIPE) · carregando…</div><button class="spec-link" data-spec="${v.id}">Ficha técnica →</button>`:`<div class="car-photo"><button class="select-plus" data-select="${i}" aria-label="Selecionar carro">+</button></div><h3>Selecionar carro</h3><p class="empty-copy">Escolha marca, modelo e versão.</p><button class="select-button" data-select="${i}">Selecionar</button>`}</article>`;}
function renderCars(){const host=$('#carColumns');host.innerHTML=slots.map((_,i)=>slotCard(i)).join('');$('#compareGrid').style.setProperty('--car-count',slots.length);$('#compareGrid').style.setProperty('--car-min',slots.length>2?'210px':'0px');const add=$('#addCar');add.disabled=slots.length>=4;add.style.display=slots.length>=4?'none':'flex';const selected=slots.map(id=>id?VEHICLES.find(x=>x.id===id):null).filter(Boolean);selected.forEach(v=>loadFipePrice(v));}
function searchVehicles(q){const s=normalizeSearch(q);if(!s){return [...VEHICLES].sort((a,b)=>(b.sourceYear||0)-(a.sourceYear||0)).slice(0,40);}return VEHICLES.filter(v=>normalizeSearch(`${v.brand} ${v.model} ${v.version} ${v.sourceYear||''}`).includes(s)).sort((a,b)=>(b.sourceYear||0)-(a.sourceYear||0)).slice(0,80);}
function pickerThumb(v){return v.imageUrl?`<img src="${esc(v.imageUrl)}" alt="" loading="lazy">`:'<span class="picker-car">🚗</span>';}
function renderPicker(q=''){const list=searchVehicles(q),host=$('#pickerResults');if(!list.length){host.innerHTML='<div class="no-results"><b>Nenhum veículo encontrado na base PBEV carregada.</b><span>Modelos mais antigos podem estar nos ciclos históricos do PBEV mantidos pelo Inmetro (2009–2025).</span><a href="https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular" target="_blank" rel="noopener">Consultar histórico do Inmetro →</a></div>';return;}host.innerHTML=list.map(v=>`<button class="picker-item" data-pick="${esc(v.id)}"><span class="picker-thumb">${pickerThumb(v)}</span><span><b>${esc(carFullName(v))}</b><small>${esc(v.type||'Propulsão não informada')} · PBEV 2026</small></span><span class="picker-arrow">›</span></button>`).join('');hydratePickerImages(list.slice(0,12));}
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
    {group:'Dados',items:[['Preço médio (FIPE)',x=>x.v.fipePrice?money(x.v.fipePrice):'—']]},
    {group:'Dados técnicos',items:[
      ['Propulsão',x=>x.v.type||'—'],
      ['Combustível',x=>fuelLabel(x.v)],
      ['Motor',x=>x.v.motor||'—'],
      ['Câmbio',x=>x.v.transmission||'—']
    ]},
    {group:'Consumo e energia',items:[
      ['Consumo cidade',x=>isElectric(x.v)?(Number.isFinite(x.v.kwhPerKm)?`${(x.v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`:'—'):(Number.isFinite(x.v.gasCity)?`${x.v.gasCity.toFixed(1).replace('.',',')} km/l`:'—')],
      ['Consumo estrada',x=>isElectric(x.v)?(Number.isFinite(x.v.kwhPerKm)?`${(x.v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`:'—'):(Number.isFinite(x.v.gasRoad)?`${x.v.gasRoad.toFixed(1).replace('.',',')} km/l`:'—')],
      ['Autonomia (PBEV)',x=>Number.isFinite(x.v.autonomy)?`${x.v.autonomy.toLocaleString('pt-BR')} km`:'—'],
      ['Custo por km',x=>Number.isFinite(x.r.costKm)?money2(x.r.costKm):'—']
    ]},
    {group:'Custo estimado',items:[
      ['Energia/combustível por mês',x=>Number.isFinite(x.r.e.costKm)?money(x.r.e.costKm*p.km):'—'],
      ['Energia/combustível por ano',x=>Number.isFinite(x.r.energyAnnual)?money(x.r.energyAnnual):'—']
    ]}
  ];
  let html=`<div class="table-scroll"><div class="table-head-row" ${grid}><div>Dados</div>${results.map(x=>`<div>${x?`<b>${esc(carName(x.v))}</b><small>${esc(x.v.version||'')}</small>`:'Selecionar carro'}</div>`).join('')}</div>`;
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
function openDrawer(id){const v=VEHICLES.find(x=>x.id===id);if(!v)return;const rows=[['Marca',v.brand],['Modelo',v.model],['Versão',v.version||'—'],['Propulsão',v.type],['Combustível',fuelLabel(v)],['Consumo cidade',Number.isFinite(v.gasCity)?`${v.gasCity} km/l`:Number.isFinite(v.kwhPerKm)?`${(v.kwhPerKm*100).toFixed(1)} kWh/100 km`:'—'],['Consumo estrada',Number.isFinite(v.gasRoad)?`${v.gasRoad} km/l`:Number.isFinite(v.kwhPerKm)?`${(v.kwhPerKm*100).toFixed(1)} kWh/100 km`:'—'],['Autonomia elétrica',Number.isFinite(v.autonomy)?`${v.autonomy} km`:'—']];$('#drawerContent').innerHTML=`<p class="eyebrow">${cycleLabel(v)}</p><h2>${esc(carName(v))}</h2><div class="drawer-sub">${esc(v.version||'Versão conforme cadastro do Inmetro')}</div>${photoMarkup(v,'drawer-photo')}<p class="photo-credit">${v.imageSource?`Foto: <a href="${esc(v.imageSource)}" target="_blank" rel="noopener">Wikimedia Commons</a>${v.imageCredit?` · ${esc(v.imageCredit)}`:''}`:'Foto ainda não localizada.'}</p><div class="drawer-section"><h3>Dados disponíveis</h3>${rows.map(r=>`<div class="drawer-row"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div><p class="drawer-source">Fonte dos dados técnicos: <a href="${v.sourceYear===2020?HISTORICAL_SOURCE_URL:PBEV_SOURCE_URL}" target="_blank" rel="noopener">INMETRO / ${cycleLabel(v)}</a>. Os valores de consumo são padronizados e podem variar em uso real.</p>`;$('#drawerBackdrop').hidden=false;requestAnimationFrame(()=>$('#specDrawer').classList.add('open'));$('#specDrawer').setAttribute('aria-hidden','false');}
function closeDrawer(){$('#specDrawer').classList.remove('open');$('#specDrawer').setAttribute('aria-hidden','true');setTimeout(()=>$('#drawerBackdrop').hidden=true,180);}
async function fipeGet(path){const url=`${FIPE_API_BASE}${path}`;const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`FIPE ${r.status}`);return r.json();}
function scoreFipeModel(name,v){const target=normalizeSearch(`${v.model} ${v.version}`);const words=target.split(/\s+/).filter(w=>w.length>2);const hay=normalizeSearch(name);let score=0;words.forEach(w=>{if(hay.includes(w))score+=w.length>4?2:1;});if(hay.includes(normalizeSearch(v.model)))score+=6;return score;}
async function loadFipePrice(v){if(!v||v.fipePriceLoading||v.fipePrice!==undefined)return;v.fipePriceLoading=true;const el=document.querySelector(`[data-fipe-price="${CSS.escape(v.id)}"]`);try{const brands=await fipeGet('/brands');const b=brands.find(x=>normalizeSearch(x.name).includes(normalizeSearch(v.brand))||normalizeSearch(v.brand).includes(normalizeSearch(x.name).split(' - ')[0]));if(!b)throw new Error('marca');const models=await fipeGet(`/brands/${b.code}/models`);const candidates=models.map(m=>({m,score:scoreFipeModel(m.name,v)})).sort((a,b)=>b.score-a.score);const best=candidates[0];if(!best||best.score<5)throw new Error('modelo');const years=await fipeGet(`/brands/${b.code}/models/${best.m.code}/years`);const year=years[0];if(!year)throw new Error('ano');const detail=await fipeGet(`/brands/${b.code}/models/${best.m.code}/years/${year.code}`);v.fipePrice=parseFipePrice(detail.price);v.fipeMonth=detail.referenceMonth||'';v.fipeModel=detail.model||best.m.name;v.fipeYear=detail.modelYear||null;v.fipeSource='FIPE API';if(el)el.innerHTML=v.fipePrice?`Preço de referência (FIPE) <b>${money(v.fipePrice)}</b><small>${esc(v.fipeMonth||'')}</small>`:'Preço de referência (FIPE) · não localizado';table();}catch(_){v.fipePrice=null;if(el)el.textContent='Preço de referência (FIPE) · não localizado';}finally{v.fipePriceLoading=false;}}
function parseMoney(value){const s=String(value??'').trim();if(!s)return 0;return Number(s.replace(/\./g,'').replace(',','.'))||0;}
function formatCentsInput(el){const digits=el.value.replace(/\D/g,'').slice(0,7);if(!digits){el.value='';return;}const cents=Math.max(1,parseInt(digits,10));el.value=(cents/100).toFixed(2).replace('.',',');}
function initMoneyInputs(){document.querySelectorAll('.money-input').forEach(el=>{el.addEventListener('input',()=>{formatCentsInput(el);table();});el.addEventListener('focus',()=>{el.select();});el.addEventListener('blur',()=>{if(el.value)formatCentsInput(el);});});}
function cacheKey(v){return `qcr-photo-v10:${carName(v).toLowerCase()}`;}
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
document.addEventListener('click',e=>{const select=e.target.closest('[data-select]');if(select){openPicker(Number(select.dataset.select));return;}const pick=e.target.closest('[data-pick]');if(pick){slots[activeSlot]=pick.dataset.pick;closePicker();renderAll();requestAnimationFrame(()=>document.querySelector(`[data-slot="${activeSlot}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));const v=VEHICLES.find(x=>x.id===pick.dataset.pick);if(v){resolveVehicleImage(v).then(()=>renderCars());}return;}const remove=e.target.closest('[data-remove]');if(remove){const index=Number(remove.dataset.remove);if(slots.length<=2){slots[index]=null;}else{slots.splice(index,1);}renderAll();return;}const spec=e.target.closest('[data-spec]');if(spec){openDrawer(spec.dataset.spec);return;}if(e.target.closest('[data-add-car]')){addCarSlot();return;}});
$('#recalculate').addEventListener('click',table);
function openAllSpecs(){
  const selected=slots.map(id=>id?VEHICLES.find(x=>x.id===id):null).filter(Boolean);
  if(!selected.length)return;
  const blocks=selected.map(v=>{
    const rows=[
      ['Marca',v.brand],['Modelo',v.model],['Versão',v.version||'—'],['Categoria',v.category||'—'],
      ['Propulsão',v.type||'—'],['Combustível',fuelLabel(v)],['Motor',v.motor||'—'],['Câmbio',v.transmission||'—'],
      ['Consumo cidade',Number.isFinite(v.gasCity)?`${v.gasCity.toFixed(1).replace('.',',')} km/l`:Number.isFinite(v.kwhPerKm)?`${(v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`:'—'],
      ['Consumo estrada',Number.isFinite(v.gasRoad)?`${v.gasRoad.toFixed(1).replace('.',',')} km/l`:Number.isFinite(v.kwhPerKm)?`${(v.kwhPerKm*100).toFixed(1).replace('.',',')} kWh/100 km`:'—'],
      ['Autonomia (PBEV)',Number.isFinite(v.autonomy)?`${v.autonomy.toLocaleString('pt-BR')} km`:'—']
    ];
    return `<article class="all-spec-card"><div class="all-spec-photo">${photoMarkup(v,'drawer-photo')}</div><div class="all-spec-title"><div><p class="eyebrow">${cycleLabel(v)}</p><h3>${esc(carName(v))}</h3><span>${esc(v.version||'Versão conforme cadastro do Inmetro')}</span></div><button class="mini-spec" type="button" data-spec="${esc(v.id)}">Abrir ficha</button></div><div class="all-spec-grid">${rows.map(r=>`<div><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div></article>`;
  }).join('');
  $('#drawerContent').innerHTML=`<p class="eyebrow">ESPECIFICAÇÕES DOS CARROS</p><h2>Ficha técnica completa</h2><p class="drawer-sub">Todos os veículos selecionados nesta comparação.</p><div class="all-specs-list">${blocks}</div><p class="drawer-source">Fonte dos dados técnicos: <a href="${v.sourceYear===2020?HISTORICAL_SOURCE_URL:PBEV_SOURCE_URL}" target="_blank" rel="noopener">INMETRO / ${cycleLabel(v)}</a>. Os valores de consumo são padronizados e podem variar em uso real.</p>`;
  $('#drawerBackdrop').hidden=false;requestAnimationFrame(()=>$('#specDrawer').classList.add('open'));$('#specDrawer').setAttribute('aria-hidden','false');
  selected.forEach(v=>resolveVehicleImage(v).then(()=>{const card=$(`#drawerContent [data-spec="${CSS.escape(v.id)}"]`)?.closest('.all-spec-card');if(card)card.querySelector('.all-spec-photo').innerHTML=photoMarkup(v,'drawer-photo');}));
}
$('#showAllSpecs').addEventListener('click',openAllSpecs);
$('#pickerClose').addEventListener('click',closePicker);$('#pickerBackdrop').addEventListener('click',closePicker);$('#pickerSearch').addEventListener('input',e=>renderPicker(e.target.value));$('#clearSearch').addEventListener('click',()=>{const input=$('#pickerSearch');input.value='';renderPicker('');input.focus();});
$('#drawerClose').addEventListener('click',closeDrawer);$('#drawerBackdrop').addEventListener('click',closeDrawer);document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePicker();closeDrawer();}});
['#kmMonth','#solar'].forEach(sel=>$(sel).addEventListener('input',()=>{if(sel==='#solar')$('#solarHint').textContent=$('#solar').checked?'custo considerado: R$ 0,00/kWh':'considera R$ 0,00/kWh';table();}));

async function load(){try{const r=await fetch(PBEV_CSV_URL,{cache:'no-store'});if(!r.ok)throw new Error('PBEV indisponível');VEHICLES=mapPBEV(await r.text());if(VEHICLES.length<100)throw new Error('base incompleta');VEHICLES=[...VEHICLES,...HISTORICAL];$('#dataStatus').textContent=`${VEHICLES.length} registros · PBEV 2026 + histórico 2020`;$('#dataStatus').classList.add('ok');renderAll();}catch(e){$('#dataStatus').textContent='Base PBEV indisponível no momento.';renderAll();}}
initMoneyInputs();load();

// Aviso de privacidade: nenhum cookie opcional é ativado nesta versão.
(function initPrivacyNotice(){
  const banner=document.querySelector('#privacyBanner');
  const ok=document.querySelector('#privacyOk');
  if(!banner||!ok)return;
  let seen=false; try{seen=localStorage.getItem('qcr-privacy-notice-v1')==='1';}catch(_){ }
  if(!seen)banner.hidden=false;
  ok.addEventListener('click',()=>{try{localStorage.setItem('qcr-privacy-notice-v1','1');}catch(_){ }banner.hidden=true;});
})();
