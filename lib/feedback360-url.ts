/** URL canónica y estable para invitados del 360°. */
export const PUBLIC_360_ORIGIN = "https://factorh-evaluaciones-git-nom035-v1-davidcarrillorh-5996.vercel.app";
export function build360Url(token:string){return `${PUBLIC_360_ORIGIN}/360/${token}`;}
