# FactoRH ESE | flujo operativo aprobado (6-nov-2026)

## Reglas funcionales
1. **Entrada desde cliente conectado**: solo si tiene activo el módulo Estudios Socioeconómicos. Cliente crea solicitud de su propia empresa; no asigna personal.
2. **Entrada externa**: David / personal FactoRH con permiso operativo capturan solicitudes para empresas registradas solo como clientes internos, sin cuenta de acceso.
3. **Bandeja central**: solicitudes de ambos orígenes, sin duplicados. Alertas internas a personal autorizado (inbox persistente + notificaciones configurables).
4. **Asignación**: solo administración / equipo FactoRH con permiso. Se asigna aplicador, fecha objetivo y tipo de estudio.
5. **Aplicador**: login propio; solo lista de expedientes asignados; sin listado ni buscador de empresas; sin precios, licencias, configuración o entrega.
6. **Captura**: móvil, tablet, escritorio; guardar en cada sección; editar hasta envío a revisión; archivos en Storage privado con políticas por expediente; cambios auditados.
7. **Revisión**: David/Paola/Mónica/otros autorizados inspeccionan, piden correcciones, aprueban, producen Word/PDF idénticos al formato maestro y deciden liberación al cliente.
8. **Privacidad**: información de candidatos no se incluye en banners, push, listados públicos ni logs; registrar consentimiento/aviso de privacidad según operación.

## Modelo existente a reutilizar
- `ese_service_requests`: solicitudes de clientes; revisar admisión sin plataforma y vinculación posterior a expediente.
- `ese_cases`: expedientes, `assigned_to`, `study_type`, `status`, `progress`, `delivery_status`.
- `ese_case_sections`: `section_key`, `data` JSONB, `completed`, `updated_by`.
- `ese_work_tasks`: tareas y asignados, actualmente visita/referencias.
- `staff_access_profiles` + `staff_module_grants`: autorizaciones de supervisores por módulo.
- `app_users.role`: incluye `ese_operator`, aunque no había usuarios activos con ese perfil al revisar.

## Alcance del primer corte
- Pantallas: nueva solicitud (interno), bandeja (interno), mis estudios (operador), formulario por secciones, solicitud (cliente).
- API: validación de rol en servidor; crear solicitud; asignar/retirar aplicador; obtener expediente asignado; upsert de sección; consultar avances; revisión.
- Seguridad: RLS y permisos en storage, controles de suscripción de cliente, sin capacidad de autoconcederse permisos.
- Observabilidad: historial de asignación, actualización, revisión, cambio de estado; alertas deduplicadas.
- Reportes: mapa campo-por-campo contra `Estudio_Socioeconomico_FactoRH_Ajustado_Final.docx`.

## Pruebas bloqueantes
- Operador A puede leer/guardar únicamente expediente A; no puede consultar B ni tabla organizations.
- Un operador no puede cambiar `assigned_to`, `organization_id`, `delivery_status` ni liberar documentos.
- Cliente A no puede solicitar ni ver solicitudes de cliente B.
- Cliente sin suscripción habilitada no puede crear solicitudes (validación del lado del servidor).
- Supervisor con grant studies activado puede ver solicitudes/avances autorizados; sin grant no puede.
- Desactivar perfil o reasignar expediente corta acceso inmediatamente tras invalidación de sesión/credenciales.
- Sección incompleta conserva progreso y datos al reabrir, en celular/tablet/desktop.
- PDF y Word no presentan encimado y respetan formato maestro.
- Datos de prueba exclusivamente ficticios.

## Estado
- Migración de políticas en `20261106_ese_workflow_permissions_staged.sql` es un BORRADOR; NO ejecutar en producción hasta resolver sus precondiciones.
- No activar usuarios ni suscripciones como parte de este PR.
