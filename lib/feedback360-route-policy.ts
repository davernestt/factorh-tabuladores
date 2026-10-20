/** Pure routing rules: entitlement and tenant checks still belong to server handlers. */
const public360TokenPath = /^\/(?:360|api\/360)\/[A-Za-z0-9_-]{40,60}\/?$/;

export function isPublic360Path(pathname: string): boolean {
  return public360TokenPath.test(pathname);
}

const clientPaths = [
  "/protected/catalogo",
  "/protected/solicitar-usuarios",
  "/protected/estudios",
  "/protected/psicometrias",
  "/protected/360",
  "/protected/nom035",
];

function withinPath(pathname: string, allowedPath: string): boolean {
  return pathname === allowedPath || pathname.startsWith(allowedPath + "/");
}

export function isAllowedClientPath(pathname: string): boolean {
  return clientPaths.some((path) => withinPath(pathname, path));
}

export function isAllowedStaffPath(pathname: string, role: string): boolean {
  const paths = role === "ese_operator"
    ? ["/protected/mi-acceso", "/protected/estudios/tareas"]
    : ["/protected/mi-acceso"];
  return paths.some((path) => withinPath(pathname, path));
}
