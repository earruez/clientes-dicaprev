# Plan de Accion

Roadmap ejecutable para futuras tareas por agentes. Todas las fases deben trabajarse en ramas separadas, sin modificar `main` directamente y sin avanzar de fase sin instruccion explicita.

## Comando estandar para Codex

"Lee AGENTS.md y PLAN_ACCION.md. Ejecuta la siguiente fase pendiente en orden. Trabaja en rama separada. No avances a otra fase. Si la fase toca Prisma, permisos, firma, documentos legales o datos sensibles, primero entrega plan tecnico breve y espera aprobacion. Al terminar abre PR hacia main."

## Reglas generales de ejecucion

- Antes de editar, confirmar que la rama activa no sea `main`.
- Leer los archivos probables antes de modificarlos.
- Mantener cambios acotados a la fase activa.
- No modificar `.env`, `node_modules`, `.next` ni archivos generados.
- No instalar dependencias sin aprobacion explicita.
- No redisenar UI salvo instruccion explicita.
- Mantener textos visibles en espanol.
- Para documentos generados por la app, usar `Generado por NextPrev`.
- Si una fase requiere Prisma, permisos, firma, documentos legales o datos sensibles, detenerse primero con plan tecnico breve y esperar aprobacion.

## Fase 18.1 Generacion automatica de documentos por eventos

- Estado: pendiente.
- Objetivo operativo: generar documentos internos cuando ocurran eventos definidos del sistema, sin accion manual repetitiva y sin alterar flujos existentes.
- Alcance: detectar eventos disponibles, definir disparadores, crear servicio de generacion, registrar resultados y manejar errores.
- Pasos tecnicos sugeridos: revisar modelo documental actual; buscar rutas o acciones que crean trabajadores, empresas, capacitaciones, vehiculos o cumplimiento; identificar datos minimos por tipo de documento; proponer plan si hay cambios Prisma; implementar servicio reutilizable; conectar solo eventos aprobados; agregar manejo de idempotencia; validar con casos controlados.
- Archivos probables: `src/app`, `src/lib`, `src/server`, `src/components`, `prisma/schema.prisma`, `prisma/migrations`, `scripts`.
- Funciones existentes que debe buscar: `crearDocumento`, `generarDocumento`, `Documento`, `TrabajadorDocumento`, `DocumentoEmpresa`, `capacitacion`, `cumplimiento`, `vehiculo`, `trabajador`, `empresa`, `reconciliar`.
- Condiciones para pedir aprobacion: cambios en Prisma; nuevas reglas legales; nuevos tipos documentales; cambios en permisos; escritura automatica masiva; uso de datos sensibles; instalacion de librerias.
- Criterio exacto de exito: al ejecutar el evento aprobado se crea exactamente el documento esperado, con datos correctos, sin duplicados, con registro de estado y con errores visibles en espanol si falta informacion.
- Validaciones requeridas: `npm run lint`; `npm run typecheck`; `npm run build`; `npx prisma generate` si toca Prisma; prueba manual del evento implementado; revision de que no se modifico `.env`.
- Riesgos: duplicacion documental, eventos incompletos, reglas ambiguas, datos obligatorios ausentes.
- Formato de reporte final: rama usada; evento implementado; archivos modificados; validaciones ejecutadas; casos probados; riesgos pendientes; link del PR.
- Instruccion de cierre: no avanzar a la Fase 18.2.

## Fase 18.2 Estados documentales especializados

