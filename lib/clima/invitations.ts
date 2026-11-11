import {createHmac,createHash} from "node:crypto";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isClimaUuid(id:string){return UUID.test(id)}
export function climaInviteToken(id:string){
 if(!UUID.test(id))throw Error("Identificador inválido");
 const key=process.env.C3_INVITE_SIGNING_KEY||process.env.SUPABASE_SECRET_KEY;
 if(!key||key.length<24)throw Error("Falta configurar la clave segura para invitaciones.");
 return createHmac("sha256",key).update("factorh:clima-modular:invite:v1:"+id.toLowerCase()).digest("base64url");
}
export function climaHash(token:string){return createHash("sha256").update(token).digest("hex")}
export function climaSameOrigin(req:Request){
 const origin=req.headers.get("origin");
 if(!origin)return true;
 try{return new URL(origin).host===new URL(req.url).host}catch{return false}
}
