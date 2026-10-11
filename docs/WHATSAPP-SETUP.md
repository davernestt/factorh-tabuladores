# WhatsApp FactoRH — recepción MVP

La rama implementa un endpoint para verificación GET y mensajes POST de Meta WhatsApp Cloud API.
La firma HMAC se valida sobre el cuerpo original. Se reciben mensajes nuevos en Supabase
y se colocan respuestas sugeridas en una cola de salida. NO se envían mensajes automáticos todavía.
Tampoco hay integración con el CRM, vacantes o expedientes hasta la siguiente iteración.

## Activación (pendiente)
1. Revisar y aplicar la migración SQL contra el Supabase real de FactoRH.
2. Establecer solo como secretos del servidor: WHATSAPP_VERIFY_TOKEN,
   WHATSAPP_APP_SECRET, SUPABASE_URL, SUPABASE_SECRET_KEY.
3. Crear un número de prueba en Meta WhatsApp Business Platform.
4. Registrar la ruta /api/whatsapp/webhook y suscribir el evento messages.
5. Probar firma inválida, firma válida, duplicados e inaccesibilidad a roles públicos.
6. Crear proceso de envío idempotente que contemple plantillas, 24 horas, opt-in,
   entrega, fallos, atención humana y reglas de privacidad.

No publicar información confidencial, reportes psicométricos ni datos sensibles por WhatsApp.
DC Autobrillo se desarrollará en su propio proyecto y su propia base de datos.
