import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { authorized360User } from "@/lib/feedback360-access";

/** No basta ocultar módulos: bloquear también las URLs directas. */
export default async function AdminOnlyLayout({children}:{children:ReactNode}){
  const user=await authorized360User();
  if(!user)redirect("/auth/login");
  
  return <>{children}</>;
}
