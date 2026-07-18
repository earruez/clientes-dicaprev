# Auditoria tecnica y funcional: modulo DS44 vendible (NextPrev)

## 1) Resumen ejecutivo

El estado actual muestra tres realidades en paralelo:

- DS44 existe como acceso visible en menu, pero su entrada principal redirige a Cumplimiento.
- El valor real de negocio esta distribuido entre Cumplimiento, Documentacion, Hallazgos, Evidencias, Plan de Trabajo, Empresa, Personas y Capacitaciones.
- Hay cobertura util para operar, pero no existe todavia un producto DS44 unificado, trazable de punta a punta, y empaquetable comercialmente como modulo independiente.

Conclusion ejecutiva:

- Cobertura global actual estimada del producto DS44 vendible: **Media-Baja**.
- Cobertura operativa por capacidades sueltas: **Media**.
- Cobertura de producto vertical DS44 (diagnostico + brechas + roadmap + evidencia de fiscalizacion): **Baja/Nula** en componentes criticos.

## 2) Estado actual del modulo DS44

Hallazgos principales:

- Ruta base DS44 redirige al modulo de Cumplimiento.
- Existen subrutas DS44 heterogeneas:
  - algunas redirigen,
  - otras reutilizan vistas de Cumplimiento,
  - otras son vistas legacy con logica local/mock.
- El nucleo fuerte hoy esta en:
  - obligaciones por aplicabilidad,
  - estados manuales y documentales,
  - hallazgos con medidas correctivas,
  - evidencias con trazabilidad,
  - plan de trabajo derivado.

## 3) Rutas existentes (estado actual)

### 3.1 Rutas DS44 existentes

- `/dicaprev/ds44` -> redirige a Cumplimiento.
- `/dicaprev/ds44/resumen` -> redirige al resumen de Cumplimiento.
- `/dicaprev/ds44/evidencias` -> reexporta vista de evidencias de Cumplimiento.
- `/dicaprev/ds44/hallazgos` -> vista legacy propia.
- `/dicaprev/ds44/obligaciones` -> vista legacy propia.

### 3.2 Rutas de soporte relevantes

- Cumplimiento: resumen, obligaciones, hallazgos, evidencias, plan de trabajo.
- Documentacion: matriz documental, vigencias, gestion de documentos requeridos y adicionales.
- Capacitaciones: plan anual, calendario, historial, evaluaciones.
- Empresa: centros, areas, cargos, indicadores, estructura.
- Personas: control documental, inducciones, riesgos y EPP.
- Plan anual transversal: resumen, matriz anual, actividades, evidencias.

## 4) Que rutas solo redirigen

- DS44 base redirige a Cumplimiento.
- DS44 resumen redirige al resumen de Cumplimiento.
- Plan de capacitacion legacy redirige a plan de capacitacion actual.

Impacto:

- No hay home DS44 vendible con narrativa propia de producto.
- Se pierde posicionamiento comercial de modulo independiente.

## 5) Cobertura actual por modulo (resumen)

## 5.1 Cumplimiento

Cobertura actual:

- Motor de cumplimiento y reglas por tamano de empresa.
- Obligaciones aplicables segun cantidad de trabajadores.
- Estado documental + estado manual combinados.
- Hallazgos con ciclo de vida, medidas correctivas y cierre condicionado.
- Evidencias vinculables a hallazgos, obligaciones, checklist, EPP y documentos.
- Plan de trabajo derivado desde obligaciones/hallazgos.

Brecha:

- Falta capa DS44 orientada a diagnostico integral, brecha normativa y roadmap de implementacion completo.

## 5.2 Documentacion

Cobertura actual:

- Gestion documental robusta (empresa y trabajador), vigencias, historial, versionado.
- Reglas de aplicabilidad documental por umbrales.
- Catalogo incluye elementos DS44 (ej. matriz IPER, programa preventivo, plan de capacitacion).

Brecha:

- La experiencia esta centrada en documentos, no en cumplimiento DS44 por bloque metodologico.

## 5.3 Hallazgos

Cobertura actual:

