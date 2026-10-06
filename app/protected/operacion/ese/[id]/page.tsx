import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const statusLabels:Record<string,string> = {
  requested:"Solicitado",
  scheduled:"Programado",
  fieldwork:"Visita / campo",
  verification:"Verificación",
  report:"Reporte",
  delivered:"Entregado",
  cancelled:"Cancelado",
};

const resultLabels:Record<string,string> = {
  recommended:"Recomendable",
  with_reservations:"Con Reservas",
  not_recommended:"No Recomendable",
};

async function requireUser() {
  const authClient=await createClient();
  const {data,error}=await authClient.auth.getClaims();
  if(error||!data?.claims) redirect("/auth/login");
}

async function addCase(formData:FormData) {
  "use server";
  await requireUser();

  const serviceOrderId=String(formData.get("service_order_id")||"");
  const organizationId=String(formData.get("organization_id")||"");
  const firstName=String(formData.get("first_name")||"").trim();
  const lastName=String(formData.get("last_name")||"").trim();
  const email=String(formData.get("email")||"").trim();
  const phone=String(formData.get("phone")||"").trim();
  const dueDate=String(formData.get("due_date")||"").trim();

  if(!serviceOrderId||!organizationId||!firstName) throw new Error("Nombre requerido.");

  const db=createAdminClient();
  const {data:person,error:personError}=await db.from("people").insert({
    organization_id:organizationId,
    first_name:firstName,
    last_name:lastName||null,
    email:email||null,
    phone:phone||null,
    active:true,
  }).select("id").single();

  if(personError||!person) throw new Error(personError?.message||"No fue posible crear persona.");

  const caseName=[firstName,lastName].filter(Boolean).join(" ");
  const {error}=await db.from("ese_cases").insert({
    service_order_id:serviceOrderId,
    organization_id:organizationId,
    person_id:person.id,
    case_name:caseName,
    due_date:dueDate||null,
    status:"requested",
  });
  if(error) throw new Error(error.message);
  revalidatePath(`/protected/operacion/ese/${serviceOrderId}`);
}

async function updateCase(formData:FormData) {
  "use server";
  await requireUser();
  const id=String(formData.get("case_id")||"");
  const serviceOrderId=String(formData.get("service_order_id")||"");
  const status=String(formData.get("status")||"requested");
  const result=String(formData.get("result")||"");
  const dueDate=String(formData.get("due_date")||"").trim();
  const reportUrl=String(formData.get("report_url")||"").trim();
  const notes=String(formData.get("notes")||"").trim();

  const db=createAdminClient();
  const {error}=await db.from("ese_cases").update({
    status,
    result:result||null,
    due_date:dueDate||null,
    report_url:reportUrl||null,
    notes:notes||null,
    updated_at:new Date().toISOString(),
  }).eq("id",id);
  if(error) throw new Error(error.message);
  revalidatePath(`/protected/operacion/ese/${serviceOrderId}`);
}

export default async function EsePage({params}:{params:Promise<{id:string}>}) {
  await requireUser();
  const {id}=await params;
  const db=createAdminClient();

  const {data:order,error}=await db.from("service_orders")
    .select("id,organization_id,order_number,title")
    .eq("id",id).eq("service_type","ese").single();
  if(error||!order) notFound();

  const [orgResult,casesResult]=await Promise.all([
    db.from("organizations").select("name").eq("id",order.organization_id).single(),
    db.from("ese_cases")
      .select("id,person_id,case_name,status,result,due_date,report_url,notes,created_at")
      .eq("service_order_id",id)
      .order("created_at",{ascending:false}),
  ]);

  const cases=casesResult.data ?? [];
  const personIds=cases.map(x=>x.person_id).filter(Boolean) as string[];
  const {data:people}=personIds.length
    ? await db.from("people").select("id,email,phone").in("id",personIds)
    : {data:[] as any[]};
  const peopleMap=new Map((people??[]).map(p=>[p.id,p]));

  return (
    <div>
      <Link href={`/protected/operacion/${order.id}`} className="text-sm font-bold text-orange-600">← Volver a la orden</Link>
      <div className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
        Estudios Socioeconómicos · {orgResult.data?.name ?? "Cliente"}
      </div>
      <h1 className="mt-2 text-3xl font-black text-neutral-900">{order.order_number}</h1>
      <p className="mt-2 text-neutral-600">Administra aquí cada persona a investigar.</p>

      <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-black text-neutral-900">Agregar estudio</h2>
        <form action={addCase} className="mt-5 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="service_order_id" value={order.id}/>
          <input type="hidden" name="organization_id" value={order.organization_id}/>
          <Field label="Nombre *" name="first_name"/>
          <Field label="Apellidos" name="last_name"/>
          <Field label="Correo" name="email" type="email"/>
          <Field label="Teléfono" name="phone"/>
          <Field label="Fecha compromiso" name="due_date" type="date"/>
          <div className="flex items-end">
            <button className="w-full rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white">Agregar estudio</button>
          </div>
        </form>
      </section>

      <div className="mt-6 grid gap-4">
        {cases.length===0 ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center text-neutral-500">Sin estudios registrados.</div>
        ) : cases.map(item=>{
          const person=item.person_id ? peopleMap.get(item.person_id) : null;
          return (
            <section key={item.id} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-black text-neutral-900">{item.case_name}</h2>
                  <div className="mt-1 text-sm text-neutral-500">{person?.email || person?.phone || "Sin contacto"}</div>
                </div>
                <div className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-700">{statusLabels[item.status]??item.status}</div>
              </div>

              <form action={updateCase} className="mt-5 grid gap-4 md:grid-cols-2">
                <input type="hidden" name="case_id" value={item.id}/>
                <input type="hidden" name="service_order_id" value={order.id}/>
                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Estatus
                  <select name="status" defaultValue={item.status} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal">
                    {Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                  Resultado
                  <select name="result" defaultValue={item.result ?? ""} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal">
                    <option value="">Pendiente</option>
                    {Object.entries(resultLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <Field label="Fecha compromiso" name="due_date" type="date" defaultValue={item.due_date ?? ""}/>
                <Field label="Liga de reporte" name="report_url" defaultValue={item.report_url ?? ""}/>
                <label className="grid gap-2 text-sm font-semibold text-neutral-700 md:col-span-2">
                  Notas
                  <textarea name="notes" rows={3} defaultValue={item.notes ?? ""} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"/>
                </label>
                <div className="md:col-span-2 flex justify-end">
                  <button className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white">Guardar estudio</button>
                </div>
              </form>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Field({label,name,type="text",defaultValue=""}:{label:string;name:string;type?:string;defaultValue?:string}) {
  return <label className="grid gap-2 text-sm font-semibold text-neutral-700">{label}<input name={name} type={type} defaultValue={defaultValue} className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"/></label>
}
