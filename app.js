const vehicles = [
  {id:"dolphin", name:"BYD Dolphin", version:"Elétrico · demonstrativo", kind:"Elétrico", price:149800, efficiency:0.145, fuelType:"kwh", maintenance:2100, insurance:4200, depreciation:0.50, ipvaRate:0.02, autonomy:291},
  {id:"h6", name:"GWM Haval H6", version:"Híbrido · demonstrativo", kind:"Híbrido", price:219000, efficiency:0.145, fuelType:"gas", maintenance:3300, insurance:5100, depreciation:0.34, ipvaRate:0.025, autonomy:0},
  {id:"corolla", name:"Toyota Corolla", version:"Combustão · demonstrativo", kind:"Combustão", price:151000, efficiency:13.2, fuelType:"gas", maintenance:3200, insurance:3900, depreciation:0.32, ipvaRate:0.03, autonomy:0},
  {id:"ora", name:"GWM Ora 03", version:"Elétrico · demonstrativo", kind:"Elétrico", price:169000, efficiency:0.165, fuelType:"kwh", maintenance:2300, insurance:4300, depreciation:0.46, ipvaRate:0.02, autonomy:232}
];

let selected = [vehicles[0].id, vehicles[2].id];

const money = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const money2 = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
const number = v => v.toLocaleString("pt-BR");

function renderSlots(){
  const wrap = document.getElementById("carSlots");
  wrap.innerHTML = selected.map((id,i)=>{
    const car = vehicles.find(v=>v.id===id);
    return `<div class="car-card active">
      <span class="car-number">Carro ${i+1}</span>
      ${i>1?`<button class="remove-car" data-remove="${i}" aria-label="Remover carro">×</button>`:""}
      <h3>${car.name}</h3><p>${car.version}</p>
      <select class="car-select" data-index="${i}">
        ${vehicles.map(v=>`<option value="${v.id}" ${v.id===id?"selected":""}>${v.name} — ${v.kind}</option>`).join("")}
      </select>
    </div>`;
  }).join("");
  document.querySelectorAll(".car-select").forEach(el=>el.addEventListener("change",e=>{
    selected[+e.target.dataset.index]=e.target.value;
    renderSlots();
  }));
  document.querySelectorAll("[data-remove]").forEach(el=>el.addEventListener("click",()=>{
    selected.splice(+el.dataset.remove,1); renderSlots();
  }));
  document.getElementById("addCar").style.display=selected.length>=4?"none":"flex";
}
document.getElementById("addCar").addEventListener("click",()=>{
  const next=vehicles.find(v=>!selected.includes(v.id));
  if(next){selected.push(next.id);renderSlots();}
});

function profile(){
  const kmMonth=+document.getElementById("kmMonth").value||1500;
  const gas=+document.getElementById("gasPrice").value||6.2;
  let kwh=+document.getElementById("kwhPrice").value||.92;
  if(document.getElementById("solar").checked) kwh*=0.35;
  return {kmMonth,kmYear:kmMonth*12,gas,kwh,years:+document.getElementById("years").value||5};
}

function calc(car,p){
  const energyMonth=car.fuelType==="kwh" ? p.kmMonth*car.efficiency*p.kwh : p.kmMonth/car.efficiency*p.gas;
  const energyYear=energyMonth*12;
  const maintenance=car.maintenance;
  const insurance=car.insurance;
  const ipva=car.price*car.ipvaRate;
  const totalYear=energyYear+maintenance+insurance+ipva;
  const total=totalYear*p.years + car.price*car.depreciation;
  return {energyMonth,energyYear,maintenance,insurance,ipva,totalYear,total,costKm:total/(p.kmYear*p.years),autonomy:car.autonomy};
}

function renderResults(){
  const p=profile();
  document.getElementById("kmYearPreview").textContent=number(p.kmYear);
  const results=selected.map(id=>{
    const car=vehicles.find(v=>v.id===id); return {car,...calc(car,p)};
  });
  const min=Math.min(...results.map(r=>r.total));
  const maxEnergy=Math.max(...results.map(r=>r.energyMonth));
  document.getElementById("resultContext").textContent=`${number(p.kmYear)} km/ano · ${p.years} anos · ${p.kwh<0.5?"solar considerada":"energia conforme tarifa informada"}`;
  document.getElementById("resultGrid").innerHTML=results.map(r=>{
    const pct=maxEnergy?Math.max(8,r.energyMonth/maxEnergy*100):10;
    const winner=r.total===min;
    const breakText = winner ? "Menor custo total no cenário informado." : `Diferença para a opção mais econômica: ${money(r.total-min)}.`;
    return `<article class="result-card ${winner?"winner":""}">
      <div class="result-top">
        <div><div class="result-name">${r.car.name}</div><div class="result-type">${r.car.version}</div></div>
        ${winner?'<span class="winner-badge">Menor TCO</span>':""}
      </div>
      <div class="cost-main"><span>Custo total estimado</span><strong>${money(r.total)}</strong><small>em ${p.years} anos</small></div>
      <div class="metrics">
        <div class="metric"><span>Por km</span><strong>${money2(r.costKm)}</strong></div>
        <div class="metric"><span>Energia / mês</span><strong>${money(r.energyMonth)}</strong></div>
        <div class="metric"><span>Manutenção / ano</span><strong>${money(r.maintenance)}</strong></div>
      </div>
      <div class="cost-bars">
        <div class="bar-row"><span>Energia</span><div class="bar"><i style="width:${pct}%"></i></div><b>${money(r.energyYear)}/ano</b></div>
        <div class="bar-row"><span>IPVA</span><div class="bar"><i style="width:${Math.min(100,r.ipva/Math.max(...results.map(x=>x.ipva))*100)}%"></i></div><b>${money(r.ipva)}</b></div>
        <div class="bar-row"><span>Seguro</span><div class="bar"><i style="width:${Math.min(100,r.insurance/Math.max(...results.map(x=>x.insurance))*100)}%"></i></div><b>${money(r.insurance)}</b></div>
      </div>
      <div class="break-even">${breakText}</div>
    </article>`;
  }).join("") + `<p class="result-note">Protótipo: preços, manutenção, seguro, depreciação e IPVA são valores demonstrativos. A versão de produção deve consumir a base oficial e exibir fonte/data de cada dado.</p>`;
}

document.getElementById("compareBtn").addEventListener("click",()=>{
  renderResults();
  document.getElementById("resultado").scrollIntoView({behavior:"smooth",block:"start"});
});
["kmMonth","gasPrice","kwhPrice","solar","years"].forEach(id=>document.getElementById(id).addEventListener("input",()=>{
  document.getElementById("kmYearPreview").textContent=number((+document.getElementById("kmMonth").value||1500)*12);
}));
renderSlots();
