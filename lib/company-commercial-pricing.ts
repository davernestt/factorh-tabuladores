/** Precios de lista sugeridos en MXN antes de IVA.
 * Las cantidades personalizadas usan una referencia prorrateada editable,
 * no representan un precio de lista previamente aprobado.
 */
export type CommercialPackage={id:string;moduleKey:string;moduleName:string;label:string;quantity:number;unit:string;price:number;promoEligible:boolean};
export const commercialPackages:CommercialPackage[]=[
 {id:"psy-6-10",moduleKey:"psychometrics",moduleName:"Psicometrías",label:"10 candidatos · 6 pruebas",quantity:10,unit:"candidatos",price:1190,promoEligible:true},
 {id:"psy-8-10",moduleKey:"psychometrics",moduleName:"Psicometrías",label:"10 candidatos · 8 pruebas",quantity:10,unit:"candidatos",price:1490,promoEligible:true},
 {id:"psy-8-30",moduleKey:"psychometrics",moduleName:"Psicometrías",label:"30 candidatos · 8 pruebas",quantity:30,unit:"candidatos",price:2990,promoEligible:true},
 {id:"psy-8-50",moduleKey:"psychometrics",moduleName:"Psicometrías",label:"50 candidatos · 8 pruebas",quantity:50,unit:"candidatos",price:4190,promoEligible:true},
 {id:"psy-8-100",moduleKey:"psychometrics",moduleName:"Psicometrías",label:"100 candidatos · 8 pruebas",quantity:100,unit:"candidatos",price:6990,promoEligible:true},
 {id:"psy-all-350",moduleKey:"psychometrics",moduleName:"Psicometrías",label:"350 candidatos · catálogo completo",quantity:350,unit:"candidatos",price:17500,promoEligible:true},
 {id:"360-1",moduleKey:"feedback360",moduleName:"Evaluación 360°",label:"1 líder",quantity:1,unit:"líderes",price:690,promoEligible:true},
 {id:"360-5",moduleKey:"feedback360",moduleName:"Evaluación 360°",label:"5 líderes",quantity:5,unit:"líderes",price:2990,promoEligible:true},
 {id:"360-15",moduleKey:"feedback360",moduleName:"Evaluación 360°",label:"15 líderes",quantity:15,unit:"líderes",price:6990,promoEligible:true},
 {id:"360-30",moduleKey:"feedback360",moduleName:"Evaluación 360°",label:"30 líderes",quantity:30,unit:"líderes",price:11990,promoEligible:true},
 {id:"360-60",moduleKey:"feedback360",moduleName:"Evaluación 360°",label:"60 líderes",quantity:60,unit:"líderes",price:19990,promoEligible:true},
 {id:"pdl-1",moduleKey:"pdl",moduleName:"PDL",label:"1 líder · diagnóstico digital",quantity:1,unit:"líderes",price:790,promoEligible:true},
 {id:"pdl-5",moduleKey:"pdl",moduleName:"PDL",label:"5 líderes · diagnóstico digital",quantity:5,unit:"líderes",price:3290,promoEligible:true},
 {id:"pdl-10",moduleKey:"pdl",moduleName:"PDL",label:"10 líderes · diagnóstico digital",quantity:10,unit:"líderes",price:5990,promoEligible:true},
 {id:"pdl-20",moduleKey:"pdl",moduleName:"PDL",label:"20 líderes · diagnóstico digital",quantity:20,unit:"líderes",price:9990,promoEligible:true},
 {id:"nom-50",moduleKey:"nom035",moduleName:"NOM-035",label:"16 a 50 trabajadores · por centro",quantity:50,unit:"trabajadores",price:1690,promoEligible:true},
 {id:"nom-100",moduleKey:"nom035",moduleName:"NOM-035",label:"51 a 100 trabajadores · por centro",quantity:100,unit:"trabajadores",price:2690,promoEligible:true},
 {id:"nom-250",moduleKey:"nom035",moduleName:"NOM-035",label:"101 a 250 trabajadores · por centro",quantity:250,unit:"trabajadores",price:4490,promoEligible:true},
 {id:"clima-50",moduleKey:"climate",moduleName:"Clima",label:"Esencial · 50 participantes",quantity:50,unit:"participantes",price:1990,promoEligible:true},
 {id:"clima-100",moduleKey:"climate",moduleName:"Clima",label:"Esencial · 100 participantes",quantity:100,unit:"participantes",price:2790,promoEligible:true},
 {id:"c3-50",moduleKey:"climate",moduleName:"Clima",label:"C3 PRO · 50 participantes",quantity:50,unit:"participantes",price:3490,promoEligible:true},
 {id:"c3-100",moduleKey:"climate",moduleName:"Clima",label:"C3 PRO · 100 participantes",quantity:100,unit:"participantes",price:4990,promoEligible:true},
 {id:"ese-express",moduleKey:"studies",moduleName:"Estudios Socioeconómicos",label:"Express · 1 estudio",quantity:1,unit:"estudios",price:499,promoEligible:false},
 {id:"ese-esencial",moduleKey:"studies",moduleName:"Estudios Socioeconómicos",label:"Esencial · 1 estudio",quantity:1,unit:"estudios",price:645,promoEligible:false},
 {id:"ese-integral",moduleKey:"studies",moduleName:"Estudios Socioeconómicos",label:"Integral · 1 estudio",quantity:1,unit:"estudios",price:980,promoEligible:false},
 {id:"ese-ejecutivo",moduleKey:"studies",moduleName:"Estudios Socioeconómicos",label:"Ejecutivo · 1 estudio",quantity:1,unit:"estudios",price:1190,promoEligible:false},
];
export type QuoteRequestItem={packageId:string;quantity:number;negotiatedPrice:number};
export type PricedQuoteItem=QuoteRequestItem&{moduleKey:string;moduleName:string;label:string;unit:string;listPrice:number;discount:number;finalPrice:number;promoEligible:boolean;customQuantity:boolean;};
export type QuoteResult={items:PricedQuoteItem[];subtotal:number;discount:number;total:number;promo50:boolean;};
const money=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function calculateQuote(input:QuoteRequestItem[],applyPromo:boolean,day:string):QuoteResult {
 if(!Array.isArray(input)||input.length<1||input.length>12)throw Error("Selecciona entre uno y doce paquetes.");
 const items=input.map(row=>{
  const p=commercialPackages.find(x=>x.id===row.packageId);
  if(!p)throw Error("Paquete no reconocido.");
  const quantity=Number(row.quantity),price=Number(row.negotiatedPrice);
  if(!Number.isInteger(quantity)||quantity<1||quantity>10000)throw Error("La cantidad debe ser un número entero de 1 a 10,000.");
  if(!Number.isFinite(price)||price<0||price>10000000)throw Error("Precio negociado fuera de rango.");
  return {packageId:p.id,quantity,negotiatedPrice:money(price),moduleKey:p.moduleKey,moduleName:p.moduleName,label:p.label,unit:p.unit,listPrice:money(p.price*quantity/p.quantity),discount:0,finalPrice:money(price),promoEligible:p.promoEligible,customQuantity:quantity!==p.quantity};
 });
 const eligible=new Set(items.filter(i=>i.promoEligible).map(i=>i.moduleKey));
 const inWindow=day>="2026-10-01"&&day<="2026-12-31";
 if(applyPromo&&(!inWindow||eligible.size<2))throw Error("El 50% requiere dos módulos diferentes elegibles contratados entre octubre y diciembre de 2026.");
 if(applyPromo){for(const item of items){if(item.promoEligible){item.discount=money(item.negotiatedPrice*0.5);item.finalPrice=money(item.negotiatedPrice-item.discount);}}}
 const subtotal=money(items.reduce((sum,i)=>sum+i.negotiatedPrice,0));
 const discount=money(items.reduce((sum,i)=>sum+i.discount,0));
 return {items,subtotal,discount,total:money(subtotal-discount),promo50:applyPromo};
}
