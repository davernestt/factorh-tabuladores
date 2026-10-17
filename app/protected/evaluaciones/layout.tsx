import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";

/** No basta ocultar módulos: bloquear también las URLs directas. */
export default async function AdminOnlyLayout({children}:{children:ReactNode}){
  const user=await getCurrentAppUser();
  if(!user)redirect("/auth/login");
  if(user.role!=="super_admin"&&!await hasStaffPermission(user,"pdl","view"))redirect(user.role==="client"?"/protected/catalogo":"/protected/mi-acceso");
  return <>{children}</>;
}
