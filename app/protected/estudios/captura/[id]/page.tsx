import {Suspense} from "react";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {ESE_VISIT_GROUPS,ESE_REFERENCE_GROUPS} from "@/lib/ese/master-schema";
import SectionCapture from "./section-capture";

type Props={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default function StudyCapturePage({params}:Props){
 return <Suspense fallback={<p className="p-6 text-sm">Cargando captura del estudio...</p>}><Content params={params}/></Suspense>;
}
async function Content({params}:Props){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role!=="ese_operator")redirect("/protected/mi-acceso");
 const {id}=await params;if(!uuid.test(id))notFound();
 const db=createAdminClient();
 const {data:study,error}=await db.from("ese_cases").select("id,case_name,is_demo,status,assigned_to,delivery_status")
   .eq("id",id).eq("assigned_to",user.userId).maybeSingle();
 if(error||!study)notFound();
 const enabled=study.is_demo||process.env.FACTORH_ESE_PERSONAL_REQUESTS_ENABLED==="true";
 if(!enabled||["cancelled","delivered","review","report"].includes(study.status)||study.delivery_status==="released")
  return <section className="rounded-2xl bg-white p-7 text-sm text-neutral-700">
   Este expediente no está disponible para captura. Solicita revisión al equipo FactoRH.
  </section>;
 const {data:sections,error:sectionsError}=await db.from("ese_case_sections")
   .select("section_key,data,completed").eq("case_id",id);
 if(sectionsError)return <p className="rounded-xl bg-red-50 p-6 text-red-700">No se pudieron cargar las secciones.</p>;
 const groups=[...ESE_VISIT_GROUPS,...ESE_REFERENCE_GROUPS];
 const saved=(sections||[]).filter(s=>groups.some(g=>g.id===s.section_key))
   .map(s=>({
     section_key:s.section_key,
     data:s.data&&typeof s.data==="object"&&!Array.isArray(s.data)?s.data as Record<string,string>:{},
     completed:Boolean(s.completed)
   }));
 return <div className="space-y-6">
  <Link href="/protected/estudios/tareas" className="text-sm font-bold text-neutral-500">← Mis estudios asignados</Link>
  <header className="rounded-3xl border border-neutral-200 bg-white p-6">
   <p className="text-xs font-bold uppercase text-orange-700">FactoRH · Captura de estudio</p>
   <h1 className="mt-2 text-2xl font-black text-neutral-900">{study.case_name}</h1>
   {study.is_demo&&<p className="mt-3 rounded-xl bg-orange-50 p-3 text-xs text-orange-900">
     Expediente piloto: utiliza únicamente información ficticia. No ingreses datos personales reales.
   </p>}
  </header>
  <SectionCapture caseId={id} groups={groups} initial={saved}/>
 </div>;
}