- Estado: pendiente.
- Objetivo operativo: ordenar documentos por estados especificos que permitan seguimiento operacional, revision, vencimiento, firma y cierre.
- Alcance: definir estados, transiciones, permisos de cambio, filtros y visualizacion basica sin reemplazar flujos vigentes sin migracion aprobada.
- Pasos tecnicos sugeridos: inventariar estados actuales; buscar enums, constantes o strings de estado; mapear pantallas que muestran documentos; proponer transiciones; pedir aprobacion si cambia Prisma; implementar helpers de estado; ajustar filtros o badges existentes; validar compatibilidad con datos actuales.
- Archivos probables: `prisma/schema.prisma`, `src/app`, `src/components`, `src/lib`, `src/server`.
- Funciones existentes que debe buscar: `estado`, `Estado`, `Documento`, `TrabajadorDocumento`, `DocumentoEmpresa`, `badge`, `filtro`, `cumplimiento`, `vencimiento`.
- Condiciones para pedir aprobacion: migracion de estados existentes; cambios Prisma; eliminacion o renombre de estados; impacto en permisos; cambios masivos de datos.
- Criterio exacto de exito: cada documento muestra un estado valido, las transiciones no permiten estados imposibles y los filtros siguen funcionando con datos existentes.
- Validaciones requeridas: `npm run lint`; `npm run typecheck`; `npm run build`; `npx prisma generate` si toca Prisma; prueba manual de listado y cambio de estado.
- Riesgos: perdida de historial, estados ambiguos, consultas inconsistentes, UI confusa.
- Formato de reporte final: estados agregados o ajustados; transiciones permitidas; archivos modificados; validaciones; riesgos; PR.
- Instruccion de cierre: no avanzar a la Fase 18.3.

## Fase 18.3 Firma virtual/digital base

- Estado: pendiente.
- Objetivo operativo: crear la base tecnica para registrar consentimiento, identidad, fecha y evidencia minima de una firma dentro del sistema.
- Alcance: modelo o estructura de firma, registro de evidencia, validaciones iniciales y mensajes al usuario sin prometer validez legal no implementada.
- Pasos tecnicos sugeridos: revisar modelos de usuario, trabajador y documento; identificar donde se guarda historial documental; preparar plan tecnico antes de editar por tocar firma y datos sensibles; esperar aprobacion; implementar modelo o estructura aprobada; crear helpers de registro; agregar validaciones de identidad y permisos.
- Archivos probables: `prisma/schema.prisma`, `src/lib`, `src/server`, `src/app`, `src/components`.
- Funciones existentes que debe buscar: `User`, `Usuario`, `Trabajador`, `Documento`, `Session`, `auth`, `getServerSession`, `firma`, `Firmar`, `auditoria`.
- Condiciones para pedir aprobacion: siempre antes de implementar; cambios Prisma; registro de datos personales; definicion de evidencia legal; permisos de firma; dependencia externa.
- Criterio exacto de exito: una firma queda registrada con documento, firmante, fecha, origen aprobado y estado trazable, sin exponer datos sensibles innecesarios.
- Validaciones requeridas: `npm run lint`; `npm run typecheck`; `npm run build`; `npx prisma generate` si toca Prisma; prueba manual de registro; revision de permisos.
- Riesgos: evidencia insuficiente, datos sensibles expuestos, expectativas legales incorrectas, permisos mal aplicados.
- Formato de reporte final: plan aprobado; estructura implementada; evidencia registrada; archivos modificados; validaciones; riesgos legales pendientes; PR.
- Instruccion de cierre: no avanzar a la Fase 18.4.

## Fase 18.4 Firma de documentos

