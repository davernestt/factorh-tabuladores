import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentAppUser } from "@/lib/app-auth";

export default function Page(){
 return <Suspense fallback={
  <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
   <p className="text-sm text-neutral-500">Preparando acceso a FactoRH...</p>
  </div>
 }>
  <LoginWithSession/>
 </Suspense>;
}
async function LoginWithSession(){
 const user=await getCurrentAppUser();
 if(user?.role==="super_admin")redirect("/protected/evaluaciones");
 if(user?.role==="client")redirect("/protected/catalogo");
 if(user?.role==="ese_operator")redirect("/protected/estudios/tareas");
 if(user&&["commercial","recruiter","consultant"].includes(user.role))redirect("/protected/mi-acceso");
 return <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
  <div className="w-full max-w-sm"><LoginForm/></div>
 </div>;
}
