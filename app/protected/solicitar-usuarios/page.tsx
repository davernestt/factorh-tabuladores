import {redirect} from "next/navigation";
import {getCurrentAppUser} from "@/lib/app-auth";
import RequestUserForm from "./request-form";
export default async function UserRequestPage(){
 const user=await getCurrentAppUser();
 if(!user)redirect("/auth/login");
 if(user.role!=="client")redirect("/protected/mi-acceso");
 return <div className="mx-auto max-w-2xl"><RequestUserForm/></div>;
}
