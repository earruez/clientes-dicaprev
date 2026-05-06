# AUDITORIA_PERSONAS_PRISMA

## 1) Resumen ejecutivo

El modulo Personas no esta unificado sobre Prisma en sus rutas operativas de trabajadores, control documental y capacitaciones. Actualmente conviven tres patrones:

- Pantallas principales con datos en memoria desde mocks y stores singleton.
- Pantallas satelite de capacitacion con mocks hardcodeados por pagina.
- Modelos Prisma base de personas ya presentes, pero sin capa de acciones para el flujo documental/capacitacion del modulo Personas.

Riesgo principal: divergencia de fuentes de verdad (mocks locales, stores de runtime, Prisma parcial en otras areas del sistema) que puede provocar diferencias entre lo que ve el usuario y lo que persiste realmente.

## 2) Matriz por ruta

| Ruta | Funcion | Fuente actual | Estado | Riesgo | Recomendacion |
| --- | --- | --- | --- | --- | --- |
| `/dicaprev/trabajadores` | Listado y gestion de trabajadores | `MOCK_WORKERS` + estado local + `dotacion-store` | Mock/Store | Alto | Migrar a server actions Prisma para listado, crear, editar, baja logica y asignacion de posicion dotacion. |
| `/dicaprev/trabajadores/control-documental` | Control documental por trabajador | `TIPOS_DOCUMENTO`, `REGLAS_DOCUMENTALES`, `MOCK_DOCUMENTOS`, `MOCK_WORKERS` | Mock | Alto | Crear acciones Prisma para tipos/reglas/asignaciones/documentos e historial; conservar UI y reemplazar data source. |
| `/dicaprev/trabajadores/capacitaciones` | Entrada de capacitaciones desde personas | Redirect a `/dicaprev/capacitacion` | Redirect | Bajo | Mantener redirect; consolidar backend en modulo de destino. |
| `/dicaprev/trabajadores-v2` | Compatibilidad ruta antigua | Redirect a `/dicaprev/trabajadores` | Redirect | Bajo | Mantener hasta completar migracion y luego evaluar deprecacion. |
| `/dicaprev/trabajadores-v2/control-documental` | Compatibilidad ruta antigua documental | Redirect a `/dicaprev/trabajadores/control-documental` | Redirect | Bajo | Igual criterio de deprecacion controlada. |
| `/dicaprev/capacitacion` | Hub principal de capacitaciones (tabs) | `capacitacion-store` singleton en memoria + `MOCK_WORKERS` | Store/Mock | Alto | Introducir acciones Prisma para catalogo, asignaciones, sesiones e historial; eliminar dependencia de worker mock. |
| `/dicaprev/capacitacion` tab Catalogo | CRUD catalogo de cursos | `getCatalogo/createCapacitacion/updateCapacitacion` (store) | Store | Alto | Mapear a modelo `Capacitacion` en Prisma con soft-delete/estado activa. |
| `/dicaprev/capacitacion` tab Asignaciones | Asignacion, envio, revision, certificados | `capacitacion-store` + token mock + `MOCK_WORKERS` | Store/Mock | Alto | Persistir asignaciones, estados, evaluaciones y certificados en Prisma; normalizar transiciones de estado. |
| `/dicaprev/capacitacion` tab Calendario | Sesiones calendarizadas | `capacitacion-store` + `MOCK_WORKERS` | Store/Mock | Medio-Alto | Crear modelo de sesiones y relacion N:M con trabajadores. |
| `/dicaprev/capacitacion` tab Historial | Historial derivado por trabajador | Derivado en cliente desde store y `MOCK_WORKERS` | Derivado local | Alto | Materializar historial o derivarlo server-side desde asignaciones/evaluaciones persistidas. |
| `/dicaprev/capacitacion/calendario` | Vista alternativa calendario (legacy) | `SESIONES_INICIALES` hardcode en pagina | Mock hardcode | Medio | Integrar con backend unico o deprecar por duplicidad funcional. |
| `/dicaprev/capacitacion/historial` | Vista alternativa historial (legacy) | `HISTORIAL_MOCK` hardcode en pagina | Mock hardcode | Medio | Integrar o deprecar; hoy no comparte fuente con tab Historial principal. |
| `/dicaprev/capacitacion/evaluaciones` | Evaluaciones y notas (legacy) | `EVALUACIONES_MOCK` hardcode en pagina | Mock hardcode | Medio | Integrar con `CapacitacionAsignacion`/evaluaciones en Prisma o retirar duplicado. |
| `/dicaprev/capacitacion/participacion` | Control de asistencia por sesion | `SESIONES_PARTICIPACION` hardcode en pagina | Mock hardcode | Medio | Integrar con sesiones/asistencia Prisma. |
| `/dicaprev/capacitacion/plandecapacitacion` | Matriz plan por rol (legacy v1) | `ROLES_MOCK`, `COURSES_MOCK`, `INITIAL_REQUIREMENTS` en pagina | Mock hardcode | Medio | Unificar con modulo `plan` o migrar como dominio separado con modelos propios. |
| `/dicaprev/capacitacion/plan` | Plan de capacitacion modular (legacy v2) | Mocks locales + templates JSON | Mock hardcode | Medio | Definir roadmap: integrar a backend o dejar fuera del MVP productivo. |
| Carga masiva documental (`BulkUploadDrawer`) | Wizard de carga masiva | Estado local, archivos en memoria, submit simulado (`setTimeout`) | Simulado | Alto | Implementar endpoint/server action real de subida y asignacion masiva con trazabilidad. |