- Registro, priorizacion, responsables, fechas compromiso, cierre y evidencias.
- Integracion con checklist y obligaciones.

Brecha:

- No existe taxonomia DS44 de brechas por bloque de guia maestra y madurez de implementacion.

## 5.4 Plan de Trabajo

Cobertura actual:

- Plan anual, actividades, estados, evidencias, flujo de revision/aprobacion.

Brecha:

- Falta plan de implementacion DS44 por etapas de adopcion (diagnostico -> cierre de brechas -> fiscalizacion).

## 5.5 Capacitaciones

Cobertura actual:

- Plan de capacitacion, sesiones, historial, evaluaciones, reglas por cargo/area/centro.

Brecha:

- Falta mapeo explicito DS44 entre brecha detectada y requerimiento formativo exigible.

## 5.6 Empresa / Cargos / Personas

Cobertura actual:

- Base de estructura organizacional, centros, areas, cargos, criticidad, trabajadores, riesgos, EPP.

Brecha:

- No existe tablero DS44 que use esta estructura para calcular madurez y cumplimiento por unidad operativa.

## 6) Brechas frente a la Guia Maestra DS44

La guia maestra contiene 15 bloques de producto. El sistema actual cubre bien piezas operativas, pero no el recorrido integral:

- Falta diagnostico DS44 persistente por pregunta/criterio.
- Falta carta Gantt DS44 de implementacion (secuencia de adopcion normada).
- Falta resumen ejecutivo de brechas con priorizacion automatica.
- Falta PRRD como objeto funcional propio (amenazas, protocolos, simulacros, evidencia).
- Falta autoevaluacion legal estructurada.
- Falta matriz maestra de requisitos (versionada, trazable y auditable).
- Falta reporte ejecutivo DS44 exportable para venta/fiscalizacion.

## 7) Riesgos comerciales de vender el modulo incompleto

- Riesgo de promesa incumplida: se ofrece "modulo DS44" pero se entrega "suma de pantallas".
- Riesgo de adoption gap: usuarios no saben por donde empezar ni que hacer primero.
- Riesgo de auditoria: falta relato unico trazable para fiscalizacion.
- Riesgo de churn: alta dependencia de uso experto interno para unir piezas dispersas.
- Riesgo de precio: dificil justificar ticket premium sin tablero y roadmap DS44 propios.

## 8) Matriz de cobertura obligatoria

