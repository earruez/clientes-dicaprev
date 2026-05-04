# AUDITORIA PRODUCCION NEXTPREV

Fecha: 2026-05-04
Alcance auditado: código en /src, configuración de proyecto, rutas App Router, stores en memoria/localStorage, seguridad funcional, readiness para PostgreSQL/Prisma.

## 1. Resumen ejecutivo

Estado actual: preproducción funcional para demo, no apto para producción conectada a base de datos real sin una fase previa de hardening arquitectónico.

Conclusión principal:
- La aplicación está orientada a datos mock y estado local.
- No existe backend de dominio ni capa de acceso a datos productiva.
- No existe autenticación/autorización real ni aislamiento multiempresa.
- Hay deuda técnica significativa en tipado, separación de responsabilidades y tamaño de componentes.

Dictamen: riesgo alto para conectar DB en forma directa sin plan de migración por fases.

## 2. Estado general de la app

Fortalezas:
- Base tecnológica correcta: Next.js App Router + TypeScript + Tailwind.
- Organización por módulos de negocio bajo [src/app/dicaprev](src/app/dicaprev).
- Existe esfuerzo de componentes reutilizables (ej. header estándar en [src/components/layout/StandardPageHeader.tsx](src/components/layout/StandardPageHeader.tsx)).

Debilidades estructurales:
- Exceso de componentes cliente: 113 archivos con use client de 171 archivos TSX (aprox 66%).
- Gran parte de la lógica de negocio vive en frontend y stores en memoria.
- Ausencia de capa backend/repository/service y ausencia de API de dominio.
- Múltiples fuentes mock para entidades compartidas (trabajadores, cumplimiento, documentos, acreditaciones).

## 3. Riesgos críticos antes de producción

1. Sin autenticación y autorización real.
- Evidencia: [src/app/dicaprev/login/page.tsx](src/app/dicaprev/login/page.tsx) solo renderiza formulario, sin integración con backend.
- Evidencia: no existe middleware de protección de rutas (no hay middleware.ts).
- Impacto: cualquier usuario puede ejecutar acciones sensibles en cliente.

2. Sin modelo de persistencia real y sin ORM conectado.
- Evidencia: no existe carpeta prisma ni schema Prisma.
- Evidencia: [package.json](package.json) no incluye Prisma ni scripts de migración.
- Impacto: bloqueo para trazabilidad, consistencia transaccional y operación multiusuario.

