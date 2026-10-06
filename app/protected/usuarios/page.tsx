import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/auth/app-user";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const roleLabels: Record<string,string> = {
  super_admin: "Administrador FactoRH",
  commercial: "Comercial",
  recruiter: "Reclutador",
  ese_operator: "Operación ESE",
  consultant: "Consultor",
  client: "Cliente",
};

async function saveUserRole(formData: FormData) {
  "use server";

  const current = await getCurrentAppUser();
  if (!current || current.role !== "super_admin") {
    throw new Error("No autorizado.");
  }

  const userId = String(formData.get("user_id") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") || "").trim();
  const role = String(formData.get("role") || "");
  const organizationId = String(formData.get("organization_id") || "").trim();
  const active = String(formData.get("active") || "") === "true";

  if (!userId || !email || !Object.keys(roleLabels).includes(role)) {
    throw new Error("Datos de usuario inválidos.");
  }

  if (role === "client" && !organizationId) {
    throw new Error("Los usuarios Cliente deben estar ligados a una empresa.");
  }

  const db = createAdminClient();

  const { error } = await db.from("app_users").upsert(
    {
      user_id: userId,
      email,
      display_name: displayName || null,
      role,
      organization_id: role === "client" ? organizationId : organizationId || null,
      active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/protected/usuarios");
}

export default async function UsersPage() {
  const current = await getCurrentAppUser();

  if (!current || current.role !== "super_admin") {
    redirect("/auth/login?error=unauthorized");
  }

  const db = createAdminClient();

  const [usersResult, profilesResult, organizationsResult] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 100 }),
    db
      .from("app_users")
      .select("user_id,email,display_name,role,organization_id,active,updated_at"),
    db.from("organizations").select("id,name").order("name"),
  ]);

  if (usersResult.error) {
    throw new Error(usersResult.error.message);
  }

  const profiles = new Map(
    (profilesResult.data ?? []).map((item) => [item.user_id, item]),
  );
  const organizations = organizationsResult.data ?? [];
  const authUsers = usersResult.data.users ?? [];

  return (
    <div>
      <Link
        href="/protected/dashboard"
        className="text-sm font-bold text-orange-600 hover:text-orange-700"
      >
        ← Volver al Dashboard
      </Link>

      <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Seguridad y acceso
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
            Usuarios y Roles
          </h1>
          <p className="mt-2 max-w-3xl text-neutral-600">
            Crea usuarios, asigna su tipo de acceso y administra sus permisos dentro
            de FactoRH.
          </p>
        </div>

        <Link
          href="/protected/usuarios/nuevo"
          className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          + Crear usuario
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(roleLabels).map(([role,label]) => {
          const count = Array.from(profiles.values()).filter(
            (item) => item.role === role && item.active,
          ).length;
          return (
            <div key={role} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
                {label}
              </div>
              <div className="mt-3 text-3xl font-black text-neutral-900">{count}</div>
              <div className="mt-1 text-sm text-neutral-500">usuarios activos</div>
            </div>
          );
        })}
      </div>

      <section className="mt-7 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-5">
          <h2 className="font-black text-neutral-900">Cuentas autenticadas</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Administra usuarios existentes, cambia su tipo de acceso, empresa
            asociada o activa/desactiva su cuenta.
          </p>
        </div>

        {authUsers.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            No se encontraron cuentas autenticadas.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {authUsers.map((user) => {
              const profile = profiles.get(user.id);
              const name =
                profile?.display_name ||
                String(user.user_metadata?.full_name || user.user_metadata?.name || "");

              return (
                <form
                  key={user.id}
                  action={saveUserRole}
                  className="grid gap-4 p-6 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-end"
                >
                  <input type="hidden" name="user_id" value={user.id} />
                  <input type="hidden" name="email" value={user.email ?? ""} />

                  <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                    Usuario
                    <div className="rounded-xl bg-neutral-50 px-4 py-3">
                      <div className="font-black text-neutral-900">
                        {user.email || "Sin correo"}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        Último acceso: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("es-MX") : "Sin acceso"}
                      </div>
                    </div>
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                    Nombre
                    <input
                      name="display_name"
                      defaultValue={name}
                      className="rounded-xl border border-neutral-300 px-4 py-3 font-normal"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                    Rol
                    <select
                      name="role"
                      defaultValue={profile?.role ?? "recruiter"}
                      className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal"
                    >
                      {Object.entries(roleLabels).map(([value,label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-2">
                    <label className="grid gap-2 text-sm font-semibold text-neutral-700">
                      Empresa / alcance
                      <select
                        name="organization_id"
                        defaultValue={profile?.organization_id ?? ""}
                        className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal"
                      >
                        <option value="">Todas / interno</option>
                        {organizations.map((organization) => (
                          <option key={organization.id} value={organization.id}>
                            {organization.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
                      <input
                        type="checkbox"
                        name="active"
                        value="true"
                        defaultChecked={profile?.active ?? true}
                        className="h-4 w-4 accent-orange-500"
                      />
                      Acceso activo
                    </label>
                  </div>

                  <button className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-900">
                    Guardar
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-7 rounded-3xl bg-neutral-800 p-6 text-white shadow-sm">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
          Roles disponibles
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <RoleCard title="Administrador FactoRH" text="Acceso integral a todos los módulos, usuarios y configuración." />
          <RoleCard title="Comercial" text="CRM, prospectos, clientes y cotizaciones." />
          <RoleCard title="Reclutador" text="Vacantes, candidatos y evaluaciones de selección." />
          <RoleCard title="Operación ESE" text="Casos y seguimiento de estudios socioeconómicos." />
          <RoleCard title="Consultor" text="Proyectos de consultoría y evaluaciones relacionadas." />
          <RoleCard title="Cliente" text="Preparado para el futuro Portal del Cliente; actualmente el acceso interno permanece bloqueado." />
        </div>
      </section>
    </div>
  );
}

function RoleCard({title,text}:{title:string;text:string}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <div className="font-black text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-neutral-300">{text}</div>
    </div>
  );
}
