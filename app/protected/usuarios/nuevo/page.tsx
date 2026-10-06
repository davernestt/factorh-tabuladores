import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/auth/app-user";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const roleLabels: Record<string, string> = {
  super_admin: "Administrador FactoRH",
  commercial: "Comercial",
  recruiter: "Reclutador",
  ese_operator: "Operación ESE",
  consultant: "Consultor",
  client: "Cliente",
};

async function createUser(formData: FormData) {
  "use server";

  const current = await getCurrentAppUser();
  if (!current || current.role !== "super_admin") {
    throw new Error("No autorizado.");
  }

  const displayName = String(formData.get("display_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "");
  const organizationId = String(formData.get("organization_id") || "").trim();
  const active = String(formData.get("active") || "") === "true";

  if (!displayName || !email || !password || !Object.keys(roleLabels).includes(role)) {
    throw new Error("Completa nombre, correo, contraseña y tipo de usuario.");
  }

  if (password.length < 8) {
    throw new Error("La contraseña temporal debe tener al menos 8 caracteres.");
  }

  if (role === "client" && !organizationId) {
    throw new Error("Un usuario Cliente debe estar ligado a una empresa.");
  }

  const db = createAdminClient();

  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: displayName,
    },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || "No fue posible crear el usuario.");
  }

  const { error: profileError } = await db.from("app_users").insert({
    user_id: authData.user.id,
    email,
    display_name: displayName,
    role,
    organization_id: role === "client" ? organizationId : organizationId || null,
    active,
  });

  if (profileError) {
    await db.auth.admin.deleteUser(authData.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/protected/usuarios");
  redirect("/protected/usuarios?created=1");
}

export default async function NewUserPage() {
  const current = await getCurrentAppUser();

  if (!current || current.role !== "super_admin") {
    redirect("/auth/login?error=unauthorized");
  }

  const db = createAdminClient();
  const { data: organizations } = await db
    .from("organizations")
    .select("id,name")
    .order("name");

  return (
    <div>
      <Link
        href="/protected/usuarios"
        className="text-sm font-bold text-orange-600 hover:text-orange-700"
      >
        ← Volver a Usuarios
      </Link>

      <div className="mt-5">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          Seguridad y acceso
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          Crear usuario
        </h1>
        <p className="mt-2 max-w-3xl text-neutral-600">
          Crea la cuenta de acceso y define desde el inicio qué tipo de usuario será.
        </p>
      </div>

      <form
        action={createUser}
        className="mt-7 max-w-3xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nombre completo *" name="display_name" />
          <Field label="Correo *" name="email" type="email" />
          <Field
            label="Contraseña temporal *"
            name="password"
            type="password"
            minLength={8}
            help="Mínimo 8 caracteres. Compártela de forma segura con el usuario."
          />

          <label className="grid gap-2 text-sm font-semibold text-neutral-700">
            Tipo de usuario *
            <select
              name="role"
              defaultValue="recruiter"
              className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-neutral-700 md:col-span-2">
            Empresa / alcance
            <select
              name="organization_id"
              defaultValue=""
              className="rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal outline-none focus:border-orange-500"
            >
              <option value="">Todas / usuario interno</option>
              {(organizations ?? []).map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal leading-5 text-neutral-500">
              Para un usuario tipo Cliente, selecciona obligatoriamente la empresa que podrá consultar.
            </span>
          </label>
        </div>

        <label className="mt-5 flex items-center gap-3 rounded-2xl bg-neutral-50 p-4 text-sm font-semibold text-neutral-700">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked
            className="h-4 w-4 accent-orange-500"
          />
          Crear con acceso activo
        </label>

        <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <div className="text-sm font-black text-neutral-900">Permisos por tipo</div>
          <div className="mt-2 grid gap-1 text-xs leading-5 text-neutral-600">
            <div><strong>Administrador:</strong> acceso integral y gestión de usuarios.</div>
            <div><strong>Comercial:</strong> CRM, prospectos, clientes y cotizaciones.</div>
            <div><strong>Reclutador:</strong> candidatos, evaluaciones y procesos de selección.</div>
            <div><strong>Operación ESE:</strong> estudios e investigaciones.</div>
            <div><strong>Consultor:</strong> proyectos y entregables de consultoría.</div>
            <div><strong>Cliente:</strong> reservado para el futuro portal externo de cliente.</div>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <Link
            href="/protected/usuarios"
            className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            Crear usuario
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  minLength,
  help,
}: {
  label: string;
  name: string;
  type?: string;
  minLength?: number;
  help?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-neutral-700">
      {label}
      <input
        name={name}
        type={type}
        minLength={minLength}
        required
        className="rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500"
      />
      {help && (
        <span className="text-xs font-normal leading-5 text-neutral-500">{help}</span>
      )}
    </label>
  );
}
