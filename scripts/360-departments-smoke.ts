import {strict as assert} from "node:assert";
import {latest360PerPerson,publishable360People,canPublish360Department} from "../lib/feedback360-departments";
import type {DimensionScore} from "../lib/feedback360";
const dim=(manager?:number):DimensionScore=>({key:"comunicacion",name:"Comunicación",scores:{manager},counts:{},gap:null});
const row=(id:string,person_id:string,department_id:string|null,manager?:number)=>({cycle:{id,person_id,department_id},summary:{dimensions:[dim(manager)]}});
const entries=[
 row("a1","a","vent",2),row("a2","a","vent",3),row("b1","b","vent",2.9),
 row("c1","c","vent"),row("d1","d","vent",3.6),row("e1","e","rh",3.4)
];
assert.equal(latest360PerPerson(entries).length,5,"No duplicar evaluaciones repetidas por persona");
assert.equal(latest360PerPerson(entries).find(x=>x.cycle.person_id==="a")?.cycle.id,"a2","Priorizar el ciclo reciente");
const sales=entries.filter(x=>x.cycle.department_id==="vent");
assert.equal(publishable360People(sales).length,3,"Excluir registros sin entorno");
assert.equal(canPublish360Department(sales),true,"Publicar a partir de tres personas");
assert.equal(canPublish360Department(sales.filter(x=>x.cycle.person_id!=="d")),false,"Dos personas distintas no alcanzan el mínimo");
assert.equal(canPublish360Department(entries.filter(x=>x.cycle.department_id==="rh")),false,"Proteger grupos de una sola persona");
console.log("360_DEPARTMENTS_OK: histórico por persona y mínimo de privacidad verificados.");
