# Plan de Accion

Roadmap ejecutable para futuras tareas por agentes. Todas las fases deben trabajarse en ramas separadas, sin modificar `main` directamente y sin avanzar de fase sin instruccion explicita.

## Fase 18.1 Generacion automatica de documentos por eventos

- Estado: pendiente.
- Objetivo: activar generacion de documentos cuando ocurran eventos internos definidos.
- Alcance: identificar eventos, reglas de disparo, datos requeridos y puntos de integracion sin redisenar la UI.
- Restricciones: no ejecutar esta fase hasta recibir instruccion explicita; no modificar `.env`; no instalar librerias sin aprobacion; no romper flujos existentes.
- Archivos probables: `src/app`, `src/lib`, `src/server`, `prisma/schema.prisma`, `prisma/migrations`, `scripts`.
- Criterios de aceptacion: eventos definidos, generacion controlada, errores trazables y textos visibles en espanol.
- Validaciones: `npm run lint`, `npm run typecheck`, `npm run build`, `npx prisma generate` si aplica.
- Riesgos: duplicacion de documentos, eventos incompletos, dependencias con datos faltantes.
- Condiciones para detenerse: falta definicion del evento, cambio exige `.env`, se requiere rediseno o se necesita migracion no aprobada.

## Fase 18.2 Estados documentales especializados

- Estado: pendiente.
- Objetivo: ampliar estados para documentos segun ciclo operacional y legal.
- Alcance: modelar estados, transiciones, visualizacion y filtros necesarios.
- Restricciones: mantener compatibilidad con estados existentes; no reemplazar flujos vigentes sin plan de migracion.
- Archivos probables: `prisma/schema.prisma`, `src/app`, `src/components`, `src/lib`.
- Criterios de aceptacion: estados claros, transiciones validas, UI coherente con el diseno actual.
- Validaciones: lint, typecheck, build y generacion Prisma si cambia el modelo.
- Riesgos: estados ambiguos, perdida de historial, consultas inconsistentes.
- Condiciones para detenerse: estados no definidos, impacto en datos productivos sin migracion clara o reglas contradictorias.

## Fase 18.3 Firma virtual/digital base

- Estado: pendiente.
- Objetivo: definir base tecnica para registro de firmas y consentimiento.
- Alcance: modelo de firma, datos minimos, trazabilidad basica y validaciones iniciales.
- Restricciones: no prometer validez legal no implementada; no integrar servicios externos sin aprobacion.
- Archivos probables: `prisma/schema.prisma`, `src/lib`, `src/server`, `src/app`.
- Criterios de aceptacion: estructura persistente, evidencia minima y mensajes en espanol.
- Validaciones: lint, typecheck, build y Prisma generate si aplica.
- Riesgos: interpretacion legal incorrecta, evidencia insuficiente, permisos mal aplicados.
- Condiciones para detenerse: falta criterio legal, dependencia externa no aprobada o cambio exige secretos.

## Fase 18.4 Firma de documentos

- Estado: pendiente.
- Objetivo: permitir firma de documentos dentro del flujo documental.
- Alcance: acciones de firma, control de estado, registro de usuario y fecha.
- Restricciones: reutilizar componentes existentes; no redisenar pantallas completas sin instruccion.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`, `prisma/schema.prisma`.
- Criterios de aceptacion: documento firmable, estado actualizado, evidencia visible y errores manejados.
- Validaciones: lint, typecheck, build y pruebas manuales del flujo.
- Riesgos: firmas duplicadas, permisos insuficientes, documentos firmados con datos incompletos.
- Condiciones para detenerse: falta definicion de roles, datos obligatorios ausentes o impacto legal no resuelto.

## Fase 18.5 Auditoria legal y trazabilidad

- Estado: pendiente.
- Objetivo: registrar acciones relevantes para auditoria y seguimiento.
- Alcance: eventos auditables, metadatos, consulta basica y resguardo de historial.
- Restricciones: no eliminar historial existente; no exponer datos sensibles innecesarios.
- Archivos probables: `prisma/schema.prisma`, `src/server`, `src/lib`, `src/app`.
- Criterios de aceptacion: acciones clave registradas, consulta trazable y permisos respetados.
- Validaciones: lint, typecheck, build y revision de consultas.
- Riesgos: exceso de registros, datos sensibles expuestos, perdida de contexto.
- Condiciones para detenerse: alcance legal ambiguo, permisos no definidos o impacto alto sin aprobacion.

## Fase 18.6 Carga masiva de trabajadores

- Estado: pendiente.
- Objetivo: habilitar carga controlada de trabajadores desde archivos estructurados.
- Alcance: validacion, previsualizacion, importacion, errores por fila y resumen.
- Restricciones: no sobreescribir datos sin confirmacion; mantener compatibilidad con modelos existentes.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`, `prisma/schema.prisma`.
- Criterios de aceptacion: archivo validado, errores claros, importacion segura y resultado auditable.
- Validaciones: lint, typecheck, build y pruebas con archivos de ejemplo.
- Riesgos: duplicados, datos incompletos, carga parcial sin trazabilidad.
- Condiciones para detenerse: reglas de duplicidad no definidas, formato ambiguo o datos criticos sin validacion.

