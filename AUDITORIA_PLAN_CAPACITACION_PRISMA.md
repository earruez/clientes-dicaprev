# AUDITORIA_PLAN_CAPACITACION_PRISMA

## Resumen ejecutivo

Estado actual de Plan de Capacitación: existen dos rutas activas, ambas con datos mock y lógica local en cliente.

Hallazgos clave:
- [src/app/dicaprev/capacitacion/plan/page.tsx](src/app/dicaprev/capacitacion/plan/page.tsx) usa una arquitectura modular por componentes y separa mejor responsabilidades de UI.
- [src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx](src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx) concentra más funcionalidad en una sola página y mantiene todo en memoria.
- Ninguna de las dos rutas consume acciones Prisma ni modelos persistentes para definición de plan.
- Ambas dependen de arreglos mock de roles, cursos y requisitos.
- El dominio actual Prisma permite derivar métricas de ejecución (asignación, asistencia, evaluación, historial), pero no define una matriz objetivo anual por rol/cargo.

Conclusión de auditoría:
- Ruta canónica recomendada: /dicaprev/capacitacion/plan.
- Se requiere modelado adicional para plan declarativo (objetivo), plantillas y reglas por cargo/área/centro.

---

## Comparación plan vs plandecapacitacion

### /dicaprev/capacitacion/plan
- Estructura: modular, compuesta por Header, Tabs, Matriz, Cursos por cargo, Plantillas, Normativa y modales en componentes dedicados.
- Evidencia: [src/app/dicaprev/capacitacion/plan/page.tsx](src/app/dicaprev/capacitacion/plan/page.tsx), [src/app/dicaprev/capacitacion/plan/components](src/app/dicaprev/capacitacion/plan/components).
- Fortalezas:
  - Mejor mantenibilidad y escalabilidad.
  - Más alineada con arquitectura por features.
  - Incluye flujo de plantillas con acciones merge y replace.
- Debilidades:
  - Sigue 100% mock/local state.
  - Botones de agregar/exportar/plantilla no están conectados a backend.

### /dicaprev/capacitacion/plandecapacitacion
- Estructura: monolítica en una sola page con tabs internos matriz/lista/biblioteca.
- Evidencia: [src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx](src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx).
- Fortalezas:
  - Incluye más detalle visual en vista lista y biblioteca digital.
  - Flujo de edición de celda completo dentro de la misma página.
- Debilidades:
  - Mayor deuda técnica por acoplamiento.
  - Menor reutilización de componentes.
  - También 100% mock/local state.

### ¿Cuál está más completa?
- Funcionalidad visible inmediata: plandecapacitacion muestra más variantes de visualización.
- Base técnica para evolucionar a Prisma: plan está más preparada por modularidad y separación.

### Recomendación canónica
- Mantener como canónica /dicaprev/capacitacion/plan.
- Traspasar solo las capacidades útiles de plandecapacitacion (por ejemplo biblioteca digital y ciertos widgets de cobertura) a la ruta canónica, sin mantener doble fuente funcional.

---

## Tabla por ruta

| Ruta | Función | Fuente actual | Estado | Riesgo | Recomendación |
|---|---|---|---|---|---|
| /dicaprev/capacitacion/plan | Plan modular por rol/curso/normativa con pestañas y plantillas | ROLES_MOCK, COURSES_MOCK, INITIAL_REQUIREMENTS, TEMPLATES en [src/app/dicaprev/capacitacion/plan/page.tsx](src/app/dicaprev/capacitacion/plan/page.tsx) | Mock/local state | Alto | Dejar como canónica y migrar por fases a Prisma |
| /dicaprev/capacitacion/plandecapacitacion | Plan legacy monolítico con matriz/lista/biblioteca | ROLES_MOCK, COURSES_MOCK, INITIAL_REQUIREMENTS en [src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx](src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx) | Mock/local state | Alto | Congelar como legacy y deprecar luego de paridad en ruta canónica |

---

## Mocks y stores detectados

### Mocks detectados en /plan
- TEMPLATES
- ROLES_MOCK
- COURSES_MOCK
- INITIAL_REQUIREMENTS

Evidencia: [src/app/dicaprev/capacitacion/plan/page.tsx](src/app/dicaprev/capacitacion/plan/page.tsx).

### Mocks detectados en /plandecapacitacion
- ROLES_MOCK
- COURSES_MOCK
- INITIAL_REQUIREMENTS

Evidencia: [src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx](src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx).

### Stores locales
- No se detecta dependencia directa de capacitacion-store en estas dos rutas auditadas.
- El estado de plan está en useState local en ambas páginas.

---

## Dependencias reutilizables Prisma