## 3) Inventario de mocks/stores detectados

### Mocks de trabajadores/documental

- `src/components/trabajadores-v2/types.ts`
  - `MOCK_WORKERS`, `AREAS`, `CARGOS`, `CENTROS`, utilidades de filtro.
- `src/components/trabajadores-v2/documental/types.ts`
  - `TIPOS_DOCUMENTO`, `PLANTILLAS_DOCUMENTALES`, `REGLAS_DOCUMENTALES`, `MOCK_DOCUMENTOS`.

### Store en memoria

- `src/lib/capacitacion/capacitacion-store.ts`
  - Estado singleton en runtime para catalogo, asignaciones, sesiones, evaluaciones.
  - Comentario explicito: reemplazo futuro por Firestore/REST.
- `src/lib/dotacion/dotacion-store.ts`
  - Posiciones de dotacion en memoria y funciones `findOrCreateDotacion`, `incrementAsignados`, `decrementAsignados`.

### Hooks/paginas con CRUD en memoria

- `src/app/dicaprev/trabajadores/hooks/useTrabajadores.ts`
  - CRUD local en estado React sin persistencia.
- `src/app/dicaprev/capacitacion/*` (varias paginas)
  - Mocks hardcodeados por pantalla (calendario/historial/evaluaciones/participacion/plan).

## 4) Modelos Prisma existentes (Personas)

Detectados en `prisma/schema.prisma`:

- `CentroTrabajo`
- `Area`
- `Cargo`
- `Trabajador`
- `TrabajadorDocumento`
- `TrabajadorDocumentoHistorial`
- `PosicionDotacion`

Observacion: la base estructural del dominio Personas existe, pero la UI auditada no consume de forma consistente estas tablas en sus rutas operativas.

## 5) Modelos faltantes o no explicitos para cerrar Personas

Segun requerimiento de auditoria y estado actual del schema, faltan o no estan explicitados estos modelos:

- `DocumentoTipoTrabajador`
  - Para catalogar tipos documentales sin codificarlos en frontend.
- `ReglaDocumentoTrabajador`
  - Para reglas dinamicas por cargo/area/centro/contrato.
- `Capacitacion`
  - Catalogo maestro de cursos.
- `CapacitacionAsignacion`
  - Estado por trabajador/curso, token, vencimiento, notas, evidencia/certificado.
- `CapacitacionSesion`
  - Instancias calendarizadas, cupos, modalidad, relator, participantes.
- `CapacitacionHistorial`
  - Bitacora/auditoria de cambios y eventos de cumplimiento.

Nota: existen `TrabajadorDocumento` y `TrabajadorDocumentoHistorial`, pero el modulo actual usa un dominio de tipos/reglas que aun no esta modelado y relacionado de forma nativa.

## 6) Orden recomendado de migracion (sin romper UI)

1. Estabilizar fuente maestra de Trabajadores en Prisma
   - Conectar `/dicaprev/trabajadores` a acciones Prisma (lectura + CRUD + filtros).
   - Mantener shape actual de datos para minimizar cambios de componentes.

2. Migrar Control Documental
   - Crear `DocumentoTipoTrabajador` y `ReglaDocumentoTrabajador`.
   - Reusar `TrabajadorDocumento`/`TrabajadorDocumentoHistorial` como registros y trazabilidad.
   - Reemplazar mocks `TIPOS_DOCUMENTO`, `REGLAS_DOCUMENTALES`, `MOCK_DOCUMENTOS` por consultas/actions.

3. Migrar Capacitacion nucleo
   - Modelar `Capacitacion`, `CapacitacionAsignacion`, `CapacitacionSesion` y eventos/historial.
   - Conectar tabs de `/dicaprev/capacitacion` (Catalogo/Asignaciones/Calendario/Historial) a Prisma.
   - Sustituir `MOCK_WORKERS` por workers reales consultados desde Prisma.

4. Resolver duplicados legacy
   - Definir si rutas `/dicaprev/capacitacion/calendario|historial|evaluaciones|participacion|plandecapacitacion|plan` se integran al backend comun o se deprecian.
   - Evitar doble mantenimiento funcional.

5. Implementar carga masiva real
   - Backend para subida de archivos, validaciones por tipo, asignacion masiva y registros en historial.

## 7) Riesgos transversales

- Doble verdad funcional: pantallas distintas con datos no sincronizados.
- Estados de negocio no normalizados entre flujos (ej. capacitaciones aprobada/finalizada/vencida).
- Trazabilidad incompleta para auditoria si persisten simulaciones de carga masiva y evaluaciones.
- Riesgo de regresion UX si se migra sin adaptar shape de datos consumidos por componentes existentes.

## 8) Criterio de cierre de Fase 15.1

La fase de auditoria queda cerrada cuando:

- Todas las rutas Personas/Capacitacion quedan clasificadas por fuente y riesgo (incluido en este documento).
- Se confirma inventario de modelos Prisma existentes y brechas de modelado.
- Se define orden de migracion incremental sin cambios funcionales inmediatos.
