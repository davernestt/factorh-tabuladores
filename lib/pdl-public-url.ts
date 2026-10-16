/**
 * URL estable de invitados PDL: alias de rama desplegada en Vercel.
 * IMPORTANTE: esta dirección fue comprobada con la versión en la que
 * Casos de Liderazgo sólo muestra preguntas abiertas al participante.
 *
 * Cuando se conecte un dominio propio, sustituir sólo el origen aquí;
 * conservar los tokens existentes de /e/ y /p/ para no reiniciar procesos.
 */
export const PUBLIC_PDL_ORIGIN =
  "https://factorh-evaluaciones-git-nom035-v1-davidcarrillorh-5996.vercel.app";

export function buildPdlPublicUrl(path:string){
  if(!/^\/(e|p)\/[a-zA-Z0-9_-]+$/.test(path))
    throw new Error("La ruta pública PDL no es válida.");
  return `${PUBLIC_PDL_ORIGIN}${path}`;
}
