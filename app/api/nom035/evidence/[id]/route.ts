import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getCurrentAppUser} from "@/lib/app-auth";
import {canNom035Organization,NOM035_UUID,hasNom035Subscription} from "@/lib/nom035/access";

type Props={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Props){
 const {id}=await params;
 const user=await getCurrentAppUser();
 if(!NOM035_UUID.test(id)||!user||!["super_admin","client"].includes(user.role))
  return NextResponse.json({error:"No autorizado"},{status:403});
 if(!await hasNom035Subscription(user))
  return NextResponse.json({error:"Módulo no habilitado"},{status:403});
 const db=createAdminClient();
 const {data:file,error}=await db.from("nom035_evidence_files")
  .select("id,center_id,storage_bucket,storage_path")
  .eq("id",id).maybeSingle();
 if(error||!file)return NextResponse.json({error:"Documento no disponible"},{status:404});
 const {data:center}=await db.from("nom035_work_centers")
  .select("organization_id,active").eq("id",file.center_id).maybeSingle();
 if(!center?.active||!canNom035Organization(user,center.organization_id))
  return NextResponse.json({error:"Sin autorización"},{status:403});
 const signed=await db.storage.from("nom035-evidence")
  .createSignedUrl(file.storage_path,45,{download:false});
 if(signed.error||!signed.data?.signedUrl)
  return NextResponse.json({error:"No pudo abrirse el archivo"},{status:500});
 return NextResponse.redirect(signed.data.signedUrl,302);
}
