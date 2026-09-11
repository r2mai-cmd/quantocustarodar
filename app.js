const cars=[
{id:"dolphin",name:"Elétrico compacto",type:"Elétrico",eff:.145,kind:"kwh"},
{id:"hybrid",name:"Híbrido médio",type:"Híbrido",eff:14.2,kind:"gas"},
{id:"flex",name:"Flex compacto",type:"Combustão",eff:12.5,kind:"gas"},
{id:"sedan",name:"Sedã eficiente",type:"Combustão",eff:13.5,kind:"gas"}
];
let choices=[cars[0].id,cars[2].id];
const money=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const money2=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2});
function fill(){
 for(const id of ["car1","car2"]){
  const s=document.getElementById(id);const idx=id==="car1"?0:1;
  s.innerHTML=cars.map(c=>`<option value="${c.id}" ${c.id===choices[idx]?"selected":""}>${c.name}</option>`).join("");
  s.onchange=e=>{choices[idx]=e.target.value;sync()};
 }
 sync();
}
function sync(){
 choices.forEach((id,i)=>{const c=cars.find(x=>x.id===id);document.getElementById(`car${i+1}Name`).textContent=c.name;document.getElementById(`car${i+1}Type`).textContent=`2026 · ${c.type}`});
}
document.getElementById("addCar").onclick=()=>alert("Na próxima versão: comparação de até 4 carros. A interface já está preparada para isso.");
function calculate(){
 const km=+document.getElementById("km").value||15000,gas=+document.getElementById("gas").value||6.19,kwh=+document.getElementById("kwh").value||.89,solar=document.getElementById("solar").value==="Sim";
 const energy=solar?kwh*.35:kwh;
 const rs=choices.map(id=>{const c=cars.find(x=>x.id===id);const monthly=c.kind==="kwh"?km/12*c.eff*energy:km/12/c.eff*gas;return {c,monthly,year:monthly*12,km:monthly*12/km}});
 const low=Math.min(...rs.map(x=>x.year));
 document.getElementById("result").innerHTML=rs.map(r=>`<div class="result-box"><div><span class="eyebrow">${r.c.type}</span><h3>${r.c.name}</h3></div><strong>${money2(r.km)}/km</strong><p>Energia/combustível: <b>${money(r.monthly)}/mês</b> · <b>${money(r.year)}/ano</b></p>${r.year===low?'<em>Menor custo de energia no cenário</em>':''}</div>`).join("")+`<small class="demo-note">Protótipo: estes valores são demonstrativos. Na produção, cada dado terá fonte e data de atualização.</small>`;
}
document.getElementById("compareNow").onclick=()=>{calculate();document.getElementById("result").scrollIntoView({behavior:"smooth",block:"nearest"})};
fill();
