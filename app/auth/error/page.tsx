import Link from "next/link";
import FactoRHLogo from "@/components/factorh-logo";

type Params={error?:string;reason?:string};
export default async function AccessErrorPage({searchParams}:{searchParams:Promise<Params>}){
 const params=await searchParams;
 const error=String(params?.error??"");
 const expired=params?.reason==="invalid_link"||/link is invalid|has expired|otp_expired|expired|invalid token/i.test(error);
 return <main className="flex min-h-svh items-center justify-center bg-neutral-50 px-5 py-10">
  <section className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-10">
   <FactoRHLogo className="mx-auto h-14 w-auto" full priority/>
   <div className="mt-8 rounded-2xl bg-orange-50 px-5 py-4">
    <p className="text-xs font-black uppercase tracking-[.18em] text-orange-700">Acceso seguro a FactoRH</p>
    <h1 className="mt-2 text-2xl font-black text-neutral-900">
     {expired?"Este enlace ya no está disponible":"No pudimos validar el enlace"}
    </h1>
    <p className="mt-3 text-sm leading-7 text-neutral-700">
     {expired
      ?"Las ligas para crear o recuperar contraseña son temporales y de un solo uso. Si esta liga ya se abrió o venció, es necesario solicitar otra."
      :"No fue posible verificar la invitación o el acceso desde este enlace. Puedes solicitar una liga nueva sin perder tu cuenta."}
    </p>
   </div>
   <div className="mt-6 space-y-3">
    <Link href="/auth/forgot-password"
      className="block rounded-xl bg-orange-600 px-5 py-3 text-center text-sm font-black text-white hover:bg-orange-700">
      Solicitar una liga nueva
    </Link>
    <Link href="/auth/login"
      className="block rounded-xl border border-neutral-300 px-5 py-3 text-center text-sm font-bold text-neutral-800 hover:bg-neutral-50">
      Ya tengo contraseña · Iniciar sesión
    </Link>
   </div>
   <div className="mt-6 rounded-2xl border border-neutral-200 p-4">
    <p className="text-sm font-bold text-neutral-900">¿Qué hago ahora?</p>
    <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-neutral-600">
     <li>Solicita el enlace con el mismo correo que FactoRH autorizó para tu empresa.</li>
     <li>Abre únicamente el mensaje más reciente y usa su enlace una sola vez.</li>
     <li>Establece tu contraseña y después entra desde el portal de tu empresa.</li>
    </ol>
   </div>
   <p className="mt-6 text-center text-xs leading-6 text-neutral-500">
    Si el problema continúa, solicita a FactoRH que confirme que tu usuario está activo. No compartas enlaces de recuperación ni contraseñas.
   </p>
  </section>
 </main>;
}
