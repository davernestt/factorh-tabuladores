import {strict as assert} from "node:assert";
import type {DimensionScore} from "../lib/feedback360";
import {get360GapInsights,format360Gap} from "../lib/feedback360-gap-interpretation";

const make=(key:string,self?:number,manager?:number,peer?:number,report?:number):DimensionScore=>({
 key,name:key,scores:{self,manager,peer,report},counts:{self:self===undefined?0:1,manager:manager===undefined?0:1,peer:peer===undefined?0:3,report:report===undefined?0:3},
 gap:self===undefined||[manager,peer,report].every(x=>x===undefined)?null:0
});
const dimensions=[
 make("Responsabilidad",3.7,2.59),
 make("Actitud",2.5,2.94),
 make("Comunicación",3,3),
 make("Equipo",3.8,2.7),
 make("Calidad",3.5,3.1),
 make("Sin AUTO",undefined,2.4),
 make("Sin entorno",3.1)
];
const cases=get360GapInsights(dimensions);
assert.equal(cases.length,3,"prioriza solo las 3 brechas mayores");
assert.deepEqual(cases.map(r=>r.name),["Responsabilidad","Equipo","Actitud"]);
assert.equal(cases[0].direction,"auto_higher");
assert.equal(cases[2].direction,"environment_higher");
assert.equal(cases[0].gap,1.11);
assert.equal(cases[1].gap,1.1);
assert.equal(cases[2].gap,-0.44);
assert.match(cases[0].suggestion,/conductas observables|conductas/i);
assert.match(cases[2].suggestion,/fortalezas|reconociendo/i);
assert.equal(format360Gap(1.11),"+1.11");
assert.equal(format360Gap(-0.44),"-0.44");
assert.equal(format360Gap(0),"0.00");
assert.deepEqual(get360GapInsights([make("Igualdad",3.1,3.1),make("Insuficiente",undefined,3)]),[],"no inventar diferencias");
const withGuide=get360GapInsights([make("Brecha",3.9,2.5)],[
 {key:"Brecha",name:"Brecha",external:2.5,self:3.9,gap:1.4,alignment:"",strongestFacet:null,developmentFacet:null,narrative:"",impact:"",suggestions:["Verificar el seguimiento de acuerdos."]}
]);
assert.match(withGuide[0].suggestion,/Verificar el seguimiento de acuerdos/);
console.log("360_GAP_INTERPRETATION_OK: signos, confidencialidad, prioridad y recomendaciones verificadas.");
