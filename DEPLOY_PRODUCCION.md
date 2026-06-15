# Deploy Produccion NextPrev

## Objetivo

Dejar NextPrev listo para un despliegue inicial en producción web con Vercel y PostgreSQL cloud, usando Prisma de forma segura y sin cargar datos demo como parte automática del arranque.

## Estado actual verificado

- `main` compila correctamente.
- `npm run typecheck` OK.
- `npm run build` OK.
- `vercel.json` ya usa un flujo seguro de Prisma para producción:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npm run build`
- No hay seed automática en `vercel.json` ni en el build.
- El panel `SUPERADMIN` existe y permite:
  - crear empresa real
  - preparar empresa operativa
  - seleccionar empresa activa
  - activar / desactivar módulos por empresa

## Variables de entorno requeridas

## Obligatorias

- `DATABASE_URL`
  - Conexión a PostgreSQL cloud real.
- `AUTH_SECRET`
  - Secreto principal de Auth.js.
- `NEXTAUTH_SECRET`
  - Mantenerlo definido para compatibilidad actual.
- `NEXTAUTH_URL`
  - URL pública base de la app.
- `AUTH_URL`
  - Mantener alineada con `NEXTAUTH_URL`.
- `AUTH_DEV_PASSWORD`
  - Password única del login por credenciales actual.
  - El usuario debe existir previamente en tabla `Usuario`.

## Recomendadas

- `APP_URL`
- `NEXT_PUBLIC_APP_URL`

## Opcionales por funcionalidad

- `RESEND_API_KEY`
- `CAPACITACION_FROM_EMAIL`
- `FROM_EMAIL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## Solo local / debug

- `DEBUG_REGLAS_DOCUMENTALES`
- `DEBUG_CUMPLIMIENTO_DOCUMENTAL`

## PostgreSQL cloud

Usar una base PostgreSQL administrada real. El proyecto ya está configurado con Prisma para PostgreSQL.

Checklist mínimo:

1. Crear la base cloud.
2. Obtener `DATABASE_URL` completa con `schema=public`.
3. Cargar `DATABASE_URL` en Vercel.
4. No usar en producción:
   - `prisma db push --force-reset`
   - `prisma migrate reset`
   - cualquier flujo que borre datos

## Prisma en producción

Flujo permitido y esperado:

1. `npx prisma generate`
2. `npx prisma migrate deploy`
3. `npm run build`

Notas:

- El repositorio sí tiene migraciones en `prisma/migrations/`.
- Para producción, usar `migrate deploy`, no `db push`.
- No ejecutar `seed` de forma automática en Vercel.

## Vercel

Configuración actual de `vercel.json`:

