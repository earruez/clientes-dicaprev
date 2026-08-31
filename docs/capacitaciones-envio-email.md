# Envio y Seguimiento de Correos en Capacitaciones

## Proveedor actual

- Proveedor soportado en esta fase: Resend (API HTTP).
- Archivo base: src/lib/email/send-email.ts.

## Variables requeridas

- RESEND_API_KEY: API key del proveedor.
- CAPACITACION_FROM_EMAIL o EMAIL_FROM: remitente para correos de capacitaciones.
- APP_URL o NEXT_PUBLIC_APP_URL o NEXTAUTH_URL: URL publica base para enlaces de capacitacion.

Estas mismas variables habilitan los correos de bienvenida de usuarios. Al crear una cuenta se envia un enlace de activacion para establecer la contraseña, valido por 24 horas y de un solo uso.

Si falta configuracion, el sistema devuelve error y no marca la asignacion como enviada.

## Flujo operativo

1. Se asigna una capacitacion al trabajador.
2. Al presionar Enviar/Reenviar:
   - se valida empresa, estado de asignacion, email del trabajador y token;
   - se envia el correo real;
   - se registra historial de exito o fallo.
3. Al abrir el enlace externo se registra trabajador_abre_link (sin duplicar por recarga).
4. Al iniciar/completar se registran eventos de avance (iniciada/completada/aprobada/reprobada).

## Estados visibles esperados

- Estado de envio: no_enviado, enviado, fallido, reenviado.
- Tracking visible: fecha ultimo envio, cantidad de envios, ultimo error.
- Estado de avance: pendiente, link_abierto, iniciada, completada, aprobada, reprobada.

## Prueba local

1. Configurar RESEND_API_KEY y remitente.
2. Ejecutar la app.
3. Crear asignacion pendiente y usar Enviar.
4. Verificar en UI:
   - estado de envio actualizado;
   - historial de eventos;
   - enlace funcional.

## Prueba en produccion

1. Confirmar variables en entorno de despliegue.
2. Enviar asignacion real a un correo controlado.
3. Verificar recepcion, apertura, inicio y completado en historial.

## Si falla el envio

- Revisar variable RESEND_API_KEY.
- Revisar remitente configurado.
- Confirmar que el trabajador tiene email valido.
- Validar APP_URL / NEXT_PUBLIC_APP_URL / NEXTAUTH_URL para enlaces absolutos.
