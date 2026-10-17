import { NextRequest, NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/app-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enlace de recuperación de un solo uso.
 * Jamás consultar, almacenar ni compartir contraseñas.
 */
export async function POST(request: NextRequest, { params }: Context) {
  const actor=await getCurrentAppUser();
  if(!actor||actor.role!=="super_admin")
    return NextResponse.json({error:"Acceso exclusivo de administración FactoRH."},{status:403});

  const {id}=await params;
  if(!uuid.test(id))return NextResponse.json({error:"Usuario inválido."},{status:400});
  const db=createAdminClient();
  const {data:user,error}=await db.from("app_users")
    .select("user_id,role,email,active").eq("user_id",id).maybeSingle();
  if(error||!user||user.role==="super_admin")
    return NextResponse.json({error:"No se encontró una cuenta autorizada."},{status:404});
  if(!user.active)
    return NextResponse.json({error:"Activa primero el usuario si necesitas restablecer su acceso."},{status:400});

  const {data,error:linkError}=await db.auth.admin.generateLink({
    type:"recovery",email:user.email
  });
  const hash=data?.properties?.hashed_token;
  if(linkError||!hash)
    return NextResponse.json({error:"No fue posible generar el enlace de recuperación."},{status:500});

  const url=`${request.nextUrl.origin}/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=recovery&next=${encodeURIComponent("/auth/update-password")}`;
  return NextResponse.json(
    {ok:true,email:user.email,recovery_url:url,notice:"El enlace es sensible y debe enviarse sólo al titular de la cuenta; no se conserva en la plataforma."},
    {headers:{"Cache-Control":"no-store"}}
  );
}