- Estado: pendiente.
- Objetivo operativo: permitir que documentos habilitados sean firmados desde el flujo correspondiente y queden con estado actualizado.
- Alcance: accion de firma, validacion de permisos, actualizacion de estado, registro de evidencia y feedback visible.
- Pasos tecnicos sugeridos: leer implementacion base de firma; identificar pantallas de documentos; preparar plan tecnico y esperar aprobacion por firma y documentos legales; reutilizar botones, dialogos y estilos existentes; conectar accion server-side; bloquear firmas duplicadas; mostrar resultado en espanol.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`, `prisma/schema.prisma`.
- Funciones existentes que debe buscar: `firmar`, `firma`, `Documento`, `TrabajadorDocumento`, `DocumentoEmpresa`, `Button`, `Dialog`, `toast`, `auth`, `permisos`.
- Condiciones para pedir aprobacion: siempre antes de implementar; cambio de permisos; cambio Prisma; nuevo flujo legal; firma masiva; dependencia externa.
- Criterio exacto de exito: un usuario autorizado firma un documento habilitado una sola vez, el estado cambia correctamente y queda evidencia consultable.
- Validaciones requeridas: `npm run lint`; `npm run typecheck`; `npm run build`; `npx prisma generate` si toca Prisma; prueba manual de firmado autorizado y bloqueo no autorizado.
- Riesgos: firmas duplicadas, documentos incompletos, permisos insuficientes, estado inconsistente.
- Formato de reporte final: flujo firmado; roles probados; archivos modificados; validaciones; limitaciones; PR.
- Instruccion de cierre: no avanzar a la Fase 18.5.

## Fase 18.5 Auditoria legal y trazabilidad

- Estado: pendiente.
- Objetivo operativo: registrar eventos relevantes para que acciones documentales, firmas y cambios sensibles sean auditables.
- Alcance: definir eventos auditables, guardar metadatos minimos, consultar trazabilidad y proteger datos sensibles.
- Pasos tecnicos sugeridos: buscar registros existentes de auditoria o logs; identificar acciones criticas; preparar plan tecnico por datos sensibles y trazabilidad legal; esperar aprobacion; implementar helper central; conectar solo acciones aprobadas; revisar permisos de lectura.
- Archivos probables: `prisma/schema.prisma`, `src/server`, `src/lib`, `src/app`, `scripts`.
- Funciones existentes que debe buscar: `auditoria`, `trazabilidad`, `log`, `historial`, `Documento`, `Usuario`, `User`, `Empresa`, `createdAt`, `updatedAt`.
- Condiciones para pedir aprobacion: siempre antes de implementar; cambios Prisma; datos personales; retencion de evidencia; exposicion de historial; cambios en permisos.
- Criterio exacto de exito: cada accion aprobada crea un registro con actor, fecha, entidad, accion y metadatos minimos consultables por usuarios autorizados.
- Validaciones requeridas: `npm run lint`; `npm run typecheck`; `npm run build`; `npx prisma generate` si toca Prisma; prueba manual de registro y consulta.
- Riesgos: registrar datos sensibles de mas, ruido excesivo, permisos de auditoria incorrectos, perdida de contexto.
- Formato de reporte final: eventos auditados; metadatos guardados; archivos modificados; validaciones; riesgos; PR.
- Instruccion de cierre: no avanzar a la Fase 18.6.

## Fase 18.6 Carga masiva de trabajadores

- Estado: pendiente.
- Objetivo operativo: importar trabajadores desde archivos estructurados con validacion previa, errores por fila y proteccion contra duplicados.
- Alcance: carga de archivo, parseo, validacion, previsualizacion, confirmacion, importacion y resumen.
- Pasos tecnicos sugeridos: revisar modelos de trabajador, empresa, cargo y area; buscar utilidades de importacion existentes; preparar plan si se procesan datos sensibles; definir columnas requeridas; implementar parser con librerias ya instaladas; crear validacion por fila; confirmar antes de escribir; registrar resultado.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`, `prisma/schema.prisma`, `scripts`.
- Funciones existentes que debe buscar: `Trabajador`, `Empresa`, `Cargo`, `Area`, `xlsx`, `importar`, `carga`, `validar`, `rut`, `duplicado`.
- Condiciones para pedir aprobacion: tratamiento de datos personales; cambios Prisma; reglas de duplicidad; carga masiva con escritura; instalacion de librerias.
- Criterio exacto de exito: un archivo valido muestra previsualizacion, importa trabajadores sin duplicados y reporta errores por fila sin escribir registros invalidos.
- Validaciones requeridas: `npm run lint`; `npm run typecheck`; `npm run build`; prueba manual con archivo valido, archivo con errores y archivo con duplicados.
- Riesgos: duplicados, datos incompletos, asociacion incorrecta a empresa, carga parcial sin trazabilidad.
- Formato de reporte final: formato soportado; columnas requeridas; casos probados; archivos modificados; validaciones; PR.
- Instruccion de cierre: no avanzar a la Fase 18.7.

## Fase 18.7 Generador de documentos base

