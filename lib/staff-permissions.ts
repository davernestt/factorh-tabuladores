import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {getCurrentAppUser,type CurrentAppUser} from "@/lib/app-auth";

/** Internal access: opt-in, denied unless the profile has been validated AND activated. */
export const operationModules=["psychometrics","feedback360","pdl","nom035","climate","studies","candidates"] as const;
export type OperationModule=typeof operationModules[number];
export type OperationPermission="view"|"operate"|"reports";
export const operationLabels:Record<OperationModule,string>={
 psychometrics:"Psicometrías",feedback360:"Evaluación 360°",pdl:"PDL",
 nom035:"NOM-035",climate:"Clima Laboral",studies:"Estudios Socioeconómicos",candidates:"Candidatos"
};
export type StaffGrant={module_key:OperationModule;can_view:boolean;can_operate:boolean;can_reports:boolean};
export type CoordinatorAccess={staged:boolean;activated:boolean;validated:boolean;grants:StaffGrant[]};
const operationalRoles=new Set(["commercial","recruiter","ese_operator","consultant"]);
export async function getCoordinatorAccess(user:CurrentAppUser|null):Promise<CoordinatorAccess>{
 const empty={staged:false,activated:false,validated:false,grants:[] as StaffGrant[]};
 if(!user||!user.active||!operationalRoles.has(user.role)||!user.organizationId)return empty;
 const db=createAdminClient();
 const {data:org,error:orgError}=await db.from("organizations").select("slug,active").eq("id",user.organizationId).maybeSingle();
 if(orgError||org?.slug!=="factorh"||!org.active)return empty;
 const {data:profile,error:profileError}=await db.from("staff_access_profiles")
  .select("activated,validated_at").eq("user_id",user.userId).maybeSingle();
 if(profileError||!profile)return empty;
 const {data:grants,error:grantsError}=await db.from("staff_module_grants")
  .select("module_key,can_view,can_operate,can_reports").eq("user_id",user.userId);
 if(grantsError)return empty;
 return {staged:true,activated:profile.activated===true&&!!profile.validated_at,validated:!!profile.validated_at,
  grants:(grants??[]).filter(g=>operationModules.some(m=>m===g.module_key)) as StaffGrant[]};
}
export async function hasStaffPermission(user:CurrentAppUser|null,module:OperationModule,action:OperationPermission){
 if(user?.role==="super_admin")return true;
 const access=await getCoordinatorAccess(user);
 if(!access.activated)return false;
 const item=access.grants.find(g=>g.module_key===module);
 return Boolean(item?.[action==="view"?"can_view":action==="operate"?"can_operate":"can_reports"]);
}
export async function currentStaffPermission(module:OperationModule,action:OperationPermission){
 const user=await getCurrentAppUser();
 return {user,allowed:await hasStaffPermission(user,module,action)};
}