| Bloque guia | Requisito funcional | Ruta actual NextPrev | Modelo/accion actual | Cobertura | Brecha | Propuesta de implementacion | Prioridad |
|---|---|---|---|---|---|---|---|
| 00 Marco normativo | Mostrar que exige DS44 por tipo/tamano y estado | Cumplimiento/Obligaciones + Empresa | `ObligacionEmpresaEstado`, `obligaciones/actions`, `reglas-empresa` | Media | No existe capa normativa DS44 consolidada | Crear "motor de requisitos DS44" (vista canonica) versionable | P0 |
| 01 Plan de trabajo paso a paso | Secuencia metodologica de implementacion DS44 | Cumplimiento/Plan + Plan anual | `PlanTrabajo`, `ActividadPlanTrabajo` | Media | No hay etapas DS44 predefinidas por madurez | Plantillas DS44 de etapas + asistentes de arranque | P0 |
| 02 Mapa de proceso | Flujo visual de implementacion y dependencias | Parcial en Plan/Cumplimiento | derivaciones en acciones de cumplimiento | Baja | No hay mapa de proceso explicito | Vista DS44 "mapa de proceso" con estados por etapa | P1 |
| 03 Cuestionario diagnostico | Check de estado inicial con scoring | No existe ruta propia persistente | Parcial: checklists/hallazgos | Baja | Falta cuestionario DS44 estructurado | `Ds44Diagnostico` + `Ds44DiagnosticoRespuesta` | P0 |
| 04 Carta Gantt estimada | Cronograma estimado de cierre de brechas | Plan anual general | `PlanTrabajo` | Baja | No hay Gantt DS44 de implementacion | `Ds44PlanImplementacion` + timeline por fase | P1 |
| 05 Resumen de brechas | Priorizar brechas por impacto/plazo | Hallazgos + Cumplimiento | `HallazgoCumplimiento`, `EvidenciaCumplimiento` | Media | No hay consolidado ejecutivo DS44 | Agregador DS44 de brechas + riesgo + urgencia | P0 |
| 06 Segun tamano empresa | Exigencias dinamicas por umbral legal | Cumplimiento + reglas empresa | `cumplimiento-engine`, `reglas-empresa` | Alta | Falta experiencia guiada DS44 | Exponer matriz aplicabilidad DS44 en dashboard propio | P0 |
| 07 Plantillas y formularios | Biblioteca DS44 accionable | Documentacion + Biblioteca + Capacitacion | documentos requeridos + plantillas actuales | Media | Falta catalogo DS44 tipificado | `Ds44Plantilla` + mapeo a obligaciones y etapas | P1 |
| 08 Como llevarlo bien | Buenas practicas operativas y control de calidad | No existe modulo dedicado | contenidos dispersos | Nula | Falta capa de guidance | Seccion DS44 "buenas practicas" con checklist operativo | P2 |
| 09 Plan anual | Plan anual DS44 conectado a cumplimiento | Plan de trabajo + capacitacion plan | `PlanTrabajo`, `PlanCapacitacion` | Media | Falta union nativa DS44 entre ambos planes | Vista DS44 de plan anual unificado (acciones + formacion) | P1 |
| 10 Documentos y organismos | Evidencia documental y trazabilidad con organismo administrador | Documentacion + Evidencias | `DocumentoEmpresa`, `TrabajadorDocumento`, `EvidenciaCumplimiento` | Media | Falta narrativa fiscalizacion DS44 | Mapa DS44 documento -> requisito -> evidencia | P1 |
| 11 PRRD | Preparacion ante emergencias (amenazas, protocolos, simulacros) | Parcial en documentos/checklists | sin modelo PRRD dedicado | Nula | No hay entidad funcional PRRD | `Ds44Prrd` (o agregado con checklist + evidencias) | P0 |
| 12 Otras consideraciones | Casuisticas y exigencias complementarias | Disperso | reglas y textos en varios modulos | Baja | No hay espacio estructurado | Submodulo DS44 "consideraciones" por rubro/riesgo | P2 |
| 13 Autoevaluacion Legal | Autoevaluacion formal legal trazable | No existe | parcial con obligaciones/hallazgos | Nula | Falta cuestionario legal auditable | `Ds44Autoevaluacion` + respuestas + evidencias vinculadas | P0 |
| 14 Matriz Maestra de Requisitos | Matriz central versionada de requisitos DS44 | No existe | piezas en obligaciones/documentacion | Nula | No hay fuente maestra unica | `Ds44MatrizLegalItem` + versionado + cobertura | P0 |

## 9) Arquitectura propuesta del nuevo modulo DS44

> Nota de implementacion: en NextPrev las rutas productivas deben quedar bajo el prefijo /dicaprev/ds44. En este documento, cuando se habla de /ds44 se refiere al modulo comercial DS44 como concepto de producto.

### 9.1 `/ds44`

- Objetivo: dashboard ejecutivo DS44 (aplicable, cumplido, brechas, urgencias, proximos vencimientos).
- Consume: obligaciones aplicables, hallazgos abiertos, evidencias, estado documental, diagnostico.
- Crea: snapshots de avance DS44.
- Permisos: lectura cumplimiento/documentacion.
- Relacion: orquesta Cumplimiento, Documentacion, Hallazgos, Plan.
- Prisma: reutiliza actuales + snapshot DS44 opcional.
- Riesgo: bajo-medio.

### 9.2 `/ds44/diagnostico`

- Objetivo: levantar estado inicial y re-diagnosticos.
- Consume: preguntas DS44, estructura empresa, respuestas previas.
- Crea: respuestas, puntajes, brechas iniciales.
- Permisos: lectura/escritura cumplimiento.
- Relacion: alimenta plan implementacion y brechas.
- Prisma: `Ds44Diagnostico`, `Ds44DiagnosticoRespuesta`.
- Riesgo: medio.

