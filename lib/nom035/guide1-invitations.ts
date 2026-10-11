import {createHmac,createHash} from "node:crypto";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isGuide1Uuid=(value:string)=>UUID.test(value);
export function guide1Token(id:string){
 if(!UUID.test(id))throw Error("Invitación inválida");
 const secret=process.env.NOM035_INVITE_SIGNING_KEY||
  process.env.C3_INVITE_SIGNING_KEY||process.env.SUPABASE_SECRET_KEY;
 if(!secret||secret.length<24)throw Error("Falta la clave del sistema de invitaciones.");
 return createHmac("sha256",secret)
  .update("factorh:nom035:guide1:private-invite:v1:"+id.toLowerCase())
  .digest("base64url");
}
export function guide1TokenHash(token:string){
 return createHash("sha256").update(token).digest("hex");
}
export function guide1SameOrigin(request:Request){
 const origin=request.headers.get("origin");
 if(!origin)return true;
 try{return new URL(origin).host===new URL(request.url).host}catch{return false}
}
