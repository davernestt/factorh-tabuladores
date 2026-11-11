import {createHmac,createHash} from "node:crypto";

// Generate a unique, reproducible secret access code without storing plaintext links.
// Namespace separation avoids reusing the application's key directly as a survey code.
export function deriveC3InvitationToken(inviteId:string){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inviteId))throw Error("Identificador inválido");
 const key=process.env.C3_INVITE_SIGNING_KEY || process.env.SUPABASE_SECRET_KEY;
 if(!key || key.length<24)throw Error("La llave segura de invitaciones no está configurada.");
 return createHmac("sha256",key).update("factorh:c3:invite:v2:"+inviteId.toLowerCase()).digest("base64url");
}
export function c3TokenHash(token:string){
 return createHash("sha256").update(token).digest("hex");
}
export function isC3SameOrigin(request:Request){
 const origin=request.headers.get("origin");
 if(!origin)return true;
 try{return new URL(origin).host===new URL(request.url).host;}catch{return false;}
}
