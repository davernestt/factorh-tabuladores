import {NextRequest,NextResponse} from "next/server";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {calculateQuote,type QuoteRequestItem} from "@/lib/company-commercial-pricing";
type Context={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function POST(req:NextRequest,{params}:Context){
 const user=await getCurrentAppUser();
 if(!user||user.role!=="super_admin")return fail("No autorizado.",403);
 const origin=req.headers.get("origin");
 if(origin&&origin!==req.nextUrl.origin)return fail("Origen no autorizado.",403);
 const size=Number(req.headers.get("content-length")||0);
 if(size>10000)return fail("Solicitud demasiado extensa.",413);
 const {id}=await params;
 if(!uuid.test(id))return fail("Empresa inválida.");
 let input:{items?:QuoteRequestItem[];applyPromo?:boolean;notes?:string;expiresOn?:string};
 try{input=await req.json()}catch{return fail("Datos inválidos.");}
 const notes=typeof input.notes==="string"?input.notes.trim():"";
 if(notes.length>1500)return fail("Notas demasiado largas.");
 const date=new Date().toISOString().slice(0,10);
 let quote:ReturnType<typeof calculateQuote>;
 try{quote=calculateQuote(input.items||[],input.applyPromo===true,date);}
 catch(e){return fail(e instanceof Error?e.message:"No se pudo calcular la cotización.");}
 const expiresOn=typeof input.expiresOn==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn)?input.expiresOn:null;
 if(expiresOn&&expiresOn<date)return fail("La fecha de vencimiento no puede ser anterior a hoy.");
 const db=createAdminClient();
 const {data:company,error:companyError}=await db.from("organizations").select("id")
  .eq("id",id).maybeSingle();
 if(companyError)return fail("Error consultando la empresa.",500);
 if(!company)return fail("Empresa no encontrada.",404);
 const {data,error}=await db.from("company_commercial_quotes").insert({
  organization_id:id,created_by:user.userId,status:"draft",
  items:quote.items,subtotal:quote.subtotal,discount_amount:quote.discount,
  total_amount:quote.total,promo_50:quote.promo50,
  expires_on:expiresOn,notes:notes||null
 }).select("id,created_at,total_amount").single();
 if(error)return fail("No se pudo guardar la cotización.",500);
 return NextResponse.json({ok:true,quote:data},{status:201,headers:{"Cache-Control":"no-store"}});
}
