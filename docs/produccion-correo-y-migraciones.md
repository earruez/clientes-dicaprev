# Producción: correo y activación inicial de usuarios

Este documento cubre dos tareas independientes necesarias para habilitar el alta de usuarios con correo de bienvenida y cambio inicial de contraseña.

## 1. Configurar correo en producción

Configurar estas variables únicamente en el panel del hosting. No guardar claves reales en GitHub, `.env.example` ni archivos del proyecto.

- `RESEND_API_KEY`: clave secreta de Resend.
- `CAPACITACION_FROM_EMAIL` o `EMAIL_FROM`: remitente validado por Resend, por ejemplo `NextPrev <notificaciones@tu-dominio.cl>`.
- `APP_URL`: `https://app.nextprev.cl`.
- `NEXT_PUBLIC_APP_URL`: `https://app.nextprev.cl`.

El servicio central `src/lib/email/send-email.ts` utiliza `RESEND_API_KEY` y acepta, por orden, `CAPACITACION_FROM_EMAIL`, `EMAIL_FROM` o el alias heredado `FROM_EMAIL`.

El alta de usuario genera un enlace absoluto usando `APP_URL` o `NEXT_PUBLIC_APP_URL`. Por eso ambas variables deben apuntar al dominio público de NextPrev en producción.

### Comprobación mínima

Después de configurar las variables y desplegar:

1. Crear un usuario de prueba desde Superadmin usando un correo controlado.
2. Confirmar recepción del correo de bienvenida.
3. Abrir el enlace `https://app.nextprev.cl/cambiar-contrasena/<token>`.
4. Definir la contraseña.
5. Confirmar que el token no pueda volver a utilizarse.

## 2. Aplicar migraciones de base de datos

La tabla `UsuarioCambioContraseña` se crea en:

`20260831120000_add_usuario_cambio_contrasena`

El bloqueo histórico estaba antes: `FirmaDocumento` fue incorporada al schema sin una migración base y luego `20260618174000_firma_simple_electronica_mvp` intentaba modificar esa tabla.

La reparación agrega:

`20260610230000_add_firma_documento_base`

Esta migración crea la tabla y enums base de `FirmaDocumento` antes de la migración que la amplía. Incluye guardas para tolerar bases donde esa estructura ya exista por una sincronización anterior.

### Procedimiento de producción

Usar la conexión de producción configurada en el entorno del hosting y ejecutar:

```bash
npx prisma migrate status
npx prisma migrate deploy
```

`migrate deploy` aplica únicamente migraciones pendientes; no ejecuta `db push` ni resetea la base.

### Si Prisma informa que `20260618174000_firma_simple_electronica_mvp` quedó registrada como fallida

No ejecutar `migrate reset` en producción.

Primero confirmar con:

```bash
npx prisma migrate status
```

Si esa migración aparece explícitamente como fallida, marcarla como revertida para permitir un nuevo intento:

```bash
npx prisma migrate resolve --rolled-back 20260618174000_firma_simple_electronica_mvp
npx prisma migrate deploy
```

La migración base faltante se ejecutará antes y el segundo intento ya encontrará `FirmaDocumento` disponible.

Si `migrate status` no muestra esa migración como fallida, no ejecutar `migrate resolve`; basta con `npx prisma migrate deploy`.

## Criterio de cierre

La configuración queda operativa cuando:

- `npx prisma migrate status` no reporta migraciones fallidas;
- `20260831120000_add_usuario_cambio_contrasena` figura aplicada;
- la tabla `UsuarioCambioContraseña` existe;
- un alta real genera correo de bienvenida;
- el enlace abre `app.nextprev.cl`, permite establecer contraseña una sola vez y luego queda inutilizado.
