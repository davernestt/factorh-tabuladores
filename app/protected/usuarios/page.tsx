import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";
import { redirect } from "next/navigation";
import UserManager from "./user-manager";
import ClientAccessDirectory from "./client-access-directory";

type Organization = { id: string; name: string; active: boolean; slug: string };
type AppUserRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  organization_id: string | null;
  active: boolean;
  created_at: string;
};

export default async function UsersPage() {
  const currentUser = await getCurrentAppUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    redirect("/protected/psicometrias");
  }

  const db = createAdminClient();
  const [usersR, organizationsR] = await Promise.all([
    db
      .from("app_users")
      .select("user_id,email,display_name,role,organization_id,active,created_at")
      .order("created_at", { ascending: false }),
    db
      .from("organizations")
      .select("id,name,active,slug")
      .order("active", { ascending: false })
      .order("name"),
  ]);

  if (usersR.error || organizationsR.error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-7">
        <h1 className="font-bold text-red-800">No fue posible cargar usuarios</h1>
        <p className="mt-2 text-sm text-red-700">
          {usersR.error?.message ?? organizationsR.error?.message ?? "Error"}
        </p>
      </div>
    );
  }

  const users = (usersR.data ?? []) as AppUserRow[];
  const organizations = (organizationsR.data ?? []) as Organization[];

  return <div className="space-y-7">
    <header className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">FactoRH · Administración</p>
        <h1 className="mt-2 text-3xl font-black text-neutral-900">Usuarios y accesos de clientes</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
          Aquí concentras los correos de acceso, empresas, permisos y recuperación de cuentas.
          Las contraseñas son privadas de sus titulares y no pueden visualizarse.
        </p>
      </div>
      <UserManager organizations={organizations.filter(org=>org.active)}/>
    </header>
    <ClientAccessDirectory users={users} organizations={organizations}/>
  </div>;
}
