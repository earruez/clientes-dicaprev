# AUDITORIA_GLOBAL_POST_PRISMA

Fecha: 11 de mayo de 2026  
Alcance: Todo el proyecto tras migración de Trabajadores, Control Documental, Capacitaciones y Plan de Capacitación.

---

## Resumen ejecutivo

Los módulos centrales ya operan sobre Prisma:
- Trabajadores (CRUD, documentos, capacitaciones por trabajador)
- Control Documental (documentos empresa, flujo de aprobación)
- Capacitaciones (catálogo, asignaciones activas)
- Plan de Capacitación (planes, ítems, plantillas, reglas)

Sin embargo, persisten dependencias legacy en 6 módulos funcionales que aún usan stores en memoria, mocks hardcodeados y localStorage como fuente primaria de datos. También existe deuda de cruce entre módulos ya migrados a Prisma y consumidores que aún leen de mocks.

---

## Tabla por módulo

| Módulo | Estado Prisma | Dependencias legacy | Riesgo | Prioridad |
|---|---|---|---|---|
| Trabajadores | ✅ Migrado | `MOCK_WORKERS` aún usado en dashboard y alertas | Alto | Crítica |
| Control Documental | ✅ Migrado | `MOCK_DOCUMENTOS` en WorkersTable, WorkerDrawer, dashboard | Alto | Crítica |
| Capacitaciones (catálogo/asignaciones) | ✅ Migrado | `capacitacion-store` aún activo, `MOCK_CAPACITACIONES` en dashboard | Alto | Crítica |
| Plan de Capacitación | ✅ Migrado | — | Bajo | — |
| Dashboard | ❌ No migrado | Consume 8 mocks distintos directamente | Crítico | 1 |
| Acreditaciones | ❌ No migrado | `ACREDITACIONES_MOCK`, `HISTORIAL_MOCK`, `HISTORIAL_GESTION_MOCK` | Alto | 2 |
| Cumplimiento | ❌ No migrado | `OBLIGACIONES_MOCK`, `HALLAZGOS_MOCK`, `EVIDENCIAS_MOCK`, `CENTROS_MOCK` | Alto | 2 |
| Alertas | ❌ No migrado | Genera alertas desde 4 mocks distintos | Alto | 3 |
| Empresa | ⚠️ Parcial | `EMPRESA_MOCK`, `localStorage` para áreas/cargos/plantillas | Medio | 3 |
| Plan de Trabajo | ❌ No migrado | `ACTIVIDADES_PLAN`, `localStorage` como BD | Medio | 4 |
| Biblioteca | ❌ No migrado | `BIBLIOTECA_MOCK` | Medio | 4 |
| Documentación | ❌ No migrado | `DOCUMENTOS_EMPRESA_MOCK`, `USUARIO_LOGUEADO_MOCK` | Medio | 4 |
| Vehículos | ❌ No migrado | `vehiculos-store` (singleton en memoria) | Medio | 4 |
| Dotación | ❌ No migrado | `dotacion-store` (singleton en memoria) | Medio | 5 |
| Capacitaciones /calendario | ❌ No migrado | `SESIONES_INICIALES`, `OBRAS_MOCK` | Alto | 3 |
| Capacitaciones /historial | ❌ No migrado | `HISTORIAL_MOCK` | Alto | 3 |
| Capacitaciones /evaluaciones | ❌ No migrado | `EVALUACIONES_MOCK` | Alto | 3 |
| Capacitaciones /participacion | ❌ No migrado | `SESIONES_PARTICIPACION` | Alto | 3 |
| Auditoría (sistema) | ❌ No migrado | `audit-store` (singleton en memoria) | Bajo | 5 |

---

## Stores legacy detectados

| Store | Ruta | Datos en memoria | localStorage | Usado activamente por |
|---|---|---|---|---|
| `capacitacion-store` | `src/lib/capacitacion/capacitacion-store.ts` | `CATALOGO_INICIAL`, `SESIONES_INICIALES` | No | `/capacitacion` hub, dashboard |
| `empresa-store` | `src/lib/empresa/empresa-store.ts` | `EMPRESA_MOCK`, `DEFAULT_AREAS`, `DEFAULT_CARGOS` | Sí (`dicaprev:plantilla-empresa`) | `/empresa`, `/dashboard` |
| `dotacion-store` | `src/lib/dotacion/dotacion-store.ts` | `INITIAL_POSICIONES` | No | `/empresa` (dotación) |
| `vehiculos-store` | `src/lib/vehiculos/vehiculos-store.ts` | Mock vehicles | No | `/empresa` (vehículos), acreditaciones |
| `centros-store` | `src/lib/centros/centros-store.ts` | Mock CentroAdmin | No | `/empresa` |
| `audit-store` | `src/lib/auditoria/audit-store.ts` | Log de auditoría | No | Sistema interno |

---

## Mocks detectados

