# NextPrev — Hardening SaaS multiempresa

Fecha: 2026-09-02

## Objetivo

Cerrar deuda crítica antes de seguir ampliando funcionalidades: aislamiento entre empresas, autorización por ownership, autenticación, datos mock visibles en producción, carga de archivos y alineación de runtime.

## Cambios aplicados

- Organigrama: eliminado `empresaId` hardcodeado y fallback a primera empresa.
- Plan de Trabajo: todas las acciones por `planId`/`actividadId` validan ownership de empresa; mutaciones exigen `canManageCumplimiento`.
- Permisos: updates y referencias por ID verifican empresa activa; creación valida cliente, organismo y todos los responsables.
- Bootstrap SUPERADMIN: cerrado por defecto en producción; reset remoto de SUPERADMIN bloqueado en producción.
- Autenticación: rate limiting persistente en PostgreSQL; retirado contador en memoria de middleware.
- Recuperación de contraseña: respuesta neutral, rate limit, token aleatorio, hash en BD, un solo uso e invalidación de tokens previos.
- Trabajadores: tabla y drawer dejaron de mostrar documentos, asignaciones y riesgos simulados.
- Carga masiva: uploads XLSX dejan de pasar por el parser SheetJS; lector restringido con control de expansión ZIP/XML.
- Alertas: `/dicaprev/notificaciones` redirige a la vista canónica de alertas reales; retirado generador basado en mocks.
- Legacy: eliminados stores/mocks obsoletos de Plan de Trabajo y Capacitaciones sin consumidores activos.
- PostgreSQL: `sslmode` ambiguo se normaliza a `verify-full`.
- Runtime: CI y `package.json` alineados con Node 24 de Vercel.
- Branding: metadata principal del Dashboard usa NextPrev.

## Migración requerida

Antes de promover a producción:

```bash
npx prisma migrate deploy
```

La migración `20260902222000_auth_rate_limit` crea la tabla persistente usada por el rate limiter de autenticación.

## Criterio de cierre

- CI: lint, typecheck, tests y build en verde.
- Preview Vercel READY.
- Migración aplicada antes de tráfico productivo.
- Verificación funcional: login, recuperación de contraseña, Trabajadores, Plan de Trabajo, Permisos, Organigrama y carga XLSX.

## Pendientes no bloqueantes

- El paquete `xlsx` sigue instalado exclusivamente para generar la plantilla XLSX y scripts administrativos confiables; el flujo de upload ya no lo utiliza como parser.
- La ruta interna histórica `/dicaprev/*` se mantiene por compatibilidad; no es branding visible.
- Auditorías históricas del repositorio se conservan como registro y no deben interpretarse como estado actual del producto.
