# NextPrev · MVP de firma SST para trabajadores temporales

## Alcance

Personas contratadas **directamente por la empresa activa** mediante contratos a plazo fijo o por obra/faena, por un período corto de hasta siete días. **No son contratistas**, y esta funcionalidad no firma contratos laborales, finiquitos ni reemplaza sistemas de asistencia.

Documentos: IRL, difusión MIPER, reglamento interno, procedimientos, EPP y constancias de capacitación. Las capacitaciones de manejo de extintores o parte práctica de EPP deben **haber ocurrido efectivamente**; se exige fecha, lugar y responsable y el PDF debe acreditar la actividad real.

## Implementación MVP

1. Registrar al trabajador en **Personas**, con RUT, modalidad contractual y **correo particular** actualizado.
2. En **Documentación → Personal temporal · firmas SST**, seleccionar trabajador, fecha de inicio/término, documento y adjuntar PDF de máximo 10 MB.
3. Los documentos de extintores, capacitación EPP o entrega EPP exigen declarar actividad/entrega presencial ya realizada (fecha, lugar, responsable).
4. El trabajador recibe un enlace de firma con token aleatorio almacenado en hash; plazo máximo de siete días, nunca después de la fecha de término indicada.
5. Antes de ver el PDF, el trabajador **acepta expresamente la modalidad electrónica** o solicita entrega **en papel**. La aceptación previa conserva fecha, IP, dispositivo y evento.
6. El trabajador revisa el PDF y solicita **OTP de seis dígitos al correo particular**. Código de 10 minutos, intervalo mínimo entre envíos de 60 segundos, cinco intentos.
7. Para firmar, debe informar nombre/RUT válido, ratificar lectura y modalidad electrónica, firmar textual o dibujado y enviar OTP vigente. El servidor confirma el hash SHA-256 del PDF privado almacenado y el vínculo con el trabajador.
8. El evento de firma queda guardado de forma transaccional con fecha, IP, UA, hash de documento y evidencia, además de eventos separados en la tabla `FirmaSstEvento`. El OTP se consume y se invalida.
9. Se remite **automáticamente** al correo personal el PDF original y la constancia PDF. Se registra identificador de Resend o fallo de envío; existe botón para reenviar la copia.
10. El empleador descarga **Expediente ZIP para mandante** (original, constancia y manifiesto JSON con hashes y cronología de auditoría).
11. Una tercera parte puede comprobar la huella actual con el vínculo de verificación en la constancia, sin acceder al original ni exponer RUT completo.

## Consulta de fiscalización independiente

- El proveedor administra `/dicaprev/superadmin/fiscalizacion`, accesible exclusivamente al rol **SUPERADMIN**.
- Primero debe **verificar por un canal independiente la identidad y calidad del fiscalizador**, su RUT y correo institucional; el empleador no decide quién obtiene acceso. La casilla en UI deja constancia operativa, pero **no sustituye esa verificación real**.
- El inspector ingresa a `/fiscalizacion/firmas` con **RUT del empleador y correo previamente habilitado**; recibe OTP y sesión HttpOnly firmada, de ocho horas, renovable. La autenticación es posible desde cualquier equipo conectado a internet, sin filtros de fecha ni tipo de documento SST; los registros se paginan de 100 en 100, sin limitar el volumen consultable.
- Descarga originales y constancias y puede ratificar electrónicamente mediante acción explícita auditada, vinculada a su identidad verificada. Accesos, descargas, ratificaciones e intentos quedan registrados.
- Esta implementación **no afirma una integración oficial con la DT**. Debe validarse con la DT o asesoría jurídica que el mecanismo de habilitación, ratificación e independencia satisface el dictamen en el contexto operativo específico.

## Base de datos y despliegue

Hay migración Prisma **20261105174500_firma_sst_verificacion_fiscalizacion**. Aplicar `npx prisma migrate deploy` al entorno objetivo antes de servir este módulo. No usar `db push` en producción como sustituto. Respaldar la base antes de migrar.

