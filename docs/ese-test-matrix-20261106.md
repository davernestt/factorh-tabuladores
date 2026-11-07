# ESE: checklist de homologación y pruebas (bloqueante para producción)

## Flujo validable cuando se aplique la migración
1. Empresa con módulo `studies` vigente solicita ESE (autorización de privacidad); solicitud `requested`.
2. Empresa sin suscripción recibe 403, aun intentando el endpoint directamente.
3. FactoRH con `studies:view` ve la alerta en la navegación y bandeja; no puede aceptar ni asignar.
4. FactoRH con `studies:operate` acepta solicitud. RPC `ese_accept_service_request` inserta un expediente `unassigned`, con `request_id` único, actualiza `status=accepted` y escribe auditoría en una transacción.
5. Repetir aceptar devuelve el mismo `case_id` sin duplicar expediente. Dos aceptaciones concurrentes no duplican por bloqueo de fila + UNIQUE.
6. FactoRH autorizado asigna aplicador `ese_operator` activo. Se audita el cambio.
7. Aplicador A ve solo expedientes asignados a A. Aplicador B no puede consultar ni guardar el expediente de A, incluso con URL/UUID conocido.
8. Captura por secciones: guardar borrador; cerrar sesión; abrir en otro dispositivo; reanudar con datos guardados; finalizar sección y registrar progreso.
9. Paola/Mónica ven expediente según permiso otorgado. Sin el permiso pierden acceso.
10. Cliente no consulta borradores ni documentos sin `client_visible` y `delivery_status=released`.

## Bloqueos actuales y activación
- Migración **NO aplicada**: `20261106_ese_request_to_case_staged.sql`. Requiere ensayo en staging.
- Migración RLS **NO aplicada**: `20261106_ese_workflow_permissions_staged.sql`. Revisar además políticas de Storage para fotos y adjuntos.
- `FACTORH_ESE_PERSONAL_REQUESTS_ENABLED` debe seguir distinto de `true` hasta tener aviso/consentimiento y pruebas de aislamiento.
- `FACTORH_ESE_REQUEST_CONVERSION_ENABLED` debe seguir distinto de `true` hasta aplicar migración y probar la RPC.
- Una empresa externa se registra en `organizations` como ficha interna, sin login; solo David/FactoRH puede crear la solicitud.
- La bandeja y el contador de la navegación son alertas **internas**, no push, SMS, WhatsApp ni correo.

## Comprobaciones de seguridad
- Rol `ese_operator` no pertenece al conjunto de perfiles operativos con grants de módulos generales.
- La ruta de aceptación rechaza clientes, aplicadores, usuarios inactivos y operadores sin permiso, antes de llamar a la RPC con service-role.
- Nunca exponer `curp`, `home_address`, teléfonos ni archivos en las alertas o logs.
- Comprobar RLS de `ese_case_sections`, `ese_request_subjects`, `ese_work_tasks` y `storage.objects`; los endpoints admin usan service-role y deben mantener filtros estrictos.
- Probar pérdida de acceso tras reasignación y desactivación de usuario.
- Validar que Word/PDF respetan el formato aprobado y que ninguna captura de prueba aparece en entregas reales.
