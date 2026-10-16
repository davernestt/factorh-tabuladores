import {createClient} from "@/lib/supabase/server";
import {type EmailOtpType} from "@supabase/supabase-js";
import {redirect} from "next/navigation";
import {type NextRequest} from "next/server";

const permittedTypes=new Set<EmailOtpType>(["invite","recovery","signup","email_change","magiclink"]);

export async function GET(request:NextRequest){
 const {searchParams}=new URL(request.url);
 const tokenHash=searchParams.get("token_hash");
 const type=searchParams.get("type") as EmailOtpType|null;
 const requestedNext=searchParams.get("next")??"";
 // Nunca aceptar direcciones externas como destino de una invitación por correo.
 const next=requestedNext==="/auth/update-password"||requestedNext.startsWith("/auth/update-password?")
  ? requestedNext : "/auth/login";
 if(!tokenHash||!type||!permittedTypes.has(type)){
  redirect("/auth/error?reason=invalid_link");
 }
 const supabase=await createClient();
 const {error}=await supabase.auth.verifyOtp({type,token_hash:tokenHash});
 if(error){
  // No mostrar token o detalles internos en URLs compartidas con clientes.
  redirect("/auth/error?reason=invalid_link");
 }
 redirect(next);
}
