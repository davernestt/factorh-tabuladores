/** Generate invitation links without depending on a fixed Vercel preview deployment.
 * Set FACTORH_PUBLIC_ORIGIN to the organization's stable, HTTPS public domain.
 * When absent (e.g. in previews), use the origin of the authenticated request.
 */
export const PUBLIC_360_ORIGIN = process.env.FACTORH_PUBLIC_ORIGIN?.trim() ?? "";

export function build360Url(token: string, requestOrigin?: string): string {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    throw new Error("Invalid 360 invitation token.");
  }

  const configuredOrigin = PUBLIC_360_ORIGIN || requestOrigin?.trim();
  if (!configuredOrigin) {
    throw new Error("A public application origin is required to generate 360 invitations.");
  }

  const url = new URL(configuredOrigin);
  const localhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if ((url.protocol !== "https:" && !(localhost && url.protocol === "http:")) ||
      url.pathname !== "/" || url.search || url.hash ||
      url.username || url.password) {
    throw new Error("FACTORH_PUBLIC_ORIGIN must be a bare HTTPS origin.");
  }

  return `${url.origin}/360/${token}`;
}