Necesita:
- `BLOB_READ_WRITE_TOKEN` para PDF privado.
- `RESEND_API_KEY` y `CAPACITACION_FROM_EMAIL` o `EMAIL_FROM` para invitaciones, OTP y copias.
- `AUTH_SECRET` o `NEXTAUTH_SECRET` para sesión de fiscalización.
- `APP_URL` / URL pública correcta para los enlaces del correo.

**En la última inspección de Vercel, Resend y el remitente están solo en producción, no en preview.** Eso impide probar la entrega real en preview hasta que existan credenciales separadas y una identidad de remitente validada en ese entorno.

## Matriz de aceptación previa a producción

| Prueba | Resultado requerido |
|---|---|
| Migración preview | Aplicada sin errores, Prisma reconoce las tablas/campos |
| Subir PDF privado | No accesible sin token; SHA original coincide |
| Usuario incorrecto o de otra empresa | No puede crear solicitud, ver ni exportar documentos |
| Consentimiento rechazado | Se registra solicitud en papel; no permite abrir PDF o firmar |
| Consentimiento aceptado | Se registra antes de habilitar la descarga |
| OTP correcto | Firma válida una sola vez, con huellas y metadata |
| OTP incorrecto, vencido o sexto intento | Rechaza la firma; token no queda firmado |
| Token expirado/revocado/reutilizado | No permite firmar |
| Capacitación práctica no confirmada | No permite crear solicitud de esa categoría |
| Emisión posterior | Se reciben PDF original + constancia en correo particular |
| Correo con fallo | Estado visible «pendiente» y reenvío sin segunda firma |
| Verificación pública | Reconoce hash real, falla si PDF cambia; RUT parcial |
| ZIP a mandante | 2 PDFs + JSON, hash original y constancia íntegros |
| Inspector no habilitado | No obtiene acceso; respuesta no revela existencia de cuentas |
| Inspector habilitado | OTP, sesión, búsqueda completa, descarga y ratificación auditada |
| Permisos empresa | No puede habilitar fiscalizador ni consultar documentación de otra empresa |
| Firma en móvil real | Consentimiento, vista PDF, OTP, trazo, cierre y correo funcionan |

No declarar **MVP funcionalmente validado en producción** hasta completar esta matriz con pruebas reales y conservar la evidencia; el CI (lint, TypeScript, tests, build) no sustituye esas pruebas.

## Revisión jurídica y operación

- La **Ley 19.799** reconoce la firma electrónica simple; no equivale a firma electrónica avanzada.
- Dictamen DT **0789/15 (2015)**: acceso de fiscalización, impresión, ratificación, consentimientos y entrega al correo particular; requisitos copulativos.
- Ordinario **654/2025**: el módulo de firma integra un sistema documental laboral; su gestión debe recaer en tercero independiente del empleador.
- Ordinarios **715/2025 y 754/2025**: permiten documentación SST y firmas simples bajo las condiciones del dictamen; la firma no reemplaza prácticas presenciales.
- Ordinario **755/2025**: el uso del dispositivo personal del trabajador requiere acuerdo; costos del empleador.
- Debe existir una relación operativa **real** de independencia entre NextPrev/proveedor de firma y Baker. No es un requisito que pueda demostrarse solo con código: verificar contratos, titularidad, roles administrativos, políticas de conservación, medidas de seguridad y funcionamiento efectivo.
- No hay certificación previa general del software exigida por DT, pero **no** se puede afirmar conformidad sin validar los requisitos copulativos y la operación.
- Política de conservación, respaldos, derechos de titulares y control de acceso deben acordarse antes de activar el módulo con personal real.

## Referencias oficiales

- https://www.dt.gob.cl/legislacion/1624/w3-article-105114.html
- https://www.dt.gob.cl/legislacion/1624/w3-article-128359.html
- https://www.dt.gob.cl/legislacion/1624/w3-article-128451.html
- https://www.dt.gob.cl/legislacion/1624/w3-article-128569.html
- https://www.dt.gob.cl/legislacion/1624/w3-article-118200.html
