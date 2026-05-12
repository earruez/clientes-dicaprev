# AUDITORIA_CUMPLIMIENTO_VEHICULOS_PRISMA

## Resumen ejecutivo

Estado auditado al 11-05-2026:

- Cumplimiento NO esta 100% migrado a Prisma.
- Vehiculos NO esta 100% migrado a Prisma.
- Ambos modulos estan en estado hibrido, con rutas Prisma conviviendo con rutas/mock stores locales.

Hallazgos clave:

- Cumplimiento:
  - `obligaciones` y `hallazgos` usan Prisma via server actions.
  - `resumen` y `evidencias` siguen en mock/local (`mock-data.ts`, `EMPRESA_MOCK`, arreglos en memoria).
  - No existe modelo Prisma de evidencias de cumplimiento.
- Vehiculos:
  - Ruta principal `/dicaprev/empresa/vehiculos` usa Prisma (`vehiculo`, `vehiculoDocumento`, `vehiculoMantencion`).
  - Ruta detalle `/dicaprev/empresa/vehiculos/[id]` sigue usando store mock local (`vehiculos-store`) y no Prisma.
  - La ruta solicitada `/dicaprev/vehiculos` no existe; la ruta real es `/dicaprev/empresa/vehiculos`.

---

## Tabla por ruta

| Ruta | Fuente actual | Estado | Riesgo | Recomendacion |
|---|---|---|---|---|
| /dicaprev/cumplimiento | Redirect a hallazgos | Hibrida por dependencia del destino | Medio | Mantener redirect, cerrar migracion de vistas hijas |
| /dicaprev/cumplimiento/resumen | `../mock-data` + `EMPRESA_MOCK` + `cumplimiento-engine` | Mock/local | Alto | Migrar a lectura desde Prisma (obligaciones reales + hallazgos reales + evidencias reales) |
| /dicaprev/cumplimiento/obligaciones | Server actions con Prisma (`documentoRequeridoEmpresa`, `obligacionEmpresaEstado`, `empresa`) + catalogo hardcode (`OBLIGACIONES_EMPRESA_BASE`) | Hibrida Prisma + catalogo local | Medio | Mantener Prisma y externalizar catalogo base a tabla/config persistida versionable |
| /dicaprev/cumplimiento/hallazgos | Server actions Prisma (`hallazgoCumplimiento`) + plantillas hardcode | Hibrida Prisma + reglas locales | Medio-Bajo | Mantener Prisma y persistir/configurar plantillas en tabla dedicada |
| /dicaprev/cumplimiento/evidencias | `EVIDENCIAS_CUMPLIMIENTO_MOCK`, `HALLAZGOS_MOCK`, `OBLIGACIONES_MOCK`, `CENTROS_MOCK` | Mock/local | Alto | Crear modelo Prisma de evidencias y reemplazar flujo completo |
| /dicaprev/vehiculos | Ruta no existente | Pendiente de definicion | Medio | Definir redirect oficial a `/dicaprev/empresa/vehiculos` o crear ruta canonica |
| /dicaprev/empresa/vehiculos (ruta real) | Prisma actions (`getVehiculos`, `crearVehiculo`, etc.) + utilidades de `vehiculos-store` | Hibrida Prisma + utilidades/local types | Medio | Mantener actions Prisma y desacoplar progresivamente del store mock |
| /dicaprev/empresa/vehiculos/[id] (relacionada) | `getVehiculoById`, `updateVehiculo`, `updateDocumento` desde `vehiculos-store` | Mock/local | Alto | Migrar detalle a Prisma actions (leer/editar documento y estado desde BD) |

---

## Modelos Prisma existentes (relacionados)

Detectados en `prisma/schema.prisma`:

- `ObligacionEmpresaEstado`
- `HallazgoCumplimiento`
- `DocumentoEmpresa`
- `DocumentoRequeridoEmpresa`
- `Vehiculo`
- `VehiculoDocumento`
- `VehiculoMantencion`

No detectados como modelos reales de cumplimiento:

- `Obligacion` (dominio dedicado de cumplimiento, separado de documentacion)
- `Evidencia` / `EvidenciaCumplimiento`
- Relacion explicita evidencia-hallazgo (tabla/link dedicada)

---

## Actions / server APIs existentes

### Cumplimiento

- `src/app/dicaprev/cumplimiento/obligaciones/actions.ts`
  - `getEstadosObligacionesEmpresa`
  - `actualizarEstadoObligacionEmpresa`
  - `getObligacionesCumplimientoEmpresa`
- `src/app/dicaprev/cumplimiento/hallazgos/actions.ts`
  - `getHallazgos`
  - `getOpcionesHallazgo`
  - `crearHallazgo`
  - `actualizarHallazgo`
  - `cerrarHallazgo`

### Vehiculos

- `src/app/dicaprev/empresa/vehiculos/actions.ts`
  - `getVehiculos`
  - `getCentrosList`
  - `crearVehiculo`
  - `actualizarVehiculo`
  - `getVehiculoDetalle`
  - `upsertVehiculoDocumento`
  - `crearMantencionVehiculo`

### API routes

No existen API routes especificas de cumplimiento o vehiculos.

API detectadas en proyecto:

- `/api/dicaprev/documentacion/upload`
- `/api/dicaprev/documentacion/matriz`
- `/api/dicaprev/me/permissions`
- `/api/auth/[...nextauth]`

---

## Mocks / stores detectados

### Cumplimiento

- `src/app/dicaprev/cumplimiento/mock-data.ts`
  - `CENTROS_MOCK`
  - `OBLIGACIONES_MOCK`
  - `HALLAZGOS_MOCK`
  - `EVIDENCIAS_MOCK`
  - `EVIDENCIAS_CUMPLIMIENTO_MOCK`
- `src/app/dicaprev/cumplimiento/resumen/page.tsx`
  - consume `mock-data`
  - consume `EMPRESA_MOCK`
- `src/app/dicaprev/cumplimiento/evidencias/page.tsx`
  - consume `mock-data`
  - flujo CRUD local en estado cliente

### Vehiculos

- `src/lib/vehiculos/vehiculos-store.ts`
  - store singleton en memoria
  - data inicial mock (`INITIAL`)
  - CRUD local (`getVehiculoById`, `updateVehiculo`, `updateDocumento`, etc.)
- `src/app/dicaprev/empresa/vehiculos/[id]/page.tsx`
  - depende de `vehiculos-store` como fuente principal

Observacion: no se detecto `localStorage/sessionStorage` dentro de rutas auditadas de cumplimiento/vehiculos, pero si existe `localStorage` en modulo empresa (`src/lib/empresa/*`) y `EMPRESA_MOCK` es consumido por cumplimiento/resumen.

---

## Brechas pendientes

1. Cumplimiento evidencias sin persistencia Prisma.
2. Cumplimiento resumen calculado con mocks, no con datos reales.
3. Vehiculos detalle (`[id]`) desacoplado del backend Prisma (usa store local).
4. Ausencia de ruta canonicamente definida para `/dicaprev/vehiculos`.
5. Catalogos/reglas de cumplimiento (plantillas y base de obligaciones) aun hardcodeados.

---

## Recomendacion de cierre

Para declarar cierre Prisma en ambos modulos se recomienda:

1. Migrar `/dicaprev/cumplimiento/evidencias` a Prisma (modelo evidencia + relaciones).
2. Reescribir `/dicaprev/cumplimiento/resumen` para consumir exclusivamente acciones Prisma.
3. Migrar `/dicaprev/empresa/vehiculos/[id]` a actions Prisma (sin `vehiculos-store` como fuente de verdad).
4. Definir ruta canonicamente soportada para vehiculos (`/dicaprev/vehiculos` redirect o ruta propia).
5. Mantener catalogos hardcode solo como transicion; planificar persistencia/config administrable.

Conclusion operativa:

- Cumplimiento: NO esta migrado completamente a Prisma (estado hibrido con bloques mock criticos).
- Vehiculos: NO esta migrado completamente a Prisma (listado Prisma, detalle aun mock/local).