### 9.3 `/ds44/obligaciones`

- Objetivo: vista DS44 canonica de exigencias aplicables.
- Consume: obligaciones base + estado documental/manual + reglas por tamano.
- Crea: override DS44 opcional para estado de control.
- Permisos: lectura/escritura cumplimiento.
- Relacion: reutiliza Obligaciones existentes.
- Prisma: reutiliza `ObligacionEmpresaEstado`.
- Riesgo: bajo.

### 9.4 `/ds44/plan-implementacion`

- Objetivo: roadmap por etapas con Gantt.
- Consume: diagnostico, brechas, hallazgos, plan anual.
- Crea: fases, acciones, dependencias, fechas objetivo.
- Permisos: lectura/escritura plan.
- Relacion: integra Plan de Trabajo existente.
- Prisma: `Ds44PlanImplementacion`, `Ds44PlanAccion` (o adaptador a `PlanTrabajo`).
- Riesgo: medio.

### 9.5 `/ds44/miper`

- Objetivo: gestionar matriz de peligros/riesgos y trazabilidad de controles.
- Consume: cargos, areas, centros, personas, evidencias.
- Crea: items de riesgo, controles, revisiones.
- Permisos: lectura/escritura cumplimiento.
- Relacion: conecta con documentos, capacitaciones y plan.
- Prisma: modelo dedicado recomendado (`Ds44MiperItem`) o extension de checklist.
- Riesgo: medio-alto.

### 9.6 `/ds44/prrd`

- Objetivo: gestionar preparacion y respuesta (amenazas, protocolos, simulacros).
- Consume: centros, documentos, checklists, evidencias.
- Crea: planes PRRD, simulacros, hallazgos post simulacro.
- Permisos: lectura/escritura cumplimiento.
- Relacion: enlaza checklists, hallazgos, evidencias.
- Prisma: `Ds44Prrd`, `Ds44PrrdSimulacro`, `Ds44PrrdAmenaza` (minimo viable).
- Riesgo: alto.

### 9.7 `/ds44/autoevaluacion-legal`

- Objetivo: autoevaluacion legal periodica con evidencia y score.
- Consume: matriz legal maestra + estados actuales.
- Crea: evaluaciones por periodo y respuestas.
- Permisos: lectura/escritura cumplimiento.
- Relacion: alimenta reporte y brechas.
- Prisma: `Ds44Autoevaluacion`, `Ds44AutoevaluacionRespuesta`.
- Riesgo: medio.

### 9.8 `/ds44/plantillas`

- Objetivo: catalogo de plantillas DS44 por bloque.
- Consume: plantillas documentales actuales.
- Crea: versionado y asociaciones a requisitos.
- Permisos: lectura/escritura documentacion.
- Relacion: integra biblioteca y generacion documental.
- Prisma: `Ds44Plantilla` (metadata) + puntero a documentos existentes.
- Riesgo: bajo-medio.

### 9.9 `/ds44/evidencias`

- Objetivo: trazabilidad DS44 de evidencia por requisito y etapa.
- Consume: evidencias existentes, obligaciones, hallazgos.
- Crea: vistas y etiquetas DS44.
- Permisos: lectura/escritura cumplimiento.
- Relacion: reutiliza `EvidenciaCumplimiento`.
- Prisma: reutilizacion prioritaria, sin duplicar.
- Riesgo: bajo.

### 9.10 `/ds44/reporte`

- Objetivo: reporte ejecutivo exportable (fiscalizacion/comercial).
- Consume: todo el dominio DS44.
- Crea: snapshot/reportes exportables.
- Permisos: lectura cumplimiento + export.
- Relacion: agrega informacion de todos los modulos.
- Prisma: `Ds44Reporte` opcional + log de generacion.
- Riesgo: medio.

## 10) Modelo de dominio DS44 (propuesto, sin migrar aun)

## 10.1 Modelos realmente necesarios (minimo)

