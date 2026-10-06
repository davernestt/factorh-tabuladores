"use client";

import { cn } from "@/lib/utils";
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
import { useEffect, useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error === "unauthorized") {
      setMessage("Esta cuenta no tiene autorización para entrar al panel.");
    } else if (error === "invalid_credentials") {
      setMessage("Correo o contraseña incorrectos.");
    } else if (error === "login_failed") {
      setMessage("No fue posible iniciar sesión. Intenta nuevamente.");
    }
  }, []);

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
          <CardTitle className="text-2xl">Acceso administrativo</CardTitle>
          <CardDescription>
            Ingresa con la cuenta autorizada de FactorRH.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/login" method="post">
            <div className="flex flex-col gap-6">
              {message && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {message}
                </p>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="david@factorh.com.mx"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </div>

            <div className="mt-4 text-center text-sm text-neutral-500">
              ¿Primera vez?{" "}
              <Link
                href="/auth/sign-up"
                className="font-semibold text-orange-600 underline-offset-4 hover:underline"
              >
                Crear cuenta administrativa
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