El plan puede derivar parcialmente de entidades ya existentes:

- Capacitacion: catálogo de cursos, obligatoriedad, vigencia, modalidad.
- CapacitacionAsignacion: ejecución por trabajador y estado de avance.
- CapacitacionAsistencia: participación real por sesión.
- CapacitacionEvaluacion: resultados y aprobación.
- CapacitacionHistorial: trazabilidad de eventos.
- Trabajador, Cargo, Area, CentroTrabajo: segmentación organizacional para matriz por perfiles.

Evidencia de modelos: [prisma/schema.prisma](prisma/schema.prisma).

Acciones reutilizables existentes:
- getCapacitaciones
- getCapacitacionAsignaciones
- getCapacitacionHistorial
- getTrabajadores

Evidencia: [src/actions/capacitaciones/index.ts](src/actions/capacitaciones/index.ts), [src/actions/trabajadores/index.ts](src/actions/trabajadores/index.ts).

Limitación importante:
- Con los modelos actuales se puede calcular cumplimiento ejecutado.
- No existe una entidad objetivo de plan anual (qué debería cumplir cada rol/cargo/área/centro por periodo).

---

## Modelos faltantes

Para soportar Plan de Capacitación como dominio persistente se recomiendan:

1. PlanCapacitacion
- Cabecera del plan anual/versionado por empresa.
- Campos sugeridos:
  - id
  - empresaId
  - nombre
  - anio
  - version
  - estado (borrador, vigente, archivado)
  - alcance (empresa, centro, área)
  - creadoPorId
  - aprobadoPorId
  - fechaAprobacion
  - createdAt
  - updatedAt

2. PlanCapacitacionItem
- Ítems de la matriz objetivo del plan.
- Campos sugeridos:
  - id
  - planId
  - capacitacionId
  - obligatorio
  - vigenciaMesesObjetivo
  - prioridad
  - periodicidadMeses
  - mesObjetivo
  - observacion
  - createdAt
  - updatedAt

3. ReglaCapacitacionCargo
- Reglas de aplicabilidad por perfil organizacional.
- Campos sugeridos:
  - id
  - empresaId
  - planItemId
  - cargoId
  - areaId
  - centroTrabajoId
  - tipoContrato
  - obligatorio
  - activo
  - createdAt
  - updatedAt

4. PlantillaPlanCapacitacion
- Plantillas reutilizables para inicializar planes.
- Campos sugeridos:
  - id
  - empresaId nullable
  - nombre
  - tipo
  - norma
  - descripcion
  - activo
  - createdAt
  - updatedAt

Nota de diseño:
- PlantillaPlanCapacitacion requiere relación hija (por ejemplo PlantillaPlanCapacitacionItem) para cursos y reglas predefinidas.

---

## Recomendación de ruta canónica

Ruta canónica recomendada: /dicaprev/capacitacion/plan.

Razones:
- Mejor estructura por componentes y menor acoplamiento.
- Más alineada con arquitectura del proyecto.
- Facilita migración incremental a Prisma sin reescritura monolítica.
- Permite absorber funcionalidades útiles de la ruta legacy con menor riesgo.

Ruta /dicaprev/capacitacion/plandecapacitacion:
- Mantener temporalmente solo como legacy de referencia visual.
- Deprecar tras cerrar paridad funcional en /plan.

---

## Orden recomendado de migración

1. Definir ruta canónica y congelar legacy
- Declarar /plan como única ruta objetivo.
- Evitar nuevas mejoras funcionales en /plandecapacitacion.

2. Crear modelo objetivo de plan
- Implementar PlanCapacitacion y PlanCapacitacionItem.
- Soportar versionado anual y estados de plan.

3. Crear reglas de aplicabilidad
- Implementar ReglaCapacitacionCargo para mapear por cargo/área/centro.

4. Crear plantillas persistentes
- Implementar PlantillaPlanCapacitacion y su detalle de ítems/reglas.

5. Conectar /plan a Prisma
- Reemplazar ROLES_MOCK, COURSES_MOCK, INITIAL_REQUIREMENTS y TEMPLATES por consultas/actions.
- Mantener misma UX inicialmente, sin rediseño.

6. Derivar cumplimiento real
- Cruce de plan objetivo con CapacitacionAsignacion, Asistencia, Evaluacion e Historial para KPIs reales.

7. Deprecación final de legacy
- Ocultar o redirigir /plandecapacitacion a /plan cuando exista paridad validada.

---

## Estado de auditoría

- Alcance respetado: solo auditoría.
- Sin cambios funcionales de rutas auditadas.
- Sin cambios en Prisma en esta fase.