- Estado: pendiente.
- Objetivo operativo: generar documentos base usando plantillas internas y datos existentes, con salida consistente y trazable.
- Alcance: seleccionar plantilla, combinar datos, generar archivo o vista imprimible, almacenar resultado si corresponde y mostrar errores claros.
- Pasos tecnicos sugeridos: revisar generadores existentes y documentos temporales; buscar uso de PDF, plantillas o archivos; preparar plan por documentos legales; esperar aprobacion si aplica; reutilizar utilidades existentes; asegurar leyenda `Generado por NextPrev`; validar contenido en espanol.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`, `public`, `scripts`.
- Funciones existentes que debe buscar: `generar`, `documento`, `plantilla`, `pdf`, `jspdf`, `Documento`, `TrabajadorDocumento`, `DocumentoEmpresa`, `download`.
- Condiciones para pedir aprobacion: documento legal; cambios Prisma; almacenamiento persistente; nuevas plantillas oficiales; instalacion de librerias; datos sensibles.
- Criterio exacto de exito: el documento generado contiene datos correctos, texto en espanol, leyenda `Generado por NextPrev` y salida verificable sin romper flujos existentes.
- Validaciones requeridas: `npm run lint`; `npm run typecheck`; `npm run build`; prueba manual de generacion; revision visual del documento resultante.
- Riesgos: plantillas incompletas, errores de formato, datos sensibles expuestos, documentos no trazables.
- Formato de reporte final: plantilla usada; salida generada; archivos modificados; validaciones; capturas o descripcion de revision visual; PR.
- Instruccion de cierre: no avanzar a la Fase 18.8.

## Fase 18.8 Alertas y bandejas de trabajo

- Estado: pendiente.
- Objetivo operativo: mostrar tareas pendientes, vencimientos y alertas accionables segun rol o contexto.
- Alcance: reglas de alerta, calculo de pendientes, bandejas filtrables, estados y enlaces a acciones existentes.
- Pasos tecnicos sugeridos: revisar dashboard y listados actuales; buscar campos de vencimiento y cumplimiento; definir reglas minimas; pedir aprobacion si toca permisos o datos sensibles; crear consultas reutilizables; usar componentes existentes; evitar notificaciones invasivas.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`, `prisma/schema.prisma`.
- Funciones existentes que debe buscar: `vencimiento`, `alerta`, `pendiente`, `cumplimiento`, `dashboard`, `Documento`, `Trabajador`, `Empresa`, `Rol`, `permisos`.
- Condiciones para pedir aprobacion: cambios de permisos; nuevas reglas criticas; cambios Prisma; calculos masivos; datos sensibles.
- Criterio exacto de exito: la bandeja muestra alertas correctas por rol, permite filtrar, no duplica tareas y enlaza a la accion correspondiente.
- Validaciones requeridas: `npm run lint`; `npm run typecheck`; `npm run build`; prueba manual con roles o escenarios representativos.
- Riesgos: alertas excesivas, calculos lentos, datos fuera de contexto, permisos incorrectos.
- Formato de reporte final: reglas implementadas; vistas afectadas; archivos modificados; validaciones; riesgos; PR.
- Instruccion de cierre: no avanzar a la Fase 18.9.

## Fase 18.9 Control avanzado de contratistas