1. `Ds44Diagnostico`
- `id`, `empresaId`, `periodo`, `estado`, `scoreGlobal`, `createdAt`, `updatedAt`

2. `Ds44DiagnosticoRespuesta`
- `id`, `diagnosticoId`, `bloque`, `preguntaClave`, `respuesta`, `puntaje`, `evidenciaId?`, `comentario`

3. `Ds44PlanImplementacion`
- `id`, `empresaId`, `version`, `estado`, `fechaInicio`, `fechaObjetivo`, `ownerId`

4. `Ds44PlanAccion`
- `id`, `planId`, `bloque`, `titulo`, `prioridad`, `responsableId`, `venceEl`, `estado`, `hallazgoId?`, `obligacionClave?`

5. `Ds44Autoevaluacion`
- `id`, `empresaId`, `periodo`, `estado`, `scoreLegal`, `createdAt`

6. `Ds44AutoevaluacionRespuesta`
- `id`, `autoevaluacionId`, `requisitoClave`, `cumple`, `observacion`, `evidenciaId?`

7. `Ds44MatrizLegalItem`
- `id`, `version`, `bloque`, `requisitoClave`, `descripcion`, `aplicaDesde`, `aplicaHasta`, `criticidad`, `activo`

## 10.2 Modelos opcionales (fase posterior)

- `Ds44Plantilla` (si se requiere governance propio de plantillas DS44).
- `Ds44Reporte` (si se requiere persistir snapshots y firma de emision).
- `Ds44Evidencia` NO recomendada inicialmente (reutilizar evidencia existente).

## 10.3 Reutilizacion para evitar duplicidad

Reutilizar de inmediato:

- `ObligacionEmpresaEstado`
- `HallazgoCumplimiento`
- `EvidenciaCumplimiento`
- `PlanTrabajo` / `ActividadPlanTrabajo`
- `DocumentoEmpresa` / `TrabajadorDocumento`

Estrategia anti-duplicacion:

- DS44 no reemplaza Cumplimiento; lo **orquesta**.
- DS44 agrega capas de:
  - diagnostico,
  - brecha,
  - secuencia de implementacion,
  - reporte ejecutivo.
- Los hechos operativos (hallazgo, evidencia, documento, estado) permanecen en sus modelos actuales.

## 11) Integracion con modulos existentes

### 11.1 Documentacion

- Requisitos documentales por obligacion.
- Documentos empresa y persona.
- Historial/versiones.
- Evidencia adjunta por cumplimiento.

### 11.2 Cumplimiento

- Obligaciones aplicables.
- Estado documental/manual.
- Hallazgos y cierre.

### 11.3 Plan de trabajo

- Acciones correctivas derivadas de brechas.
- Responsables, plazos y avance.

### 11.4 Capacitaciones

- Plan anual formativo.
- Induccion DS44.
- Capacitaciones por cargo/riesgo.

### 11.5 Empresa

- Cantidad de trabajadores.
- Centros, areas y cargos.
- Criticidad SST.

### 11.6 Personas

- Riesgos por persona.
- EPP y entregas.
- Historial de formacion.
- Alertas por pendientes.

### 11.7 PRRD

- Centros de trabajo.
- Amenazas.
- Protocolos.
- Simulacros.
- Evidencias y hallazgos post evento.

## 12) Reglas de producto DS44 vendible

El modulo debe responder en una sola experiencia:

- Que me exige DS44.
- Que tengo cumplido.
- Que me falta.
- Que debo hacer primero.
- Quien debe hacerlo.
- Cuando vence.
- Que evidencia necesito.
- Que puedo mostrar ante fiscalizacion.

Principio:

- DS44 no puede ser solo una lista de documentos; debe ser un sistema de decision y ejecucion.

## 13) Plan por fases de implementacion comercial

## Fase 1 - Dashboard DS44 + matriz aplicable

- Alcance: home DS44, matriz de cobertura y obligaciones aplicables.
- Archivos probables: nuevas rutas `/dicaprev/ds44` y `/dicaprev/ds44/obligaciones` (adaptador).
- Modelos probables: reutilizacion completa.
- Validaciones: consistencia de aplicabilidad por tamano.
- Riesgo: bajo.
- Vendible tras fase: "visibilidad ejecutiva DS44".

