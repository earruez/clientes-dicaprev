# AUDITORIA_CAPACITACIONES_PRISMA

## Resumen ejecutivo

Estado actual del módulo Capacitaciones: **pre-migración**, con persistencia en memoria (singleton local) y múltiples pantallas con datos mock embebidos.

Hallazgos clave:
- No existen modelos Prisma para capacitaciones en `prisma/schema.prisma`.
- No existen server actions de capacitaciones en `src/actions`.
- No existen API routes de capacitaciones en `src/app/api`.
- La ruta central `/dicaprev/capacitacion` usa `src/lib/capacitacion/capacitacion-store.ts` (store local en memoria, sin BD).
- Varias rutas hijas (`calendario`, `historial`, `evaluaciones`, `participacion`) usan mocks locales por página, no conectados entre sí ni con Prisma.
- Hay duplicidad funcional entre `/dicaprev/capacitacion/plan` y `/dicaprev/capacitacion/plandecapacitacion`, ambas con arrays hardcodeados.
- No se detectó uso de localStorage/sessionStorage en el módulo de capacitaciones.
- Se reutiliza `MOCK_WORKERS` para cruces de datos (riesgo de inconsistencia con trabajadores reales en Prisma).

---

## Tabla por ruta/pantalla

| Ruta | Función | Fuente actual | Estado | Riesgo | Recomendación |
|---|---|---|---|---|---|
| /dicaprev/trabajadores/capacitaciones | Alias hacia módulo capacitaciones | Redirect a `/dicaprev/capacitacion` en `src/app/dicaprev/trabajadores/capacitaciones/page.tsx` | Sin lógica propia | Bajo | Mantener redirect y migrar solo destino central |
| /dicaprev/capacitacion | Hub con tabs (Asignaciones, Calendario, Catálogo, Historial) | Store local `src/lib/capacitacion/capacitacion-store.ts` vía componentes `Tab*` | Parcialmente integrado (solo memoria) | Alto | Primera ruta a migrar a Prisma por ser fuente principal de estado |
| /dicaprev/capacitacion/calendario | Agenda mensual/detallada de sesiones | `SESIONES_INICIALES`, `OBRAS_MOCK` en `src/app/dicaprev/capacitacion/calendario/page.tsx` | Mock aislado | Alto | Conectar a entidad `CapacitacionSesion` y catálogo real |
| /dicaprev/capacitacion/historial | Historial por trabajador con vigencia | `HISTORIAL_MOCK` en `src/app/dicaprev/capacitacion/historial/page.tsx` | Mock aislado | Alto | Reemplazar por vista derivada de asignaciones + evaluaciones + vigencia |
| /dicaprev/capacitacion/evaluaciones | Gestión de evaluaciones/notas | `EVALUACIONES_MOCK` en `src/app/dicaprev/capacitacion/evaluaciones/page.tsx` | Mock aislado | Alto | Persistir evaluaciones y resultados por sesión/asignación |
| /dicaprev/capacitacion/participacion | Asistencia/participación por sesión | `SESIONES_PARTICIPACION` en `src/app/dicaprev/capacitacion/participacion/page.tsx` | Mock aislado | Alto | Persistir asistencia por trabajador y sesión |
| /dicaprev/capacitacion/plandecapacitacion | Plan/matriz (versión legacy) | `ROLES_MOCK`, `COURSES_MOCK`, `INITIAL_REQUIREMENTS` en la misma página | Mock aislado, duplicado | Alto | Consolidar con `/plan` y deprecar esta ruta tras migración |
| /dicaprev/capacitacion/plan | Plan/matriz (versión modular) | `ROLES_MOCK`, `COURSES_MOCK`, `INITIAL_REQUIREMENTS`, `TEMPLATES` hardcodeados en `src/app/dicaprev/capacitacion/plan/page.tsx` | Mock modular | Alto | Definir como ruta canónica de plan y migrar catálogo/requisitos a Prisma |

---

## Detección técnica por tipo de fuente

### Prisma
- No hay consultas Prisma en las rutas auditadas de capacitaciones.
- No hay modelos de capacitación en `prisma/schema.prisma`.

### Server actions
- No hay acciones de capacitaciones en `src/actions`.
- Solo existen referencias indirectas a `capacitacionesPendientes: 0` en acciones de trabajadores/documentos.

### API routes
- No hay API routes de capacitaciones.
- API existentes son de permisos/auth/documentación, fuera del alcance de capacitaciones.

### Mock data / arrays hardcodeados
- `SESIONES_INICIALES`, `OBRAS_MOCK` (calendario page)
- `HISTORIAL_MOCK` (historial page)
- `EVALUACIONES_MOCK` (evaluaciones page)
- `SESIONES_PARTICIPACION` (participacion page)
- `ROLES_MOCK`, `COURSES_MOCK`, `INITIAL_REQUIREMENTS` (plan y plandecapacitacion)
- `MOCK_WORKERS` en `src/components/trabajadores-v2/types.ts` reutilizado por tabs/store

### localStorage
- No detectado en `src/app/dicaprev/capacitacion/**` ni `src/lib/capacitacion/**`.

### Zustand/store local
- No se detecta Zustand (`zustand`) en el proyecto para capacitaciones.
- Se usa store local tipo singleton en memoria: `src/lib/capacitacion/capacitacion-store.ts`.

---

## Inventario de mocks/stores solicitados

- `capacitacion-store`: Existe. En `src/lib/capacitacion/capacitacion-store.ts`.
  - Contiene catálogo, asignaciones, sesiones, evaluaciones iniciales y CRUD en memoria.
