import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
export default async function UsersPage(){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role!=="super_admin")redirect("/protected/catalogo");
 redirect("/protected/empresas");
}