| Constante | Archivo | Consumidores activos |
|---|---|---|
| `MOCK_WORKERS` | `src/components/trabajadores-v2/types.ts` | `dashboard/page.tsx`, `src/lib/alertas/index.ts` |
| `MOCK_DOCUMENTOS` | `src/components/trabajadores-v2/documental/types.ts` | `WorkersTable.tsx`, `WorkerDrawer.tsx`, `dashboard/page.tsx` |
| `MOCK_CAPACITACIONES` | `src/components/trabajadores-v2/capacitacion/types.ts` | `dashboard/page.tsx` |
| `MOCK_SESSIONS` | `src/components/trabajadores-v2/capacitacion/lms-types.ts` | LMS components |
| `CENTROS_MOCK` | `src/app/dicaprev/cumplimiento/mock-data.ts` | cumplimiento pages |
| `OBLIGACIONES_MOCK` | `src/app/dicaprev/cumplimiento/mock-data.ts` | cumplimiento pages, dashboard |
| `HALLAZGOS_MOCK` | `src/app/dicaprev/cumplimiento/mock-data.ts` | cumplimiento pages, dashboard |
| `EVIDENCIAS_MOCK` | `src/app/dicaprev/cumplimiento/mock-data.ts` | cumplimiento pages |
| `EVIDENCIAS_CUMPLIMIENTO_MOCK` | `src/app/dicaprev/cumplimiento/mock-data.ts` | cumplimiento pages |
| `ACREDITACIONES_MOCK` | `src/app/dicaprev/acreditaciones/mock-data.ts` | acreditaciones pages, dashboard, alertas |
| `HISTORIAL_MOCK` | `src/app/dicaprev/acreditaciones/mock-data.ts` | `acreditaciones/[id]/page.tsx` |
| `HISTORIAL_GESTION_MOCK` | `src/app/dicaprev/acreditaciones/mock-data.ts` | `acreditaciones/historial/page.tsx`, dashboard, alertas |
| `BIBLIOTECA_MOCK` | `src/app/dicaprev/biblioteca/mock-biblioteca.ts` | biblioteca pages |
| `DOCUMENTOS_EMPRESA_MOCK` | `src/app/dicaprev/documentacion/mock-data.ts` | documentacion pages |
| `USUARIO_LOGUEADO_MOCK` | `src/app/dicaprev/documentacion/mock-data.ts` | documentacion pages |
| `ACTIVIDADES_PLAN` | `src/app/dicaprev/plandetrabajo/mock-data.ts` | plandetrabajo pages |
| `SESIONES_INICIALES` | `src/lib/capacitacion/capacitacion-store.ts` y `calendario/page.tsx` | `/capacitacion/calendario`, hub |
| `HISTORIAL_MOCK (cap.)` | `src/app/dicaprev/capacitacion/historial/page.tsx` | historial page |
| `EVALUACIONES_MOCK` | `src/app/dicaprev/capacitacion/evaluaciones/page.tsx` | evaluaciones page |
| `SESIONES_PARTICIPACION` | `src/app/dicaprev/capacitacion/participacion/page.tsx` | participacion page |

---

## localStorage detectado

| Archivo | Clave | Propósito | Riesgo |
|---|---|---|---|
| `src/lib/empresa/empresa-store.ts` | Sin clave visible (líneas 236, 274, 279) | Persiste estructura áreas/cargos | Alto — datos empresa sobrescriben Prisma |
| `src/lib/empresa/plantillas.ts` | `"dicaprev:plantilla-empresa"` | Persiste selección de plantilla empresa | Alto — fuera de sincronía con BD |
| `src/app/dicaprev/plandetrabajo/store.ts` | `"dicaprev:plan-trabajo-store:v1"` | Persiste plan de trabajo completo | Crítico — única fuente de verdad del plan |

---

## Rutas híbridas detectadas (Prisma + mock simultáneo)

| Ruta | Estado |
|---|---|
| `/dicaprev/capacitacion` (hub) | Tabs CatÁlogo/Asignaciones usan Prisma vía `src/actions/capacitaciones/index.ts`; Calendario/Historial tabs redirigen a rutas que aún son mock |
| `/dicaprev/empresa` | Algunos datos de empresa se leen de Prisma, la estructura de áreas/cargos aún usa `empresa-store` con localStorage |
| `WorkerDrawer`, `WorkersTable` | Datos del trabajador de Prisma, pero documentos y capacitaciones del drawer leen de `MOCK_DOCUMENTOS`/`MOCK_CAPACITACIONES` |

---

## Riesgos técnicos

### Críticos
- **Dashboard muestra datos ficticios**: Importa 8 mocks distintos. Cualquier métrica del dashboard (cumplimiento, acreditaciones, alertas) es ficticia y no refleja la BD real.
- **Alertas generadas desde mocks**: `src/lib/alertas/index.ts` genera alertas del sistema cruzando `MOCK_WORKERS` + `ACREDITACIONES_MOCK`. Las alertas visualizadas en producción son falsas.
- **WorkerDrawer desincronizado**: El drawer del trabajador muestra documentos/capacitaciones de `MOCK_DOCUMENTOS`, no del trabajador real en Prisma.

### Altos
- **localStorage como única fuente del Plan de Trabajo**: Si el usuario limpia el storage, pierde todo su plan de trabajo.
- **Empresa parcialmente en localStorage**: Las áreas/cargos que el usuario configuró en `/empresa` pueden divergir de lo que está en Prisma.
- **Acreditaciones completamente en mock**: El módulo más crítico legalmente (acreditaciones y certificaciones) opera sin BD real.