- `MOCK_WORKERS`: Existe en `src/components/trabajadores-v2/types.ts`.
- `SESIONES_INICIALES`: Existe en 2 lugares:
  - `src/lib/capacitacion/capacitacion-store.ts`
  - `src/app/dicaprev/capacitacion/calendario/page.tsx`
- `HISTORIAL_MOCK`: Existe en `src/app/dicaprev/capacitacion/historial/page.tsx`.
- `EVALUACIONES_MOCK`: Existe en `src/app/dicaprev/capacitacion/evaluaciones/page.tsx`.
- `SESIONES_PARTICIPACION`: Existe en `src/app/dicaprev/capacitacion/participacion/page.tsx`.
- `ROLES_MOCK`: Existe en:
  - `src/app/dicaprev/capacitacion/plan/page.tsx`
  - `src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx`
- `COURSES_MOCK`: Existe en:
  - `src/app/dicaprev/capacitacion/plan/page.tsx`
  - `src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx`
- `INITIAL_REQUIREMENTS`: Existe en:
  - `src/app/dicaprev/capacitacion/plan/page.tsx`
  - `src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx`

---

## Modelos Prisma existentes (relacionados a capacitaciones)

No se encontraron modelos de capacitaciones en Prisma.

Observación:
- Existen entidades de trabajadores/documentos ya en Prisma, pero sin dominio de capacitación.

---

## Modelos Prisma faltantes

Modelos solicitados y recomendados:

1. `Capacitacion`
- Catálogo maestro del curso.
- Campos sugeridos: `id`, `empresaId`, `codigo`, `nombre`, `descripcion`, `categoria`, `modalidad`, `duracionHoras`, `vigenciaMeses`, `requiereEvaluacion`, `requiereFirma`, `generaCertificado`, `esObligatoria`, `activa`, `createdAt`, `updatedAt`.

2. `CapacitacionAsignacion`
- Asignación de curso a trabajador.
- Campos sugeridos: `id`, `empresaId`, `trabajadorId`, `capacitacionId`, `origen`, `estado`, `fechaAsignacion`, `fechaEnvio`, `fechaInicio`, `fechaRespuesta`, `fechaVencimiento`, `token`, `observacion`, `nota`, `aprobado`, `evidenciaId`, `certificadoId`, `documentoId`, `createdAt`, `updatedAt`.

3. `CapacitacionSesion`
- Sesiones calendario (instancias programadas).
- Campos sugeridos: `id`, `empresaId`, `capacitacionId`, `titulo`, `fecha`, `horaInicio`, `horaFin`, `modalidad`, `ubicacion`, `relator`, `cupos`, `estado`, `createdAt`, `updatedAt`.

4. `CapacitacionHistorial`
- Bitácora/hitos históricos del ciclo (o vista materializada).
- Campos sugeridos: `id`, `empresaId`, `trabajadorId`, `capacitacionId`, `asignacionId`, `fechaEvento`, `tipoEvento`, `detalle`, `vigenciaHasta`, `estado`, `createdAt`.

5. `CapacitacionEvaluacion`
- Resultado evaluativo por asignación/sesión/trabajador.
- Campos sugeridos: `id`, `empresaId`, `asignacionId`, `trabajadorId`, `sesionId?`, `asistencia`, `nota`, `aprobado`, `fechaEvaluacion`, `observacion`, `evidenciaId`, `createdAt`, `updatedAt`.

6. `CapacitacionAsistencia` (si corresponde)
- Control fino de asistencia por sesión y trabajador.
- Campos sugeridos: `id`, `empresaId`, `sesionId`, `trabajadorId`, `estadoAsistencia`, `horaCheckIn?`, `horaCheckOut?`, `observacion?`, `createdAt`, `updatedAt`.

---

## Orden recomendado de migración

1. **Catálogo base**
- Migrar `Capacitacion`.
- Reemplazar `CATALOGO_INICIAL` y CRUD de `TabCatalogo`.

2. **Asignaciones**
- Migrar `CapacitacionAsignacion`.
- Reemplazar `TabAsignaciones` + lógica de envío/reasignación/extensión.

3. **Sesiones y participación**
- Migrar `CapacitacionSesion` y `CapacitacionAsistencia`.
- Reemplazar `/calendario` y `/participacion`.

4. **Evaluaciones**
- Migrar `CapacitacionEvaluacion`.
- Conectar `/evaluaciones` a datos reales.

5. **Historial**
- Migrar `CapacitacionHistorial` o construir vista derivada robusta.
- Reemplazar `/historial`.

6. **Plan de capacitación**
- Consolidar ruta canónica `/capacitacion/plan`.
- Migrar plantillas/requisitos por rol y deprecar `/plandecapacitacion`.

7. **Limpieza final**
- Eliminar dependencia de `MOCK_WORKERS` en capacitaciones.
- Unificar con trabajadores reales en Prisma (`trabajadorId`).

---

## Riesgos de migración detectados

- Divergencia de datos por coexistencia de rutas duplicadas (`plan` vs `plandecapacitacion`).
- Dependencia transversal de `MOCK_WORKERS` puede romper consistencia con trabajadores reales.
- Estados de asignación/evaluación sin modelo relacional aún definido pueden derivar en deuda técnica si se migra sin orden.

---

## Conclusión

El módulo Capacitaciones está funcional a nivel UI, pero su backend actual es **100% local/mock** para su dominio principal. Está listo para migración a Prisma, pero requiere una estrategia por fases para evitar regresiones y eliminar duplicidad de pantallas/estructuras.
