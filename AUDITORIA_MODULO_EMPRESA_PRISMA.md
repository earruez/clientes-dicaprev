# AUDITORIA MODULO EMPRESA vs PRISMA/POSTGRESQL

Fecha: 2026-05-05
Repositorio: clientes-dicaprev
Alcance: rutas del modulo Empresa y sus capas de datos asociadas.

## 1) Resumen ejecutivo

Estado global del modulo Empresa respecto a Prisma/PostgreSQL: BAJO.

- Integracion real en Prisma dentro del dominio Empresa: DocumentoEmpresa y tablas relacionadas.
- Integracion parcial: datos base de Empresa y Usuario existen en DB, pero la UI del modulo Empresa no los consume de Prisma.
- Predominio actual: estado mock/local en cliente (stores en memoria, arreglos hardcodeados, localStorage).
- Riesgo principal: divergencia entre lo que el usuario ve/edita en UI y lo que realmente persiste en DB.

## 2) Inventario real de modelos Prisma (actual)

Modelos presentes en schema:

- Empresa: [prisma/schema.prisma](prisma/schema.prisma#L29)
- Usuario: [prisma/schema.prisma](prisma/schema.prisma#L43)
- DocumentoEmpresa: [prisma/schema.prisma](prisma/schema.prisma#L57)
- DocumentoRequeridoEmpresa: [prisma/schema.prisma](prisma/schema.prisma#L86)
- DocumentoEmpresaHistorial: [prisma/schema.prisma](prisma/schema.prisma#L106)

Hallazgo: no existen modelos dedicados para Centros, Areas, Cargos, Dotacion/Puestos, Trabajadores, Vehiculos en el schema actual.

## 3) Matriz tecnica por pagina/ruta

Leyenda de estado:

- Integrado: usa Prisma/API/Server Actions conectadas a DB.
- Parcial: depende de DB para una parte, pero con fuerte logica mock/local.
- Mock/local: sin integracion Prisma real.

| Pagina/Ruta | Funcion | Fuente actual | Estado | Riesgo | Recomendacion |
|---|---|---|---|---|---|
| /dicaprev/empresa | Hub general de empresa, KPI y plantilla | Datos iniciales hardcodeados (INITIAL_COMPANY_DATA, COMPANY_STATS) + empresaStore en cliente | Mock/local | Alto: KPI y campos no reflejan DB | Crear actions para leer/escribir Empresa y consumirlas desde la pagina. Evidencia: [src/app/dicaprev/empresa/page.tsx](src/app/dicaprev/empresa/page.tsx#L58), [src/app/dicaprev/empresa/page.tsx](src/app/dicaprev/empresa/page.tsx#L75), [src/app/dicaprev/empresa/page.tsx](src/app/dicaprev/empresa/page.tsx#L159) |
| /dicaprev/empresa/informacion-general | Ficha legal/tributaria/contacto | Objeto EMPRESA hardcodeado | Mock/local | Alto: datos legales pueden quedar desalineados | Conectar a tabla Empresa con lectura/escritura. Evidencia: [src/app/dicaprev/empresa/informacion-general/page.tsx](src/app/dicaprev/empresa/informacion-general/page.tsx#L7) |
| /dicaprev/empresa/centros | Gestion ejecutiva de centros | Reexport de componente que usa centros-store (in-memory) | Mock/local | Alto: CRUD no persiste | Migrar a modelo Centro + actions CRUD. Evidencia: [src/app/dicaprev/empresa/centros/page.tsx](src/app/dicaprev/empresa/centros/page.tsx#L1), [src/components/empresa/CentrosTrabajoExecutivePage.tsx](src/components/empresa/CentrosTrabajoExecutivePage.tsx#L129), [src/components/empresa/CentrosTrabajoExecutivePage.tsx](src/components/empresa/CentrosTrabajoExecutivePage.tsx#L205) |
| /dicaprev/empresa/centrotrabajo | Alias funcional de centros | Mismo componente/shared de centros | Mock/local | Medio-Alto: duplicidad de ruta para mismo origen mock | Mantener solo una ruta canonica o asegurar ambas sobre mismo backend real. Evidencia: [src/app/dicaprev/empresa/centrotrabajo/page.tsx](src/app/dicaprev/empresa/centrotrabajo/page.tsx#L1) |
| /dicaprev/empresa/areas | CRUD de areas y cargos basico | empresaStore con datos default + mutaciones cliente | Mock/local | Alto: estructura organizacional no persistida | Crear modelos Area/Cargo y migrar mutaciones a actions. Evidencia: [src/app/dicaprev/empresa/areas/page.tsx](src/app/dicaprev/empresa/areas/page.tsx#L161), [src/app/dicaprev/empresa/areas/page.tsx](src/app/dicaprev/empresa/areas/page.tsx#L189), [src/app/dicaprev/empresa/areas/page.tsx](src/app/dicaprev/empresa/areas/page.tsx#L198) |
| /dicaprev/empresa/cargos | CRUD de cargos | empresaStore en cliente | Mock/local | Alto: cargos/documentos base/caps no persistidos | Backend de Cargo + relaciones a Area y requisitos documentales. Evidencia: [src/app/dicaprev/empresa/cargos/page.tsx](src/app/dicaprev/empresa/cargos/page.tsx#L78), [src/app/dicaprev/empresa/cargos/page.tsx](src/app/dicaprev/empresa/cargos/page.tsx#L94), [src/app/dicaprev/empresa/cargos/page.tsx](src/app/dicaprev/empresa/cargos/page.tsx#L104) |
| /dicaprev/empresa/puestos (dotacion) | Dotacion por posicion | dotacion-store + WORKERS_MOCK | Mock/local | Alto: no hay trazabilidad historica ni persistencia | Crear modelo PosicionDotacion y vinculo a Centro/Cargo/Trabajador. Evidencia: [src/app/dicaprev/empresa/puestos/page.tsx](src/app/dicaprev/empresa/puestos/page.tsx#L65), [src/app/dicaprev/empresa/puestos/page.tsx](src/app/dicaprev/empresa/puestos/page.tsx#L130), [src/lib/dotacion/dotacion-store.ts](src/lib/dotacion/dotacion-store.ts#L43) |
| /dicaprev/empresa/trabajadores | Maestro de trabajadores | TRABAJADORES_MOCK en estado local; placeholders Firestore | Mock/local | Critico: entidad core sin persistencia real | Crear modelo Trabajador y endpoints/actions completos CRUD + relaciones. Evidencia: [src/app/dicaprev/empresa/trabajadores/page.tsx](src/app/dicaprev/empresa/trabajadores/page.tsx#L66), [src/app/dicaprev/empresa/trabajadores/page.tsx](src/app/dicaprev/empresa/trabajadores/page.tsx#L290), [src/app/dicaprev/empresa/trabajadores/page.tsx](src/app/dicaprev/empresa/trabajadores/page.tsx#L605) |
| /dicaprev/empresa/vehiculos | Maestro de vehiculos/equipos | vehiculos-store en memoria (CRUD local) | Mock/local | Alto: estado documental sin persistencia transaccional | Crear modelo Vehiculo y DocumentoVehiculo; mover evaluacion documental a capa dominio compartida. Evidencia: [src/app/dicaprev/empresa/vehiculos/page.tsx](src/app/dicaprev/empresa/vehiculos/page.tsx#L74), [src/app/dicaprev/empresa/vehiculos/page.tsx](src/app/dicaprev/empresa/vehiculos/page.tsx#L158), [src/lib/vehiculos/vehiculos-store.ts](src/lib/vehiculos/vehiculos-store.ts#L110) |
| /dicaprev/empresa/vehiculos/[id] | Detalle documental de vehiculo | getVehiculoById/updateVehiculo/updateDocumento desde store local | Mock/local | Alto: edicion de documentos sin auditoria real | Persistir historico de documentos y vencimientos en DB. Evidencia: [src/app/dicaprev/empresa/vehiculos/[id]/page.tsx](src/app/dicaprev/empresa/vehiculos/[id]/page.tsx#L23), [src/app/dicaprev/empresa/vehiculos/[id]/page.tsx](src/app/dicaprev/empresa/vehiculos/[id]/page.tsx#L139) |
| /dicaprev/empresa/documentacion | Biblioteca documental de empresa (vista legacy) | BIBLIOTECA_MOCK + evaluarEstadoDocumento mock | Mock/local | Alto: doble fuente con Documentacion principal | Consolidar en /dicaprev/documentacion (Prisma) o reutilizar sus actions/API. Evidencia: [src/app/dicaprev/empresa/documentacion/page.tsx](src/app/dicaprev/empresa/documentacion/page.tsx#L23), [src/app/dicaprev/empresa/documentacion/page.tsx](src/app/dicaprev/empresa/documentacion/page.tsx#L83) |
| /dicaprev/empresa/indicadores-sst | KPI SST | Arreglo INDICADORES hardcodeado | Mock/local | Medio: indicadores sin respaldo de calculo ni historico | Crear tabla/metricas SST y pipeline de calculo mensual. Evidencia: [src/app/dicaprev/empresa/indicadores-sst/page.tsx](src/app/dicaprev/empresa/indicadores-sst/page.tsx#L10) |
| /dicaprev/empresa/resumen | Tablero resumen empresa | Hook useResumenEmpresa con mockData local | Mock/local | Alto: resumen puede contradecir modulos reales | Componer resumen desde consultas reales a tablas dominio. Evidencia: [src/app/dicaprev/empresa/resumen/page.tsx](src/app/dicaprev/empresa/resumen/page.tsx#L16), [src/app/dicaprev/empresa/resumen/hooks/useResumenEmpresa.ts](src/app/dicaprev/empresa/resumen/hooks/useResumenEmpresa.ts#L4) |
| /dicaprev/empresa/organigrama | Organigrama por area/centro/cargo/trabajador | empresaStore + centros-store + MOCK_WORKERS | Mock/local | Alto: estructura visual no confiable para operacion | Alimentar arbol con consultas reales de Area/Cargo/Centro/Trabajador. Evidencia: [src/app/dicaprev/empresa/organigrama/page.tsx](src/app/dicaprev/empresa/organigrama/page.tsx#L34), [src/app/dicaprev/empresa/organigrama/page.tsx](src/app/dicaprev/empresa/organigrama/page.tsx#L1251), [src/app/dicaprev/empresa/organigrama/page.tsx](src/app/dicaprev/empresa/organigrama/page.tsx#L1264) |

## 4) Hallazgos de arquitectura de datos

### 4.1 Stores locales actuales (sin Prisma)

- empresa-store con defaults + localStorage: [src/lib/empresa/empresa-store.ts](src/lib/empresa/empresa-store.ts#L9), [src/lib/empresa/empresa-store.ts](src/lib/empresa/empresa-store.ts#L236), [src/lib/empresa/empresa-store.ts](src/lib/empresa/empresa-store.ts#L274)
- centros-store en memoria: [src/lib/centros/centros-store.ts](src/lib/centros/centros-store.ts#L4), [src/lib/centros/centros-store.ts](src/lib/centros/centros-store.ts#L64), [src/lib/centros/centros-store.ts](src/lib/centros/centros-store.ts#L100)
- vehiculos-store en memoria: [src/lib/vehiculos/vehiculos-store.ts](src/lib/vehiculos/vehiculos-store.ts#L4), [src/lib/vehiculos/vehiculos-store.ts](src/lib/vehiculos/vehiculos-store.ts#L110), [src/lib/vehiculos/vehiculos-store.ts](src/lib/vehiculos/vehiculos-store.ts#L224)
- dotacion-store en memoria: [src/lib/dotacion/dotacion-store.ts](src/lib/dotacion/dotacion-store.ts#L4), [src/lib/dotacion/dotacion-store.ts](src/lib/dotacion/dotacion-store.ts#L43), [src/lib/dotacion/dotacion-store.ts](src/lib/dotacion/dotacion-store.ts#L88)

### 4.2 Brechas directas contra produccion

- No hay persistencia transaccional para CRUD core de Empresa (excepto documentacion principal fuera de esta carpeta).
- No hay llaves foraneas entre Centro, Area, Cargo, Trabajador, Dotacion, Vehiculo porque esos modelos no existen aun.
- Existe riesgo de doble fuente documental entre Empresa/Documentacion legacy y Documentacion principal.

## 5) Modelos faltantes para produccion (propuesta minima)

Prioridad P0 (base organizacional):

- Centro
- Area
- Cargo
- Trabajador
- PosicionDotacion (o DotacionPuesto)

Prioridad P1 (movilidad/equipos):

- Vehiculo
- DocumentoVehiculo
- HistorialVehiculo (opcional inicial)

Prioridad P1/P2 (gobierno SST):

- IndicadorSSTPeriodo
- ResumenEmpresaSnapshot (si se requiere historizacion de dashboard)

Relaciones sugeridas (alto nivel):

- Empresa 1-N Centro
- Empresa 1-N Area
- Area 1-N Cargo
- Centro N-M Trabajador (o 1-N segun regla operativa)
- Cargo 1-N Trabajador
- Centro + Cargo 1-N PosicionDotacion
- Vehiculo N-1 Centro
- Vehiculo 1-N DocumentoVehiculo

## 6) Orden recomendado de migracion (sin romper UI)

1. Centro
2. Area
3. Cargo
4. Trabajador
5. Dotacion/Puestos
6. Vehiculo + DocumentoVehiculo
7. Organigrama (lectura agregada)
8. Resumen e Indicadores SST (lectura agregada)
9. Retiro progresivo de stores mock/localStorage

Estrategia de rollout:

- Fase A: crear modelos + actions read-only y feature flags de lectura.
- Fase B: activar CRUD real por modulo (centros/areas/cargos/trabajadores).
- Fase C: migrar dotacion y vehiculos.
- Fase D: apagar mocks y limpiar deuda tecnica.

## 7) Conclusiones

- El modulo Empresa esta mayormente en modo mock/local.
- Prisma actualmente cubre sobre todo Documentacion de Empresa (fuera de varias vistas legacy de Empresa).
- Para pasar a estado productivo, la prioridad debe ser persistir entidades maestras (Centro, Area, Cargo, Trabajador) y luego las dependientes (Dotacion, Vehiculos).
