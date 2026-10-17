import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";

/** No basta ocultar módulos: bloquear también las URLs directas. */
export default async function AdminOnlyLayout({children}:{children:ReactNode}){
  const user=await getCurrentAppUser();
  if(!user)redirect("/auth/login");
  if(user.role!=="super_admin")redirect(user.role==="client"?"/protected/catalogo":"/protected/mi-acceso");
  return <>{children}</>;
}