3. Datos críticos persistidos en localStorage y stores runtime.
- Evidencia: [src/app/dicaprev/plandetrabajo/store.ts](src/app/dicaprev/plandetrabajo/store.ts#L119) y [src/app/dicaprev/plandetrabajo/store.ts](src/app/dicaprev/plandetrabajo/store.ts#L161).
- Evidencia: [src/app/dicaprev/documentacion/hooks/useDocumentos.ts](src/app/dicaprev/documentacion/hooks/useDocumentos.ts#L114) y [src/app/dicaprev/documentacion/hooks/useDocumentos.ts](src/app/dicaprev/documentacion/hooks/useDocumentos.ts#L135).
- Evidencia: [src/lib/empresa/empresa-store.ts](src/lib/empresa/empresa-store.ts#L236) y [src/lib/empresa/empresa-store.ts](src/lib/empresa/empresa-store.ts#L274).
- Impacto: pérdida de datos, inconsistencia por navegador/dispositivo, nula auditoría confiable.

4. Auditoría no confiable para producción.
- Evidencia: [src/lib/auditoria/audit-store.ts](src/lib/auditoria/audit-store.ts) usa estado en memoria con seed local y usuario por defecto.
- Evidencia: usuario hardcodeado en [src/lib/auditoria/audit-store.ts](src/lib/auditoria/audit-store.ts#L177) y [src/lib/auditoria/audit-store.ts](src/lib/auditoria/audit-store.ts#L178).
- Impacto: no hay no repudio ni trazabilidad legal.

5. Exposición de identidad/tenant hardcodeados.
- Evidencia: [src/app/dicaprev/layout.tsx](src/app/dicaprev/layout.tsx#L29) y [src/app/dicaprev/layout.tsx](src/app/dicaprev/layout.tsx#L33).
- Impacto: diseño no multi-tenant y riesgo de fuga de contexto en producción.

## 4. Hallazgos por severidad

### Crítico

- Ausencia de backend de dominio y API propia.
  - Evidencia: no existe [src/app/api](src/app/api).
  - Recomendación: introducir capa de aplicación por módulo y endpoints/server actions controladas.

- Sin auth real ni control de acceso por rol.
  - Evidencia: [src/app/dicaprev/login/page.tsx](src/app/dicaprev/login/page.tsx).
  - Evidencia: simulación de rol en [src/app/dicaprev/ds44/hallazgos/page.tsx](src/app/dicaprev/ds44/hallazgos/page.tsx#L64).
  - Recomendación: implementar sesión segura + RBAC y enforcement server-side.

- Persistencia productiva inexistente (sin Prisma/PostgreSQL integrado).
  - Evidencia: no existe prisma folder ni .env.example.
  - Recomendación: crear schema, migraciones y repositorios antes de migrar módulos.

### Alto

- Lógica de negocio crítica en frontend.
  - Evidencia: motor DS44 en [src/lib/cumplimiento/cumplimiento-engine.ts](src/lib/cumplimiento/cumplimiento-engine.ts).
  - Evidencia: reglas de estado de plan en [src/app/dicaprev/plandetrabajo/store.ts](src/app/dicaprev/plandetrabajo/store.ts).
  - Riesgo: manipulación de estados y cálculos desde cliente.

- Duplicidad de datos mock y fuentes paralelas.
  - Evidencia: [src/components/trabajadores-v2/types.ts](src/components/trabajadores-v2/types.ts#L97), [src/app/dicaprev/cumplimiento/mock-data.ts](src/app/dicaprev/cumplimiento/mock-data.ts), [src/app/dicaprev/acreditaciones/mock-data.ts](src/app/dicaprev/acreditaciones/mock-data.ts), [src/app/dicaprev/biblioteca/mock-biblioteca.ts](src/app/dicaprev/biblioteca/mock-biblioteca.ts), [src/app/dicaprev/plandetrabajo/mock-data.ts](src/app/dicaprev/plandetrabajo/mock-data.ts), [src/app/dicaprev/documentacion/mock-data.ts](src/app/dicaprev/documentacion/mock-data.ts).
  - Riesgo: divergencia semántica entre módulos.

- Deuda fuerte de componentes monolíticos.
  - Evidencia: [src/app/dicaprev/documentacion/contratistas/page.tsx](src/app/dicaprev/documentacion/contratistas/page.tsx) con 1793 líneas.
  - Evidencia: [src/app/dicaprev/empresa/organigrama/page.tsx](src/app/dicaprev/empresa/organigrama/page.tsx) con 1397 líneas.
  - Evidencia: [src/app/dicaprev/cumplimiento/hallazgos/page.tsx](src/app/dicaprev/cumplimiento/hallazgos/page.tsx) con 1069 líneas.
  - Riesgo: baja mantenibilidad, alto riesgo de regresión.

- Inconsistencia de primitives UI (tipado débil) y desviación del design system.
  - Evidencia: [src/components/ui/card.tsx](src/components/ui/card.tsx), [src/components/ui/badge.tsx](src/components/ui/badge.tsx), [src/components/ui/progress.tsx](src/components/ui/progress.tsx) usan any sin contratos.
  - Riesgo: errores silenciosos y API de UI inestable.

### Medio

- Exceso de use client.
  - Evidencia: [src/app/dicaprev/layout.tsx](src/app/dicaprev/layout.tsx#L1) es client layout.
  - Métrica: 113/171 TSX con use client.
  - Riesgo: bundle más grande, menos SSR efectivo, mayor costo de hidratación.

- Rutas alias/redirect abundantes, con deuda de navegación.
  - Evidencia: [src/app/dicaprev/cumplimiento/page.tsx](src/app/dicaprev/cumplimiento/page.tsx), [src/app/dicaprev/acreditaciones/page.tsx](src/app/dicaprev/acreditaciones/page.tsx), [src/app/dicaprev/ds44/page.tsx](src/app/dicaprev/ds44/page.tsx), [src/app/dicaprev/documentos/page.tsx](src/app/dicaprev/documentos/page.tsx), [src/app/dicaprev/trabajadores-v2/page.tsx](src/app/dicaprev/trabajadores-v2/page.tsx).
  - Riesgo: semántica de producto difusa y deuda de IA de navegación.

- Rutas internas inconsistentes con dominios de módulo.
  - Evidencia: [src/components/layout/NotificationBell.tsx](src/components/layout/NotificationBell.tsx#L48) enlaza a trabajadores-v2.
  - Riesgo: rutas puente y dependencia de redirects.

- Validaciones de formularios mayoritariamente ad hoc (sin esquema central).
  - Evidencia: [src/app/dicaprev/documentacion/hooks/useDocumentos.ts](src/app/dicaprev/documentacion/hooks/useDocumentos.ts).
  - Riesgo: validación inconsistente entre módulos.

### Bajo

- Duplicación de nombres/componentes entre carpetas de idioma y versión.
  - Evidencia: [src/components/company](src/components/company) y [src/components/empresa](src/components/empresa).
  - Riesgo: confusión de mantenimiento.

- Presencia de enlaces con etiqueta a nativa en lugar de Link en algunas vistas.
  - Evidencia: [src/app/dicaprev/empresa/areas/page.tsx](src/app/dicaprev/empresa/areas/page.tsx#L408) y [src/app/dicaprev/empresa/areas/page.tsx](src/app/dicaprev/empresa/areas/page.tsx#L553).
  - Riesgo: navegación no uniforme y pérdida de optimizaciones de Next.

## 5. Hallazgos por módulo

### Empresa

- Hallazgos:
  - Estado y plantillas persisten en localStorage.
  - Estructura de datos de empresa/áreas/cargos duplicada en store y UI.
  - Pantallas muy grandes y con lógica de dominio embebida.
- Evidencia:
  - [src/lib/empresa/empresa-store.ts](src/lib/empresa/empresa-store.ts)
  - [src/lib/empresa/plantillas.ts](src/lib/empresa/plantillas.ts)
  - [src/app/dicaprev/empresa/areas/page.tsx](src/app/dicaprev/empresa/areas/page.tsx)
  - [src/app/dicaprev/empresa/cargos/page.tsx](src/app/dicaprev/empresa/cargos/page.tsx)
  - [src/app/dicaprev/empresa/organigrama/page.tsx](src/app/dicaprev/empresa/organigrama/page.tsx)

### Trabajadores

- Hallazgos:
  - Fuentes duplicadas de hook y mock.
  - Variante trabajadores-v2 mantenida como alias/redirect.
  - Múltiples componentes de documental/calendario dependen de mocks globales.
- Evidencia:
  - [src/app/dicaprev/trabajadores/hooks_useTrabajadores.ts](src/app/dicaprev/trabajadores/hooks_useTrabajadores.ts)
  - [src/app/dicaprev/trabajadores/hooks/useTrabajadores.ts](src/app/dicaprev/trabajadores/hooks/useTrabajadores.ts)
  - [src/components/trabajadores-v2/types.ts](src/components/trabajadores-v2/types.ts)
  - [src/app/dicaprev/trabajadores-v2/page.tsx](src/app/dicaprev/trabajadores-v2/page.tsx)

### Documentación

- Hallazgos:
  - Estado de documentos y trazabilidad almacenada localmente.
  - Operaciones de archivo simuladas con URL.createObjectURL.
  - Sin control de tamaño/tipo de archivo server-side.
- Evidencia:
  - [src/app/dicaprev/documentacion/hooks/useDocumentos.ts](src/app/dicaprev/documentacion/hooks/useDocumentos.ts)
  - [src/app/dicaprev/documentacion/page.tsx](src/app/dicaprev/documentacion/page.tsx)
  - [src/app/dicaprev/documentacion/contratistas/page.tsx](src/app/dicaprev/documentacion/contratistas/page.tsx)

### Biblioteca

- Hallazgos:
  - Catálogo totalmente mock, referenciado por acreditaciones y empresa documentacion.
- Evidencia:
  - [src/app/dicaprev/biblioteca/mock-biblioteca.ts](src/app/dicaprev/biblioteca/mock-biblioteca.ts)
  - [src/app/dicaprev/biblioteca/page.tsx](src/app/dicaprev/biblioteca/page.tsx)

### Cumplimiento

- Hallazgos:
  - Cálculo de cumplimiento y generación de hallazgos en cliente.
  - Dependencia transversal de mock-data.
- Evidencia:
  - [src/lib/cumplimiento/cumplimiento-engine.ts](src/lib/cumplimiento/cumplimiento-engine.ts)
  - [src/app/dicaprev/cumplimiento/mock-data.ts](src/app/dicaprev/cumplimiento/mock-data.ts)
  - [src/app/dicaprev/cumplimiento/hallazgos/page.tsx](src/app/dicaprev/cumplimiento/hallazgos/page.tsx)
  - [src/app/dicaprev/cumplimiento/obligaciones/page.tsx](src/app/dicaprev/cumplimiento/obligaciones/page.tsx)

### Plan de trabajo

- Hallazgos:
  - Flujo de aprobación/rechazo implementado en store local.
  - Historial y estado del plan en localStorage.
- Evidencia:
  - [src/app/dicaprev/plandetrabajo/store.ts](src/app/dicaprev/plandetrabajo/store.ts)
  - [src/app/dicaprev/plandetrabajo/resumen/page.tsx](src/app/dicaprev/plandetrabajo/resumen/page.tsx)
  - [src/app/dicaprev/plandetrabajo/evidencias/page.tsx](src/app/dicaprev/plandetrabajo/evidencias/page.tsx)

### Evidencias

- Hallazgos:
  - Evidencias en cumplimiento y plan son modelos diferentes sin repositorio unificado.
  - Riesgo de trazabilidad cruzada incompleta.
- Evidencia:
  - [src/app/dicaprev/cumplimiento/evidencias/page.tsx](src/app/dicaprev/cumplimiento/evidencias/page.tsx)
  - [src/app/dicaprev/plandetrabajo/evidencias/page.tsx](src/app/dicaprev/plandetrabajo/evidencias/page.tsx)

### Acreditaciones

- Hallazgos:
  - Fuertemente basado en mock-data y store auxiliar para hallazgos.
  - Flujos de estado sin backend de permisos.
- Evidencia:
  - [src/app/dicaprev/acreditaciones/mock-data.ts](src/app/dicaprev/acreditaciones/mock-data.ts)
  - [src/lib/acreditaciones/hallazgo-acreditacion-store.ts](src/lib/acreditaciones/hallazgo-acreditacion-store.ts)
  - [src/app/dicaprev/acreditaciones/[id]/page.tsx](src/app/dicaprev/acreditaciones/[id]/page.tsx)

### Reportes

- Hallazgos:
  - Reportes calculados sobre mocks de cumplimiento y empresa.
  - Sin paginación ni consulta incremental.
- Evidencia:
  - [src/app/dicaprev/reportes/cumplimiento-centro/page.tsx](src/app/dicaprev/reportes/cumplimiento-centro/page.tsx)
  - [src/app/dicaprev/reportes/cumplimiento-area/page.tsx](src/app/dicaprev/reportes/cumplimiento-area/page.tsx)
  - [src/app/dicaprev/reportes/vencimientos/page.tsx](src/app/dicaprev/reportes/vencimientos/page.tsx)

### Configuración

- Hallazgos:
  - Next config vacío, sin headers de seguridad ni optimizaciones de runtime.
  - Sin variables de entorno versionadas de ejemplo.
- Evidencia:
  - [next.config.ts](next.config.ts)
  - no existe archivo .env.example en la raíz del proyecto.

### Sidebar/layout

- Hallazgos:
  - Layout principal como client component con tenant/email fijos.
  - Sidebar centraliza navegación por datos hardcodeados.
- Evidencia:
  - [src/app/dicaprev/layout.tsx](src/app/dicaprev/layout.tsx)
  - [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx)

## 6. Inventario de datos mock/local state

Inventario principal detectado:
- Trabajadores mock: [src/components/trabajadores-v2/types.ts](src/components/trabajadores-v2/types.ts#L97)
- Cumplimiento mock: [src/app/dicaprev/cumplimiento/mock-data.ts](src/app/dicaprev/cumplimiento/mock-data.ts)
- Acreditaciones mock: [src/app/dicaprev/acreditaciones/mock-data.ts](src/app/dicaprev/acreditaciones/mock-data.ts)
- Biblioteca mock: [src/app/dicaprev/biblioteca/mock-biblioteca.ts](src/app/dicaprev/biblioteca/mock-biblioteca.ts)
- Plan de trabajo mock: [src/app/dicaprev/plandetrabajo/mock-data.ts](src/app/dicaprev/plandetrabajo/mock-data.ts)
- Documentación mock: [src/app/dicaprev/documentacion/mock-data.ts](src/app/dicaprev/documentacion/mock-data.ts)
- DS44 mock local adicional: [src/app/dicaprev/ds44/obligaciones/page.tsx](src/app/dicaprev/ds44/obligaciones/page.tsx)

Evaluación por prioridad de migración a DB:
- Prioridad 1: empresa, trabajadores, centros, áreas, cargos, documentos y cumplimiento.
- Prioridad 2: acreditaciones, plan de trabajo y evidencias.
- Prioridad 3: biblioteca, reportes derivados y dashboards agregados.

## 7. Inventario de stores/localStorage

Stores runtime/singleton:
- [src/lib/empresa/empresa-store.ts](src/lib/empresa/empresa-store.ts)
- [src/lib/centros/centros-store.ts](src/lib/centros/centros-store.ts)
- [src/lib/dotacion/dotacion-store.ts](src/lib/dotacion/dotacion-store.ts)
- [src/lib/vehiculos/vehiculos-store.ts](src/lib/vehiculos/vehiculos-store.ts)
- [src/lib/capacitacion/capacitacion-store.ts](src/lib/capacitacion/capacitacion-store.ts)
- [src/lib/auditoria/audit-store.ts](src/lib/auditoria/audit-store.ts)
- [src/lib/acreditaciones/hallazgo-acreditacion-store.ts](src/lib/acreditaciones/hallazgo-acreditacion-store.ts)
- [src/app/dicaprev/plandetrabajo/store.ts](src/app/dicaprev/plandetrabajo/store.ts)

Persistencia local detectada:
- Empresa plantillas/store: [src/lib/empresa/plantillas.ts](src/lib/empresa/plantillas.ts#L452), [src/lib/empresa/empresa-store.ts](src/lib/empresa/empresa-store.ts#L274)
- Plan de trabajo: [src/app/dicaprev/plandetrabajo/store.ts](src/app/dicaprev/plandetrabajo/store.ts#L161)
- Documentación: [src/app/dicaprev/documentacion/hooks/useDocumentos.ts](src/app/dicaprev/documentacion/hooks/useDocumentos.ts#L135)

## 8. Recomendación de modelo de datos

Entidades principales recomendadas:
- Tenant, Empresa, Usuario, Rol, Permiso.
- CentroTrabajo, Area, Cargo, Puesto, Dotacion.
- Trabajador.
- TipoDocumento, DocumentoPlantilla, DocumentoEmpresa, DocumentoTrabajador, DocumentoVersion.
- Acreditacion, AcreditacionDocumento, AcreditacionHistorial.
- ObligacionDS44, EvaluacionCumplimiento, Hallazgo, Evidencia, HistorialHallazgo.
- PlanTrabajo, ActividadPlan, EvidenciaActividad, HistorialPlan.
- Notificacion, AuditLog.
- Archivo (metadatos de storage externo).

Relaciones críticas:
- Multi-tenant estricto por tenantId en todas las tablas de negocio.
- Versionado de documentos con tabla separada DocumentoVersion.
- Hallazgo vinculado opcionalmente a trabajador, centro y obligación.
- Evidencias vinculadas a hallazgo y/o actividad de plan según dominio.
- AuditLog con referencia a actor, recurso, acción, before/after y tenant.

Campos críticos mínimos:
- id, tenantId, createdAt, updatedAt, createdBy, updatedBy en recursos de negocio.
- estados normalizados por enum en backend.
- soft delete con deletedAt en recursos sensibles.

## 9. Recomendación de arquitectura backend

Arquitectura objetivo:
- Next.js App Router con server components por defecto.
- Capa de acceso a datos por repository/service.
- Server actions o route handlers para mutaciones con validación robusta.
- Validación compartida con Zod (input/output) en frontend y backend.
- Autenticación con sesión segura y middleware de autorización.

Capas sugeridas:
- Domain: reglas de negocio y estados válidos.
- Application: casos de uso por módulo.
- Infrastructure: Prisma repositories, storage, notificaciones, auditoría.
- Interface: handlers y componentes UI.

## 10. Estrategia de migración a PostgreSQL/Prisma

Fase 1: Inventario y congelamiento de mocks
- Mapear todas las fuentes mock y stores a entidades destino.
- Definir source of truth por dominio.

Fase 2: Diseño de schema Prisma
- Crear schema base multi-tenant + auth + auditoría + empresa/trabajadores.
- Definir enums de estados de dominio.

Fase 3: Tablas base y migraciones
- Crear migraciones versionadas.
- Crear seed inicial para entorno de desarrollo.

Fase 4: Migración módulo Empresa
- Centros, áreas, cargos, información general, indicadores.
- Eliminar persistencia local de empresa.

Fase 5: Migración Trabajadores y estructura
- CRUD trabajador + documentos obligatorios por rol/cargo.
- Reglas de documental server-side.

Fase 6: Migración Documentos
- Documento corporativo, trabajador, biblioteca y versionado.
- Integrar storage real y metadata.

Fase 7: Migración Cumplimiento DS44
- Obligaciones, evaluaciones, hallazgos, evidencias e historial.
- Mover motor de cálculo al backend.

Fase 8: Migración Acreditaciones
- Solicitudes, plantillas, documentos requeridos, historial y estados.

Fase 9: Auditoría y permisos
- RBAC real por rol y tenant.
- AuditLog persistente con before/after.

Fase 10: Producción
- hardening de seguridad, monitoreo, backup, rollback y runbooks.

## 11. Checklist para producción

Aplicación:
- [ ] Eliminar dependencia crítica de mocks/localStorage.
- [ ] Separar server/client components y reducir use client.
- [ ] Introducir capa backend de dominio.

Seguridad:
- [ ] Auth real (sesión/JWT) + middleware.
- [ ] RBAC por rol y recurso.
- [ ] Isolación multi-tenant en queries y mutaciones.
- [ ] Protección de subida/descarga de archivos (tipo, tamaño, antivirus, URLs firmadas).
- [ ] Headers de seguridad en Next config.

Datos:
- [ ] Prisma schema y migraciones.
- [ ] Seed y estrategia de datos iniciales.
- [ ] Backups y restauración probada.

Calidad:
- [ ] Lint y typecheck en CI.
- [ ] Test unitarios y E2E mínimos por flujos críticos.
- [ ] Observabilidad (logs estructurados + error tracking).

Operación:
- [ ] Deploy con rollback.
- [ ] Monitoreo de performance y errores.
- [ ] Runbook de incidentes.

## 12. Roadmap por fases

Fase A (1-2 semanas): Fundaciones
- Auth, middleware, Prisma bootstrap, schema base, variables de entorno.

Fase B (2-4 semanas): Core de negocio
- Empresa + Trabajadores + Documentos base.

Fase C (4-6 semanas): Cumplimiento y Acreditaciones
- DS44, hallazgos, evidencias, flujo de acreditación.

Fase D (6-7 semanas): Plan de trabajo y Reportes
- Plan anual persistente, reportes sobre datos reales.

Fase E (7-8 semanas): Hardening producción
- Seguridad avanzada, observabilidad, pruebas de carga, UAT y salida.

## 13. Lista priorizada de tareas para Copilot

Prioridad P0:
1. Crear prisma/schema.prisma con entidades base multi-tenant.
2. Implementar auth básica con sesión segura.
3. Crear middleware de protección de rutas privadas.
4. Crear módulo usuarios/roles/permisos con enforcement server-side.
5. Mover auditoría a persistencia real.

Prioridad P1:
6. Reemplazar localStorage de plan/documentación/empresa por API.
7. Unificar fuentes mock de trabajadores y documentos en una sola fuente temporal.
8. Extraer lógica DS44 de frontend a backend.
9. Reescribir primitives UI con tipos fuertes en card/badge/progress.
10. Reducir tamaño de páginas monolíticas por subcomponentes/casos de uso.

Prioridad P2:
11. Implementar validación Zod para formularios y mutaciones.
12. Implementar versionado de documentos y trazabilidad por reemplazo.
13. Unificar rutas alias y consolidar estructura final de módulos.
14. Integrar storage de archivos con URLs firmadas.
15. Añadir paginación y filtros server-side en tablas grandes.

---

## Validaciones técnicas solicitadas

Comandos solicitados por el requerimiento:
- npm run build
- npm run lint
- npm run typecheck

Resultado de ejecución:
- npm run build: OK. Compilación de producción exitosa con Next.js 15.0.3.
- npm run lint: FAIL por script inexistente en [package.json](package.json).
- npm run typecheck: FAIL por script inexistente en [package.json](package.json).

Detalle de estado:
- El build sí completa, pero esta validación no reemplaza un pipeline de calidad.
- Falta agregar scripts de lint y typecheck para control de calidad continuo en CI/CD.
