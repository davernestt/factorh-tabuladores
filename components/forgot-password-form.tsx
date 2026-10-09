"use client";

import { cn } from "@/lib/utils";
import FactoRHLogo from "@/components/factorh-logo";
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
import { useEffect, useState } from "react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [returnTo, setReturnTo] = useState("/auth/login");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefilledEmail = params.get("email");
    const requestedReturnTo = params.get("return_to");

    if (prefilledEmail) setEmail(prefilledEmail);
    if (
      requestedReturnTo &&
      requestedReturnTo.startsWith("/") &&
      !requestedReturnTo.startsWith("//")
    ) {
      setReturnTo(requestedReturnTo);
    }
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const redirectTo =
        window.location.origin +
        "/auth/update-password?return_to=" +
        encodeURIComponent(returnTo);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Revisa tu correo</CardTitle>
            <CardDescription>Te enviamos las instrucciones para crear o cambiar tu contraseña.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Si el correo está autorizado, recibirás un enlace seguro para establecer una nueva contraseña.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Crear o restablecer contraseña</CardTitle>
            <CardDescription>
              Captura el correo autorizado y te enviaremos un enlace seguro para definir tu contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@empresa.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Enviando..." : "Enviar enlace de acceso"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                ¿Ya tienes contraseña?{" "}
                <Link
                  href={returnTo}
                  className="underline underline-offset-4"
                >
                  Volver al acceso
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
