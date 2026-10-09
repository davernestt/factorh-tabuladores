import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/app-auth";
import { redirect } from "next/navigation";
import UserManager from "./user-manager";

type Organization = { id: string; name: string; active: boolean };
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
      .select("id,name,active")
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
  const orgById = new Map(organizations.map((item) => [item.id, item]));

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-bold uppercase tracking-[.18em] text-orange-600">
            Administración
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Usuarios
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            Crea accesos para empresas y controla a qué organización pertenece cada cuenta.
          </p>
        </div>
        <UserManager organizations={organizations.filter((item) => item.active)} />
      </div>

      <section className="rounded-3xl border border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-neutral-700">
        Las cuentas de empresa sólo pueden entrar a <strong>Psicometrías</strong> y únicamente
        ven candidatos, procesos y reportes de su propia organización. Los candidatos siguen
        respondiendo por liga pública y no necesitan cuenta.
      </section>

      <div className="grid gap-4">
        {users.map((user) => {
          const organization = user.organization_id
            ? orgById.get(user.organization_id)
            : null;
          return (
            <article
              key={user.user_id}
              className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-neutral-900">
                      {user.display_name || user.email}
                    </h2>
                    <span
                      className={
                        user.active
                          ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                          : "rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-500"
                      }
                    >
                      {user.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-neutral-600">{user.email}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-neutral-100 px-3 py-1 font-bold text-neutral-600">
                      {user.role === "super_admin" ? "Super administrador" : "Usuario de empresa"}
                    </span>
                    {organization && (
                      <span className="rounded-full bg-orange-50 px-3 py-1 font-bold text-orange-700">
                        {organization.name}
                      </span>
                    )}
                  </div>
                </div>

                {user.role === "client" && (
                  <UserManager
                    organizations={organizations.filter((item) => item.active)}
                    user={user}
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
