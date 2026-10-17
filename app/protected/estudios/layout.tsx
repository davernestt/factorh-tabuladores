import type {ReactNode} from "react";
import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import {hasStaffPermission} from "@/lib/staff-permissions";
export default async function StudiesRoleLayout({children}:{children:ReactNode}){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role==="super_admin"||user.role==="ese_operator"||await hasStaffPermission(user,"studies","view"))return <>{children}</>;
 if(user.role==="client"&&user.clientAccessLevel==="administrator")return <>{children}</>;
 redirect(user.role==="client"?"/protected/catalogo":"/protected/mi-acceso");
}
