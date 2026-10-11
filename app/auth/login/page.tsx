import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentAppUser } from "@/lib/app-auth";

export default async function Page() {
  const user = await getCurrentAppUser();
  if (user?.role === "super_admin") redirect("/protected/evaluaciones");
  if (user?.role === "client") redirect("/protected/psicometrias");

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
