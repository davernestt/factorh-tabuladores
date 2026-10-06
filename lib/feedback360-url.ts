export const PUBLIC_360_ORIGIN = "https://factorh-evaluaciones-git-feedback360-v1-davidcarrillorh-5996.vercel.app";
export function build360Url(token:string){
  return `${PUBLIC_360_ORIGIN}/360/${token}`;
}
