"use client";

import { cn } from "@/lib/utils";
import FactoRHLogo from "@/components/factorh-logo";
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
  const [messageType, setMessageType] = useState<"error" | "success">("error");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const setup = params.get("setup");

    if (setup === "success") {
      setMessageType("success");
      setMessage("Contraseña creada correctamente. Ya puedes iniciar sesión con tu cuenta.");
    } else if (error === "unauthorized") {
      setMessageType("error");
      setMessage("Esta cuenta no tiene autorización activa para entrar a la plataforma.");
    } else if (error === "invalid_credentials") {
      setMessageType("error");
      setMessage("Correo o contraseña incorrectos.");
    } else if (error === "login_failed") {
      setMessageType("error");
      setMessage("No fue posible iniciar sesión. Intenta nuevamente.");
    }
  }, []);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="text-center">
        <FactoRHLogo className="mx-auto h-16 w-auto" full priority />
        <div className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Plataforma de evaluaciones
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Ingresa con tu cuenta autorizada de FactoRH o de tu empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/login" method="post" autoComplete="off">
            <div className="flex flex-col gap-6">
              {message && (
                <p
                  className={
                    messageType === "success"
                      ? "rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700"
                      : "rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  }
                >
                  {message}
                </p>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  autoComplete="off"
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
                  autoComplete="off"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </div>

            <div className="mt-4 text-center text-xs leading-5 text-neutral-500">
              Las cuentas de empresa son creadas e invitadas por FactoRH.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
