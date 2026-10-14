/**
 * Mensaje de bienvenida independiente del módulo contratado.
 * El enlace es un secreto de uso temporal: generar el texto solo en el
 * navegador del administrador que acaba de crear la invitación.
 */
export function buildCompanyWelcome({
  personName,
  organizationName,
  email,
  inviteUrl,
}: {
  personName: string;
  organizationName: string;
  email: string;
  inviteUrl: string;
}): string {
  const firstName = personName.trim().split(/\s+/)[0] || "hola";
  const company = organizationName.trim() || "tu empresa";

  return [
    `Hola, ${firstName}. ¡Bienvenido(a) a FactoRH!`,
    "",
    `Ya hemos preparado tu acceso a la plataforma de FactoRH para ${company}.`,
    "",
    "Desde tu portal podrás explorar nuestras soluciones y utilizar los servicios que tu empresa tenga habilitados, así como dar seguimiento a las actividades y resultados disponibles según sus permisos.",
    "",
    "Para activar tu cuenta:",
    "1. Abre el enlace personal de invitación:",
    inviteUrl,
    "2. Crea tu contraseña y confirma el acceso.",
    `3. Ingresa con tu correo: ${email.trim()}.`,
    "",
    "Si necesitas apoyo para ingresar o no encuentras un servicio autorizado, contáctanos y con gusto te ayudaremos.",
    "",
    "Por seguridad, este enlace es personal y temporal. No lo compartas con otras personas.",
    "",
    "¡Gracias por confiar en FactoRH!",
    "Equipo FactoRH",
  ].join("\n");
}