### Medios
- **Capacitaciones /calendario, /historial, /evaluaciones, /participacion**: Cuatro rutas hijas aún en mock. El hub principal ya lee de Prisma pero las sub-vistas muestran datos inventados.
- **Biblioteca**: Mock sin roadmap de migración.
- **Documentación**: `DOCUMENTOS_EMPRESA_MOCK` convive con Control Documental de Prisma — riesgo de confusión de módulo.

### Bajos
- **`audit-store`**: Auditoría interna en memoria, sin impacto en datos de negocio.
- **`dotacion-store`**: Solo usado en dotación/organigrama, módulo de visualización.
- **Constantes de configuración** (`TIPOS_DOCUMENTO`, `REGLAS_DOCUMENTALES`, `AREA_REFS`): No son mocks sino datos de referencia estáticos. No requieren migración urgente.

---

## Recomendación de roadmap técnico

### Fase 18 — Limpieza crítica de cruces

| Fase | Objetivo | Prioridad |
|---|---|---|
| 18.2 | Desconectar `MOCK_WORKERS` del dashboard y alertas → leer de Prisma | Crítica |
| 18.3 | Desconectar `MOCK_DOCUMENTOS` de WorkerDrawer/WorkersTable → leer de Prisma | Crítica |
| 18.4 | Desconectar `MOCK_CAPACITACIONES` del dashboard y drawer → leer de Prisma | Crítica |
| 18.5 | Migrar `/capacitacion/calendario` → `CapacitacionSesion` Prisma | Alta |
| 18.6 | Migrar `/capacitacion/evaluaciones` → `CapacitacionEvaluacion` Prisma | Alta |
| 18.7 | Migrar `/capacitacion/participacion` → `CapacitacionAsistencia` Prisma | Alta |
| 18.8 | Migrar `/capacitacion/historial` → vista derivada desde Prisma | Alta |

### Fase 19 — Módulos de negocio

| Fase | Objetivo | Prioridad |
|---|---|---|
| 19.1 | Migrar Acreditaciones a Prisma (modelos + actions + páginas) | Alta |
| 19.2 | Migrar Cumplimiento a Prisma (obligaciones, hallazgos, evidencias) | Alta |
| 19.3 | Migrar Plan de Trabajo a Prisma (eliminar localStorage) | Media |
| 19.4 | Migrar Alertas a lecturas reales desde Prisma | Media |
| 19.5 | Migrar Dashboard a datos reales | Media |

### Fase 20 — Módulos secundarios

| Fase | Objetivo |
|---|---|
| 20.1 | Migrar Biblioteca a Prisma |
| 20.2 | Migrar Documentación empresa a Prisma |
| 20.3 | Migrar Vehículos a Prisma |
| 20.4 | Migrar Dotación a Prisma |
| 20.5 | Unificar empresa-store avec Prisma (eliminar localStorage) |

### Fase 21 — Limpieza final

| Tarea |
|---|
| Eliminar todos los archivos `mock-data.ts` |
| Eliminar stores legacy (`capacitacion-store`, `dotacion-store`, etc.) |
| Eliminar todos los `*_MOCK` de `trabajadores-v2/types.ts` |
| Eliminar toda referencia a `localStorage` en stores |
| Unificar `MOCK_WORKERS` con trabajadores reales |

---

## Constantes de referencia estática (no son mocks)

Estas constantes NO deben eliminarse — son configuración, no datos de prueba:

| Constante | Archivo | Tipo |
|---|---|---|
| `TIPOS_DOCUMENTO`, `REGLAS_DOCUMENTALES` | `trabajadores-v2/documental/types.ts` | Reglas de negocio |
| `TIPO_CAPACITACIONES`, `REGLAS_CAPACITACION` | `trabajadores-v2/capacitacion/types.ts` | Reglas de negocio |
| `AREA_REFS`, `CARGO_REFS` | `src/lib/empresa/domain.ts` | Datos de referencia |
| `TIPOS_EMPRESA`, `PLANTILLAS` | `src/lib/empresa/plantillas.ts` | Configuración de empresa |
| `OBLIGACIONES_EMPRESA_BASE` | `src/lib/obligaciones-empresa/index.ts` | Base normativa |
| `DEFAULT_SST_VALUES`, `SST_INDICATOR_META` | `components/company/EditSSTIndicatorsModal.tsx` | Configuración SST |
| `CATALOGO_CAPACITACIONES` (LMS) | `lms-types.ts` | Catálogo base LMS |

---

## Conclusión

La migración a Prisma cubre los dominios centrales pero el dashboard, las alertas y el drawer de trabajador siguen leyendo datos ficticios cruzados desde los mismos módulos ya migrados. Este cruce es el riesgo técnico más urgente: da la apariencia de un sistema funcional con datos reales, pero la información mostrada es falsa.

El orden recomendado prioriza eliminar estos cruces (18.x) antes de migrar módulos nuevos (19.x), para garantizar coherencia de datos en las vistas ya producción-ready.
