import {createHash,createHmac} from "node:crypto";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const validRiskId=(id:string)=>uuid.test(id);
export function nom035RiskToken(inviteId:string){
 if(!uuid.test(inviteId))throw Error("Identificador inválido");
 const key=process.env.NOM035_INVITE_SIGNING_KEY||
   process.env.C3_INVITE_SIGNING_KEY||process.env.SUPABASE_SECRET_KEY;
 if(!key||key.length<24)throw Error("Falta clave privada de invitaciones NOM-035.");
 return createHmac("sha256",key).update("factorh:nom035:guide-risk:v1:"+inviteId.toLowerCase()).digest("base64url");
}
export function nom035RiskHash(token:string){return createHash("sha256").update(token).digest("hex")}
export function nom035RiskSameOrigin(request:Request){
 const origin=request.headers.get("origin");
 if(!origin)return true;
 try{return new URL(origin).host===new URL(request.url).host}catch{return false}
}
