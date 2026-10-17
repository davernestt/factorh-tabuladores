import type {ReactNode} from "react";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
export default async function PsychometricAccessLayout({children}:{children:ReactNode}){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role==="super_admin")return <>{children}</>;
 if(user.role==="client"&&user.clientAccessLevel==="administrator")return <>{children}</>;
 redirect(user.role==="client"?"/protected/catalogo":"/protected/mi-acceso");
}
