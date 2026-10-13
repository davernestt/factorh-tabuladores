import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/app-auth";

/** No basta ocultar módulos: bloquear también las URLs directas. */
export default async function AdminOnlyLayout({children}:{children:ReactNode}){
  const user=await getCurrentAppUser();
  if(!user)redirect("/auth/login");
  if(user.role==="client")redirect("/protected/catalogo");
  return <>{children}</>;
}