```json
{
  "buildCommand": "npx prisma generate && npx prisma migrate deploy && npm run build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

Checklist en Vercel:

1. Crear proyecto desde el repositorio.
2. Configurar variables de entorno obligatorias.
3. Verificar que Production use la misma `DATABASE_URL` cloud.
4. Desplegar.

## Dominio

Dominio comprado: `nextprev.cl`.

Subdominios definidos para producción inicial:

- `www.nextprev.cl`
  - Web pública / sitio principal.
- `app.nextprev.cl`
  - Aplicación NextPrev (login y operación).

Pasos DNS generales con Vercel:

1. Ir a Vercel > Project Settings > Domains.
2. Agregar `www.nextprev.cl` y `app.nextprev.cl` al proyecto correspondiente.
3. En el proveedor DNS de `nextprev.cl`, crear/actualizar los registros solicitados por Vercel.
4. Esperar la verificación de dominio en Vercel y confirmar estado `Valid Configuration`.
5. Definir dominio primario según estrategia de producto (por ejemplo, app en `app.nextprev.cl`).

Importante:

- Los registros DNS definitivos (tipo, nombre, valor y proxied/no proxied) los entrega Vercel al momento de agregar cada dominio.
- No fijar registros manuales “de memoria”; usar siempre los valores exactos que muestre Vercel para cada entorno.

## Superadmin inicial real

El sistema no requiere datos demo obligatorios para funcionar, pero sí requiere al menos un usuario real en tabla `Usuario` para poder iniciar sesión por credenciales.

El login actual funciona así:

- el usuario existe en base de datos
- el email coincide
- `AUTH_DEV_PASSWORD` coincide con la password ingresada

Por lo tanto, antes del primer uso productivo se debe crear manualmente un `SUPERADMIN` real.

Opciones seguras:

1. Crear el usuario con Prisma Studio apuntando a la BD cloud.
2. Crear el usuario con un script/manual SQL controlado por el equipo.

Campos mínimos del primer usuario:

- `nombre`
- `email`
- `rol = SUPERADMIN`
- `activo = true`

No es obligatorio asociarlo de inmediato a una empresa específica para poder entrar al panel `SUPERADMIN`.

## Alta operativa inicial sin seed demo

Una vez que el `SUPERADMIN` real puede entrar:

1. Ir a `/dicaprev/superadmin`.
2. Crear empresa real.
3. Usar `Preparar empresa`.
   - Esto crea estructura base operativa:
   - módulos por empresa
   - áreas base
   - cargos base
   - centro de trabajo base
   - documentos base de empresa
   - documentos base de trabajador
   - reglas mínimas de trabajador
4. Activar o desactivar módulos según el cliente real.
5. Seleccionar empresa activa.

## Seed y datos demo

Estado actual:

- Existe `prisma/seed-superadmin-local.mjs`.
- Existe `npm run seed`.
- Ese seed crea datos demo (`empresa-demo-nextprev`, `admin@dicaprev.cl`).

Criterio para producción:

- Mantener el seed solo como herramienta opcional/local.
- No ejecutarlo automáticamente en Vercel.
- No usarlo como bootstrap de producción real.

## Revisión de dependencias demo / mock

Se detectaron superficies que aún consumen mock data o textos demo y no deben considerarse parte del flujo productivo inicial:

- `/dicaprev/documentacion/firmas`
  - vista mock de solicitudes de firma
- `/dicaprev/alertas`
  - alertas basadas parcialmente en mocks
- `/dicaprev/reportes/pendientes`
- `/dicaprev/reportes/vencimientos`
- `/dicaprev/reportes/cumplimiento-area`
- `/dicaprev/reportes/cumplimiento-centro`

Además, el layout principal todavía muestra un email fijo en la cabecera (`admin@dicaprev.cl`), lo que debe revisarse antes de una publicación definitiva orientada a usuarios finales.

Conclusión práctica:

- El core operativo inicial sí puede desplegarse:
  - login
  - superadmin
  - empresa activa
  - módulos por empresa
  - trabajadores
  - inducciones
  - control documental
  - firmas públicas por token
  - evidencias
- Pero las vistas aún mock indicadas arriba no deben presentarse como funcionalidades productivas cerradas sin una revisión adicional.

## Flujo recomendado de despliegue inicial

1. Crear PostgreSQL cloud.
2. Configurar variables en Vercel.
3. Deploy de la app.
4. Ejecutar migraciones con el build configurado.
5. Crear usuario `SUPERADMIN` real en la BD.
6. Iniciar sesión con ese email y `AUTH_DEV_PASSWORD`.
7. Crear empresa real desde `SUPERADMIN`.
8. Ejecutar `Preparar empresa`.
9. Seleccionar empresa activa.
10. Ajustar módulos habilitados por empresa.

## Comandos seguros de validación local

```bash
npm run prisma:generate
npm run typecheck
npm run build
```

## Comandos que no deben usarse en producción

```bash
npx prisma migrate reset
npx prisma db push --force-reset
```

## Cierre

Para el deploy inicial, la preparación mínima segura es:

- BD PostgreSQL cloud real
- variables de entorno completas
- migraciones con `prisma migrate deploy`
- primer `SUPERADMIN` real creado manualmente
- seed demo solo local y opcional

Con eso, NextPrev queda preparado para un primer despliegue controlado sin borrar datos ni forzar resets.