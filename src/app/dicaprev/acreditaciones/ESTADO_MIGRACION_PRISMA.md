# Estado Técnico Migración Acreditaciones (Prisma)

Fecha: 2026-05-19

## Rutas conectadas a Prisma

- /dicaprev/acreditaciones/resumen
  - Usa `getAcreditacionesResumen()` y `getMandantesAcreditacion()`.
  - Ya no consume `ACREDITACIONES_MOCK`.

- /dicaprev/acreditaciones/plantillas
  - Usa `getPlantillasAcreditacion()`.
  - Acciones de duplicar y activar/desactivar usan Prisma.
  - Ya no consume `PLANTILLAS_MOCK`.

- /dicaprev/acreditaciones/solicitudes
  - Carga mandantes, plantillas, trabajadores y vehiculos desde Prisma.
  - El wizard crea acreditacion real con `crearAcreditacion()`.
  - Crea relaciones con trabajadores/vehiculos y genera documentos desde requisitos de plantilla.

## Rutas aún mockeadas o mixtas

- /dicaprev/acreditaciones/[id]
  - Sigue usando `ACREDITACIONES_MOCK`, `HISTORIAL_MOCK` y helpers de `mock-data.ts`.
  - Pendiente migrar detalle de documentos, historial y acciones de expediente a Prisma.

- /dicaprev/acreditaciones/historial
  - Sigue usando `HISTORIAL_GESTION_MOCK`.
  - Pendiente conectar KPIs y tabla historica a Prisma.

## Decisiones de migración

- No se eliminaron los mocks (`mock-data.ts`, `types.ts`) para evitar romper rutas aún dependientes.
- La generación de documentos en Prisma mantiene origen exclusivo en requisitos de plantilla.
- Se reforzó aislamiento por `empresaId` en acciones del módulo.
- Seed inicial de acreditaciones disponible en `prisma/seed-acreditaciones.mjs` (idempotente por empresa).
