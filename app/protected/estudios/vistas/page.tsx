import {Suspense} from "react";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import PreviewWorkspace from "./preview-workspace";

type Role="cliente"|"aplicador"|"referencias";
type Props={searchParams:Promise<{perfil?:string}>};

export default function VistasEstudiosPage({searchParams}:Props){
  return <Suspense fallback={<section className="rounded-3xl bg-white p-8 text-sm text-neutral-600">Cargando vistas de demostración...</section>}>
    <VistasContent searchParams={searchParams}/>
  </Suspense>;
}

async function VistasContent({searchParams}:Props){
  const user=await getCurrentAppUser();
  if(!user)redirect("/auth/login");
  if(user.role!=="super_admin")redirect("/protected/estudios");
  const {perfil}=await searchParams;
  const initialRole:Role=perfil==="aplicador"||perfil==="referencias"?perfil:"cliente";
  return <PreviewWorkspace initialRole={initialRole}/>;
}
