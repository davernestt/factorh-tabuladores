import {createHmac,createHash} from "node:crypto";
export function pulseToken(id:string){
 const key=process.env.C3_INVITE_SIGNING_KEY||process.env.SUPABASE_SECRET_KEY;
 if(!key||key.length<24)throw Error("Falta clave de invitaciones.");
 return createHmac("sha256",key).update("factorh:pulse:invite:v1:"+id.toLowerCase()).digest("base64url");
}
export function pulseHash(token:string){return createHash("sha256").update(token).digest("hex")}
export function pulseSameOrigin(request:Request){
 const origin=request.headers.get("origin");
 if(!origin)return true;
 try{return new URL(origin).host===new URL(request.url).host}catch{return false}
}
