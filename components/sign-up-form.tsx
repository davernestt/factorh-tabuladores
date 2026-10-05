"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ALLOWED_ADMIN_EMAIL = "david@factorh.com.mx";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState(ALLOWED_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== ALLOWED_ADMIN_EMAIL) {
      setError("Este correo no está autorizado como administrador.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible crear la cuenta.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="text-center">
        <div className="text-3xl font-black tracking-tight text-neutral-900">
          Factor<span className="text-orange-500">RH</span>
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Administración
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Crear cuenta administrativa</CardTitle>
          <CardDescription>
            Por ahora el acceso está restringido al administrador autorizado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo autorizado</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Repite la contraseña</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  minLength={8}
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              <Link
                href="/auth/login"
                className="font-semibold text-orange-600 underline-offset-4 hover:underline"
              >
                Volver a iniciar sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