- Estado: pendiente.
- Objetivo operativo: fortalecer el seguimiento de contratistas, documentacion asociada y cumplimiento por empresa.
- Alcance: relaciones entre empresas y contratistas, estados de cumplimiento, filtros y vistas operativas.
- Pasos tecnicos sugeridos: revisar modelo multiempresa; buscar entidades actuales de empresa, usuario, trabajadores y documentos; preparar plan por impacto en permisos y datos; esperar aprobacion si cambia Prisma; evitar duplicar entidades; agregar consultas y vistas acotadas.
- Archivos probables: `prisma/schema.prisma`, `src/app`, `src/components`, `src/lib`, `src/server`.
- Funciones existentes que debe buscar: `Empresa`, `UsuarioEmpresa`, `EmpresaModulo`, `DocumentoEmpresa`, `Trabajador`, `cumplimiento`, `contratista`, `permisos`, `Rol`.
- Condiciones para pedir aprobacion: cambios Prisma; relaciones multiempresa; reglas de permisos; migracion de datos; datos sensibles.
- Criterio exacto de exito: contratistas se distinguen sin romper multiempresa, su cumplimiento se calcula con datos existentes y los permisos impiden cruces indebidos.
- Validaciones requeridas: `npm run lint`; `npm run typecheck`; `npm run build`; `npx prisma generate` si toca Prisma; prueba manual de acceso por empresa.
- Riesgos: mezcla de empresas, permisos cruzados, duplicidad documental, consultas pesadas.
- Formato de reporte final: modelo usado; vistas o consultas creadas; archivos modificados; validaciones; riesgos; PR.
- Instruccion de cierre: no avanzar a la Fase 18.10.

## Fase 18.10 Reportes ejecutivos

- Estado: pendiente.
- Objetivo operativo: entregar indicadores resumidos para gestion ejecutiva, con filtros claros y datos consistentes.
- Alcance: metricas principales, consultas, visualizacion resumida y posible exportacion si ya existe soporte.
- Pasos tecnicos sugeridos: revisar dashboards y reportes actuales; buscar consultas de cumplimiento; definir indicadores con formulas explicitas; reutilizar componentes de tablas o graficos existentes; no instalar librerias; validar datos contra consultas base.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`.
- Funciones existentes que debe buscar: `dashboard`, `reporte`, `cumplimiento`, `indicador`, `Empresa`, `Trabajador`, `Documento`, `Vehiculo`, `Capacitacion`.
- Condiciones para pedir aprobacion: nuevos indicadores no definidos; exportacion oficial; cambios Prisma; uso de datos sensibles; necesidad de librerias.
- Criterio exacto de exito: cada indicador muestra formula clara, datos correctos para el filtro aplicado y carga sin errores en build.
- Validaciones requeridas: `npm run lint`; `npm run typecheck`; `npm run build`; prueba manual de filtros; contraste de al menos dos metricas con datos base.
- Riesgos: metricas ambiguas, consultas lentas, interpretacion incorrecta, filtros inconsistentes.
- Formato de reporte final: indicadores incluidos; formulas; archivos modificados; validaciones; riesgos; PR.
- Instruccion de cierre: no avanzar a la Fase 18.11.

## Fase 18.11 IA generadora asistida

- Estado: pendiente.
- Objetivo operativo: asistir la redaccion de borradores documentales con revision humana obligatoria antes de usar contenido generado.
- Alcance: flujo de borrador, edicion, aprobacion manual, trazabilidad y restricciones de datos.
- Pasos tecnicos sugeridos: revisar generadores documentales existentes; definir casos de asistencia permitidos; preparar plan tecnico por datos sensibles y posible dependencia externa; esperar aprobacion; implementar solo un flujo aprobado; asegurar que la salida sea editable y no automatica.
- Archivos probables: `src/app`, `src/components`, `src/lib`, `src/server`.
- Funciones existentes que debe buscar: `generar`, `borrador`, `documento`, `plantilla`, `Documento`, `auditoria`, `aprobacion`, `Usuario`.
- Condiciones para pedir aprobacion: siempre antes de implementar; uso de servicios externos; tratamiento de datos sensibles; instalacion de librerias; generacion de documentos legales.
- Criterio exacto de exito: el sistema crea un borrador editable, muestra advertencia de revision humana y solo permite usarlo tras aprobacion explicita.
- Validaciones requeridas: `npm run lint`; `npm run typecheck`; `npm run build`; prueba manual de crear, editar y aprobar borrador; revision de no exponer datos sensibles innecesarios.
- Riesgos: contenido incorrecto, exceso de confianza, filtracion de datos, falta de trazabilidad.
- Formato de reporte final: caso asistido implementado; controles humanos; archivos modificados; validaciones; riesgos; PR.
- Instruccion de cierre: no avanzar fuera de la Fase 18.11.
