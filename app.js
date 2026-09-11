const VEHICLES = [
  {id:"dolphin",name:"BYD Dolphin",year:2026,type:"Elétrico",energy:"kwh",consumption:.145,maintenance:2100,insurance:4200,price:149800,ipva:.02},
  {id:"corolla",name:"Toyota Corolla",year:2026,type:"Híbrido",energy:"gas",consumption:17.9,maintenance:3200,insurance:3900,price:184990,ipva:.03},
  {id:"h6",name:"GWM Haval H6",year:2026,type:"Híbrido",energy:"gas",consumption:14.2,maintenance:3300,insurance:5100,price:219000,ipva:.025},
  {id:"polo",name:"VW Polo",year:2026,type:"Combustão",energy:"gas",consumption:13.5,maintenance:2700,insurance:3500,price:95000,ipva:.03},
  {id:"corollaCross",name:"Toyota Corolla Cross",year:2026,type:"Híbrido",energy:"gas",consumption:16.0,maintenance:3500,insurance:4400,price:205000,ipva:.03},
  {id:"ora",name:"GWM Ora 03",year:2026,type:"Elétrico",energy:"kwh",consumption:.165,maintenance:2300,insurance:4300,price:169000,ipva:.02}
];

let selected=["dolphin","polo"];
const $=s=>document.querySelector(s);
const money=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const money2=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});

function fieldHTML(index){
  const c=VEHICLES.find(v=>v.id===selected[index]);
  return `<div class="car-field">
    <label>Carro ${index+1}${index>1?' <span style="font-weight:500;color:#82909d">(opcional)</span>':''}</label>
    <select class="car-select" data-index="${index}" aria-label="Selecionar carro ${index+1}">
      ${VEHICLES.map(v=>`<option value="${v.id}" ${v.id===c.id?"selected":""}>${v.name} — ${v.year} · ${v.type}</option>`).join("")}
    </select>
  </div>`;
}
function renderFields(){
  $("#carFields").innerHTML=selected.map((_,i)=>fieldHTML(i)).join("");
  document.querySelectorAll(".car-select").forEach(s=>s.addEventListener("change",e=>{
    selected[+e.target.dataset.index]=e.target.value; renderFields();
  }));
  $("#addCar").style.display=selected.length>=4?"none":"flex";
}
$("#addCar").addEventListener("click",()=>{
  const next=VEHICLES.find(v=>!selected.includes(v.id));
  if(next){selected.push(next.id);renderFields();}
});
$("#advancedToggle").addEventListener("click",()=>{
  const p=$("#advancedPanel"); p.hidden=!p.hidden; $("#advancedToggle span").textContent=p.hidden?"⌄":"⌃";
});

function calc(v){
  const km=Number($("#kmMonth").value)||1250;
  const gas=Number($("#gasPrice").value)||6.19;
  let kwh=Number($("#kwhPrice").value)||.89;
  if($("#solar").value==="yes") kwh*=.35;
  const monthly=v.energy==="kwh" ? km*v.consumption*kwh : km/v.consumption*gas;
  const annual=monthly*12;
  const years=Number($("#years").value)||5;
  const fixed=(v.maintenance+v.insurance+(v.price*v.ipva))*years;
  const total=annual*years+fixed;
  return {monthly,annual,total,costKm:total/(km*12*years)};
}
function compare(){
  const rows=selected.map(id=>{const v=VEHICLES.find(x=>x.id===id);return {v,...calc(v)}});
  const min=Math.min(...rows.map(r=>r.total));
  $("#resultArea").innerHTML=`<div class="result-grid">${rows.map(r=>`
    <article class="result-card ${r.total===min?"winner":""}">
      <span class="eyebrow">${r.v.type.toUpperCase()}</span>
      <h3>${r.v.name}</h3><span class="type">${r.v.year} · estimativa de protótipo</span>
      <div class="result-cost">${money(r.total)}</div>
      <div class="result-meta">custo total estimado em ${$("#years").value} anos</div>
      ${r.total===min?'<span class="result-badge">MENOR CUSTO NO CENÁRIO</span>':""}
      <div class="result-foot">
        <div><span>Por km</span><b>${money2(r.costKm)}</b></div>
        <div><span>Por mês</span><b>${money(r.monthly)}</b></div>
        <div><span>Por ano</span><b>${money(r.annual)}</b></div>
      </div>
    </article>`).join("")}</div>
    <p style="font-size:10px;color:#82909d;margin-top:12px">Protótipo: valores de manutenção, seguro, preço e IPVA são demonstrativos. Na versão de produção, cada dado terá fonte e data de atualização.</p>`;
  $("#resultArea").scrollIntoView({behavior:"smooth",block:"nearest"});
}
$("#compareButton").addEventListener("click",compare);
renderFields();