## Fase 18.7 Generador de documentos base

- Estado: pendiente.
- Objetivo: crear documentos base a partir de plantillas y datos internos.
- Alcance: plantillas, combinacion de datos, generacion y almacenamiento controlado.
- Restricciones: los documentos generados deben incluir `Generado por NextPrev`; no mencionar marcas externas especificas.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`, `public`.
- Criterios de aceptacion: documento generado correctamente, contenido en espanol y datos consistentes.
- Validaciones: lint, typecheck, build y revision visual de documentos de muestra.
- Riesgos: plantillas incompletas, datos mal formateados, archivos generados no trazables.
- Condiciones para detenerse: plantilla no aprobada, datos requeridos ausentes o generacion no verificable.

## Fase 18.8 Alertas y bandejas de trabajo

- Estado: pendiente.
- Objetivo: organizar tareas, vencimientos y alertas operativas.
- Alcance: reglas de alerta, bandejas por rol, estados y filtros.
- Restricciones: no saturar la UI; mantener patrones visuales existentes.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`, `prisma/schema.prisma`.
- Criterios de aceptacion: alertas utiles, filtros funcionales y permisos respetados.
- Validaciones: lint, typecheck, build y pruebas de roles.
- Riesgos: exceso de alertas, calculos costosos, estados desactualizados.
- Condiciones para detenerse: reglas de prioridad no definidas, roles ambiguos o consultas ineficientes sin alternativa.

## Fase 18.9 Control avanzado de contratistas

- Estado: pendiente.
- Objetivo: fortalecer control documental y operativo de contratistas.
- Alcance: relaciones, estados, cumplimiento, filtros y vistas necesarias.
- Restricciones: no romper modelo multiempresa; no duplicar entidades existentes.
- Archivos probables: `prisma/schema.prisma`, `src/app`, `src/components`, `src/lib`, `src/server`.
- Criterios de aceptacion: contratistas distinguibles, cumplimiento visible y datos trazables.
- Validaciones: lint, typecheck, build y revision de relaciones Prisma si aplica.
- Riesgos: mezcla de empresas, permisos cruzados, duplicidad documental.
- Condiciones para detenerse: relaciones no claras, permisos no definidos o impacto multiempresa inseguro.

## Fase 18.10 Reportes ejecutivos

- Estado: pendiente.
- Objetivo: entregar reportes resumidos para gestion y seguimiento.
- Alcance: indicadores, filtros, vistas de resumen y exportacion si se aprueba.
- Restricciones: no incorporar graficos o librerias nuevas sin aprobacion; reutilizar componentes existentes.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`.
- Criterios de aceptacion: metricas correctas, filtros claros y carga razonable.
- Validaciones: lint, typecheck, build y contraste de datos contra consultas base.
- Riesgos: metricas mal definidas, consultas lentas, interpretacion incorrecta.
- Condiciones para detenerse: indicadores no definidos, datos insuficientes o exportacion sin formato aprobado.

## Fase 18.11 IA generadora asistida

- Estado: pendiente.
- Objetivo: asistir la generacion de contenido documental bajo control humano.
- Alcance: borradores, sugerencias, revision y aprobacion manual.
- Restricciones: no integrar servicios externos ni instalar dependencias sin aprobacion; mantener supervision humana.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`.
- Criterios de aceptacion: salida editable, advertencias claras y trazabilidad de aprobacion.
- Validaciones: lint, typecheck, build y pruebas con casos controlados.
- Riesgos: contenido incorrecto, exceso de confianza, datos sensibles en prompts.
- Condiciones para detenerse: falta politica de uso, dependencia externa no aprobada o manejo de datos sensibles no resuelto.