## Fase 2 - Diagnostico DS44 persistente + brechas

- Alcance: cuestionario y scoring persistente, resumen de brechas.
- Archivos probables: `/dicaprev/ds44/diagnostico`, servicio de scoring.
- Modelos probables: `Ds44Diagnostico`, `Ds44DiagnosticoRespuesta`.
- Validaciones: repetibilidad de puntaje y trazabilidad.
- Riesgo: medio.
- Vendible tras fase: "evaluacion inicial y brechas priorizadas".

## Fase 3 - Plan implementacion + Gantt

- Alcance: plan por etapas y dependencias.
- Archivos probables: `/dicaprev/ds44/plan-implementacion` + integracion plan anual.
- Modelos probables: `Ds44PlanImplementacion`, `Ds44PlanAccion`.
- Validaciones: dependencias, fechas, carga por responsable.
- Riesgo: medio.
- Vendible tras fase: "roadmap DS44 accionable".

## Fase 4 - Plantillas DS44 + generacion documental

- Alcance: catalogo DS44 y asociacion a requisitos.
- Archivos probables: `/dicaprev/ds44/plantillas` + adaptadores documentales.
- Modelos probables: `Ds44Plantilla` (opcional).
- Validaciones: versionado, descarga, trazabilidad.
- Riesgo: medio.
- Vendible tras fase: "acelerador documental DS44".

## Fase 5 - PRRD + MIPER + plan anual integrado

- Alcance: capa avanzada preventiva y emergencias.
- Archivos probables: `/dicaprev/ds44/prrd`, `/dicaprev/ds44/miper`.
- Modelos probables: `Ds44Prrd*`, `Ds44MiperItem`.
- Validaciones: simulacros, evidencias, cierre de brechas.
- Riesgo: alto.
- Vendible tras fase: "gestion avanzada de riesgo y respuesta".

## Fase 6 - Autoevaluacion legal + matriz maestra

- Alcance: autoevaluacion formal y matriz versionada.
- Archivos probables: `/dicaprev/ds44/autoevaluacion-legal`.
- Modelos probables: `Ds44Autoevaluacion*`, `Ds44MatrizLegalItem`.
- Validaciones: consistencia legal, versiones y auditoria.
- Riesgo: medio-alto.
- Vendible tras fase: "pre-fiscalizacion y control legal".

## Fase 7 - Reporte ejecutivo exportable

- Alcance: reporte DS44 con evidencia consolidada.
- Archivos probables: `/dicaprev/ds44/reporte` + export.
- Modelos probables: `Ds44Reporte` (opcional).
- Validaciones: trazabilidad, reproducibilidad, firma/version.
- Riesgo: medio.
- Vendible tras fase: "informe ejecutivo para direccion y fiscalizacion".

## 14) Cobertura estimada actual (conclusion)

- Alta: aplicabilidad por tamano y base de obligaciones/evidencias/hallazgos.
- Media: documentacion, plan anual, capacitaciones, estructura empresa-personas.
- Baja: experiencia DS44 unificada, mapa de proceso, Gantt de implementacion.
- Nula: PRRD dedicado, autoevaluacion legal dedicada, matriz maestra DS44.

## 15) Recomendacion de decision

Para lanzar un modulo DS44 vendible sin sobredimensionar costo inicial:

- Ir a mercado al cierre de Fase 2 (mensaje: "diagnostico + brechas + obligaciones aplicables").
- Consolidar precio premium al cierre de Fase 4.
- Posicionar version enterprise al cierre de Fase 6/7.

---

## Evidencia tecnica usada para esta auditoria

- Auditoria de rutas DS44 y Cumplimiento.
- Auditoria de acciones de obligaciones, hallazgos, evidencias y plan.
- Auditoria de dominio en Prisma para cumplimiento, evidencia, plan, capacitacion, checklist y EPP.
- Busqueda global de terminos DS44, IPER/MIPER, estructuras preventivas y entidades de cumplimiento.
