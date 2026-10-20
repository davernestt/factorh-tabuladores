import {strict as assert} from "node:assert";
import type {DimensionScore,FeedbackRole} from "../lib/feedback360";
import {buildRadarRolePaths} from "../lib/feedback360-radar";
const fake=(name:string,self?:number,manager?:number):DimensionScore=>({
 key:name,name,scores:{self,manager},counts:{self:self===undefined?0:1,manager:manager===undefined?0:1,peer:0,report:0},gap:null
});
const normal=[fake("1",3,3),fake("2",4,3),fake("3",2,4),fake("4",3,2)];
const complete=buildRadarRolePaths(normal,"self");
assert.equal(complete.complete,true);
assert.equal(complete.availableCount,4);
assert.equal(complete.paths.length,1);
assert.match(complete.paths[0],/ Z$/);
const partial=buildRadarRolePaths([fake("1",3),fake("2",undefined),fake("3",2),fake("4",3)],"self");
assert.equal(partial.complete,false);
assert.equal(partial.availableCount,3);
assert.equal(partial.paths.length,1,"Conecta únicamente puntos consecutivos a través del inicio");
assert.doesNotMatch(partial.paths[0],/Z$/,"No cierra un polígono incompleto");
const disconnected=buildRadarRolePaths([fake("1",3),fake("2",undefined),fake("3",2),fake("4",undefined)],"self");
assert.equal(disconnected.paths.length,0,"No inventa líneas entre puntos aislados");
assert.equal(disconnected.dots.length,2);
const missing=buildRadarRolePaths([fake("1",undefined),fake("2",undefined),fake("3",undefined)],"self");
assert.equal(missing.paths.length,0);
assert.equal(missing.dots.length,0);
assert.equal(missing.availableCount,0);
assert.equal(buildRadarRolePaths([],"self").availableCount,0);
assert.equal(buildRadarRolePaths([fake("1",0),fake("2",5)],"self").availableCount,0);
console.log("360_RADAR_PARTIAL_VALUES_OK: no se inventan ceros ni conexiones sobre valores faltantes");
