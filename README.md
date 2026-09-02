# NextPrev

Plataforma SaaS de seguridad, prevención de riesgos, cumplimiento y gestión documental.

## Stack

- Next.js 15 / React 18
- TypeScript
- PostgreSQL + Prisma
- NextAuth
- Vercel
- Node.js 24

## Desarrollo

```bash
npm ci
npx prisma generate
npm run dev
```

Validación completa:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

## Base de datos

Las modificaciones de esquema se distribuyen mediante migraciones Prisma. En ambientes desplegados:

```bash
npx prisma migrate deploy
```

No usar `prisma db push` como mecanismo de despliegue de producción.

## Seguridad multiempresa

Toda lectura o mutación de datos de negocio debe:

1. Obtener el contexto mediante `requirePermission(...)`.
2. Filtrar por `empresaId` de la sesión.
3. Para acciones que reciben IDs, comprobar ownership antes de leer, actualizar o eliminar.
4. Usar permisos `canManage*` para mutaciones y `canRead*` solo para lecturas.

No usar una empresa hardcodeada, `findFirst()` sin `empresaId` ni fallbacks a la primera empresa disponible.

## Autenticación

- Contraseñas persistidas como hash.
- Rate limit de autenticación persistente en PostgreSQL.
- Recuperación mediante tokens aleatorios de un solo uso; solo el hash del token se almacena.
- El bootstrap de SUPERADMIN está desactivado en producción salvo habilitación explícita y temporal con `BOOTSTRAP_ENABLED=true`.

## Archivos XLSX

La carga masiva de trabajadores valida tamaño y estructura del XLSX antes de procesarlo. El parser de uploads no usa SheetJS; `xlsx` se mantiene solo para generación de plantillas y scripts administrativos confiables.

## Despliegue

Producción: Vercel. La versión de Node debe permanecer alineada entre `package.json`, CI y Vercel.

Antes de promover cambios con migraciones:

```bash
npx prisma migrate deploy
```

## Hardening

Estado y alcance de la fase de saneamiento SaaS: [`docs/HARDENING_SAAS_2026-09.md`](docs/HARDENING_SAAS_2026-09.md).
