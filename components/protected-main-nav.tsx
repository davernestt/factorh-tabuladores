"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  canEvaluations: boolean;
  canStudies: boolean;
  canCommercial: boolean;
  canCandidates: boolean;
  canCompanies: boolean;
  isAdmin: boolean;
};

type MenuName = "evaluations" | "studies" | null;

export function ProtectedMainNav({
  canEvaluations,
  canStudies,
  canCommercial,
  canCandidates,
  canCompanies,
  isAdmin,
}: Props) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<MenuName>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        navRef.current &&
        event.target instanceof Node &&
        !navRef.current.contains(event.target)
      ) {
        setOpenMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const close = () => setOpenMenu(null);

  return (
    <>
      <div
        ref={navRef}
        className="hidden min-w-0 flex-1 items-center gap-1 lg:flex"
      >
        {canEvaluations && (
          <Dropdown
            label="Evaluaciones"
            open={openMenu === "evaluations"}
            onToggle={() =>
              setOpenMenu((current) =>
                current === "evaluations" ? null : "evaluations",
              )
            }
          >
            <MenuLink
              href="/protected"
              title="PDL"
              description="Programa de Desarrollo de Líderes"
              onNavigate={close}
            />
            <MenuLink
              href="/protected/psicometrias"
              title="Psicometrías"
              description="Pruebas psicométricas y reportes"
              onNavigate={close}
            />
            <MenuLink
              href="/protected/feedback360"
              title="360°"
              description="Evaluación multifuente"
              onNavigate={close}
            />
            <MenuLink
              href="/protected/baterias"
              title="Baterías"
              description="Configuración y agrupación de pruebas"
              onNavigate={close}
            />
          </Dropdown>
        )}

        {canStudies && (
          <Dropdown
            label="Estudios e Investigaciones"
            open={openMenu === "studies"}
            wide
            onToggle={() =>
              setOpenMenu((current) =>
                current === "studies" ? null : "studies",
              )
            }
          >
            <MenuLink
              href="/protected/estudios"
              title="Dashboard de Estudios"
              description="Solicitados, avances, cierres y dictámenes"
              onNavigate={close}
            />
            <MenuLink
              href="/protected/estudios/aplicacion"
              title="Aplicación y captura"
              description="Estudios para levantar desde la plataforma"
              onNavigate={close}
            />
          </Dropdown>
        )}

        {canCommercial && (
          <Nav href="/protected/comercial" onNavigate={close}>
            Comercial
          </Nav>
        )}

        {canCandidates && (
          <Nav href="/protected/candidatos" onNavigate={close}>
            Candidatos
          </Nav>
        )}

        {canCompanies && (
          <Nav href="/protected/empresas" onNavigate={close}>
            Empresas
          </Nav>
        )}

        {isAdmin && (
          <Nav href="/protected/usuarios" onNavigate={close}>
            Usuarios
          </Nav>
        )}
      </div>

      <div className="border-t border-neutral-100 px-4 py-2 lg:hidden">
        <div className="flex flex-wrap gap-2">
          {canEvaluations && (
            <Nav href="/protected" onNavigate={close}>
              Evaluaciones
            </Nav>
          )}
          {canStudies && (
            <Nav href="/protected/estudios" onNavigate={close}>
              Estudios
            </Nav>
          )}
          {canCommercial && (
            <Nav href="/protected/comercial" onNavigate={close}>
              Comercial
            </Nav>
          )}
          {canCandidates && (
            <Nav href="/protected/candidatos" onNavigate={close}>
              Candidatos
            </Nav>
          )}
          {canCompanies && (
            <Nav href="/protected/empresas" onNavigate={close}>
              Empresas
            </Nav>
          )}
          {isAdmin && (
            <Nav href="/protected/usuarios" onNavigate={close}>
              Usuarios
            </Nav>
          )}
        </div>
      </div>
    </>
  );
}

function Nav({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-bold text-neutral-700 transition hover:bg-orange-50 hover:text-orange-700"
    >
      {children}
    </Link>
  );
}

function Dropdown({
  label,
  open,
  wide = false,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  wide?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-bold text-neutral-700 transition hover:bg-orange-50 hover:text-orange-700"
      >
        {label}
        <span
          className={
            open
              ? "rotate-180 text-[10px] text-neutral-400 transition"
              : "text-[10px] text-neutral-400 transition"
          }
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          className={
            wide
              ? "absolute left-0 top-[calc(100%+8px)] z-50 w-[340px] overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl"
              : "absolute left-0 top-[calc(100%+8px)] z-50 w-[300px] overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl"
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  title,
  description,
  onNavigate,
}: {
  href: string;
  title: string;
  description: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block rounded-xl px-4 py-3 transition hover:bg-orange-50"
    >
      <div className="text-sm font-black text-neutral-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-neutral-500">{description}</div>
    </Link>
  );
}
