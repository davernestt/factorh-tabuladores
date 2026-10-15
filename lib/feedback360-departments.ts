import type {DimensionScore} from "./feedback360";
export type Scoped360Cycle={cycle:{id:string;person_id:string;department_id:string|null};summary:{dimensions:DimensionScore[]}};
export const MIN_360_DEPARTMENT_PEOPLE=3;
/** Recibe ciclos ordenados de antiguo a reciente; prevalece la evaluación cerrada más reciente por persona. */
export function latest360PerPerson<T extends Scoped360Cycle>(entries:T[]):T[]{
 const byPerson=new Map<string,T>();
 for(const entry of entries)byPerson.set(entry.cycle.person_id,entry);
 return [...byPerson.values()];
}
/** Sólo publicar métricas del departamento cuando tres personas distintas aportan valoraciones externas. */
export function publishable360People<T extends Scoped360Cycle>(entries:T[]):T[]{
 return latest360PerPerson(entries).filter(entry=>entry.summary.dimensions.some(d=>
  d.scores.manager!==undefined||d.scores.peer!==undefined||d.scores.report!==undefined));
}
export function canPublish360Department<T extends Scoped360Cycle>(entries:T[]):boolean{
 return publishable360People(entries).length>=MIN_360_DEPARTMENT_PEOPLE;
}
