# Firma electrónica simple · SST para personal temporal propio

## Alcance real

Esta funcionalidad pertenece a **Documentación → Personal temporal · firmas SST**.
Los destinatarios son **trabajadores dependientes contratados por la empresa activa** por un período corto, incluidos los contratos a plazo fijo y por obra/faena. **No son trabajadores de empresas contratistas**, ni corresponde usar esta bandeja para firmar contratos de trabajo, finiquitos o control de asistencia.

- Deben encontrarse registrados previamente en **Personas** de la empresa activa.
- Cada solicitud conserva trabajador, RUT, modalidad contractual, período y tipo de evidencia.
- La firma confirma revisión y aceptación del PDF específico, no acredita por sí sola que una capacitación práctica se realizó.
- Documentos contemplados: IRL, uso de extintores, capacitación EPP, entrega EPP, reglamento interno, procedimientos, MIPER y otras difusiones.

## Flujo operativo

1. Registrar a la persona en **Personas**, con RUT correcto y correo personal.
2. Determinar la modalidad laboral real: plazo fijo (fecha determinada) o por obra/faena (término por ejecución). No cambiar su naturaleza solo por usar este módulo.
3. Conservar en el contrato o anexo la autorización expresa del trabajador para gestionar y recibir documentación laboral electrónica; ofrecer soporte papel cuando no exista consentimiento.
4. Seleccionar persona, período, documento SST y adjuntar PDF original.
5. Enviar el enlace al correo particular; el trabajador debe revisar el PDF y consentir expresamente el medio electrónico antes de firmar.
6. El sistema registra nombre, RUT, fecha, IP, agente de usuario, hash del original, hash de evidencia y firma; verifica nuevamente los bytes almacenados.
7. Tras firmar, envía al correo particular el PDF original y la constancia, registrando entrega o envío pendiente. El administrador puede reenviar la copia.
8. La empresa prepara el expediente para la mandante con los originales y constancias asociadas a la faena; conserva los documentos incluso si el contrato temporal termina.

## Advertencias jurídicas obligatorias

- **Firma electrónica simple no es firma avanzada** y no implica identidad validada por un prestador acreditado.
- Esta rama incluye medidas básicas de firma y trazabilidad, **no garantiza aún el cumplimiento integral del Dictamen 0789/15**.
- Para usar este módulo como sistema de documentación laboral, faltan revisión y pruebas del acceso de fiscalizadores DT desde las faenas, impresión, consultas, ratificación, almacenamiento duradero, respaldo de auditoría y nivel de autenticación del firmante.
- La firma electrónica de una constancia de asistencia no sustituye una actividad práctica presencial de extintores, EPP ni recorridos de evacuación.
- Nunca utilizar la firma SST como control de asistencia laboral: ese sistema tiene regulación propia.
- El teléfono personal del trabajador requiere acuerdo expreso de uso; el empleador asume costos relacionados.
- El tercero que opere el sistema de firma debe ser independiente del empleador; delimitar quién tiene acceso operativo a firma y pruebas.
- Validar con asesoría jurídica la cláusula contractual de consentimiento antes de su operación efectiva.
- Antes de desplegar, realizar pruebas end-to-end reales del correo, almacenamiento Vercel Blob, consentimiento, firma móvil, descarga de PDF y envío de constancia.

## Referencias oficiales

- Dictamen DT **0789/15**, 16-02-2015: https://www.dt.gob.cl/legislacion/1624/w3-article-105114.html
- Ordinario **715**, 23-10-2025: https://www.dt.gob.cl/legislacion/1624/w3-article-128451.html
- Ordinario **754**, 19-11-2025: https://dt.gob.cl/legislacion/1624/w3-article-128569.html
- Ordinario **654**, 23-09-2025: https://www.dt.gob.cl/legislacion/1624/w3-article-128359.html
- Ordinario **755**, 19-11-2025: https://dt.gob.cl/legislacion/1624/w3-article-128570.html
- Ordinario **484**, 22-10-2026: https://dt.gob.cl/legislacion/1624/w3-article-129868.html
