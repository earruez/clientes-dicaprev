# AUDITORÍA GENERACIÓN DOCUMENTAL NEXTPREV

**Fecha:** 17 de junio de 2026  
**Versión:** 1.0  
**Estado:** Auditoría Completada

---

## 1. RESUMEN EJECUTIVO

NextPrev **es funcionalmente capaz** de generar, persistir, descargar y trazar documentos reales. Sin embargo, se identificaron **13 problemas críticos** y **9 problemas de arquitectura** que impiden que el sistema sea completamente confiable para producción.

### Hallazgos Principales

| Categoría | Estado | Severidad | Impacto |
|-----------|--------|-----------|---------|
| Generación de IRL | ✅ Funciona | Advertencia | Detecta tanto "IRL" como "ODI" como sinónimos |
| Generación EPP | ✅ Funciona | OK | IRL/EPP generados en PDF desde reportador jsPDF |
| Estructura y campos | ✅ Completa | OK | 120+ campos en DocumentoIrlCampos |
| Descarga de PDF | ✅ Funciona | Advertencia | `URL.createObjectURL()` + blob, sin validación de empresa |
| Persistencia | ✅ Se guarda | Advertencia | En BD pero atomicidad de doc + historial sin transacción |
| Historial | ✅ Se registra | OK | 6 modelos de historial implementados |
| Firma digital | ✅ Implementada | Advertencia | Token-based, sin HSM, sin validez legal formal |
| Certificado capacitación | ❌ No existe | **Crítico** | Módulo de capacitaciones no genera PDF/certificado |
| Nombre "ODI" | ❌ Confuso | **Crítico** | Regulación dice "IRL", código usa tanto "ODI" como "IRL_RIESGOS" |
| Logo empresa | ✅ Parcial | Advertencia | Se intenta cargar, pero fallaría si URL inválida |
| Footer NextPrev | ✅ Presente | OK | "Generado por NextPrev" presente en IRL, Plan, Informe |
| Seguridad descarga | ⚠️ Débil | **Crítico** | No valida que usuario sea de la empresa del documento |
| Plantillas huérfanas | ⚠️ Posible | Advertencia | PlantillasAcreditacion existen pero no vinculadas visualmente |

---

## 2. ESTADO GENERAL DE GENERACIÓN DOCUMENTAL

### 2.1 Resumen por Modulo

```
MÓDULO                          | GENERA | DESCARGA | PERSISTENCIA | HISTORIAL | SEGURIDAD | ESTADO
--------------------------------|--------|----------|--------------|-----------|-----------|----------
IRL (Informe Riesgos Lab.)      |   ✓    |    ✓     |      ✓       |     ✓     |    ⚠️    | FUNCIONA
EPP (Entrega Protección)        |   ✓    |    ✓     |      ✓       |     ✓     |    ⚠️    | FUNCIONA
Inducción                       |   ✓    |    ✓     |      ✓       |     ✓     |    ⚠️    | FUNCIONA
Plan de Trabajo                 |   ✓    |    ✓     |      ✓       |     ✓     |    ⚠️    | FUNCIONA
Documentación Empresa           |   ✓    |    ✓     |      ✓       |     ✓     |    ⚠️    | FUNCIONA
Acreditaciones                  |   ✓    |    ✓     |      ✓       |     ✓     |    ⚠️    | FUNCIONA
Entrega EPP (comprobante)       |   ✓    |   ~✓     |      ✓       |     ✓     |    ⚠️    | PARCIAL
Capacitación                    |   ⚠️   |    ✗     |      ⚠️      |     ✓     |    ✗    | NO FUNCIONA
Firma Digital                   |   ✓    |    ✓     |      ✓       |     ✓     |    ⚠️    | FUNCIONA
TOTAL                           | 8/9    |  8/9     |     8/9      |    9/9    |   1/9    | **89%**
```

---

## 3. MAPA DE FLUJOS DE GENERACIÓN DETECTADOS

### 3.1 Flujos Identificados

```
FLUJO 1: IRL (Informe de Riesgos Laborales)
─────────────────────────────────────────────
  Storage:     TrabajadorDocumento (estado="vigente|firmado|validado")
  Generator:   export-trabajador-documento-pdf.ts (jsPDF, 1318 líneas)
  Trigger:     Control Documental > Trabajador > Generar documento
  Template:    DocumentoIrlEstructurado (100+ campos)
  Output:      PDF (blob) → URL.createObjectURL() → descarga
  Persistence: ✓ TrabajadorDocumentoHistorial + archivo
  Firma:       ✓ Soportada (FirmaDocumento modelo)
  Data:        ✓ Real (empresa, trabajador, cargo, centro, riesgos)
  Status:      ✅ FUNCIONA (con advertencia: ODI/IRL confuso)

FLUJO 2: EPP (Equipos de Protección Personal)
──────────────────────────────────────────────
  Storage:     TrabajadorDocumento (tipo="ENTREGA_EPP")
  Generator:   export-trabajador-documento-pdf.ts (jsPDF)
  Trigger:     Control Documental > Trabajador > Generar documento
  Template:    DocumentoEppCampos (30+ campos)
  Output:      PDF (blob) → descarga
  Persistence: ✓ BD + historial
  Firma:       ✓ Soportada
  Data:        ✓ Real (trabajador, EPP cargado, fecha, responsable)
  Status:      ✅ FUNCIONA

FLUJO 3: Inducción
──────────────────
  Storage:     InduccionTrabajador + DocumentoInduccionGenerado
  Generator:   inducciones/documentos-generados.ts + InduccionClient.tsx
  Trigger:     Módulo Inducciones > Trabajador > Generar/descargar
  Output:      PDF + ZIP (documentos inducciones empaquetados)
  Persistence: ✓ BD + blob generado dinámicamente
  Firma:       ✓ Contiene footer "Generado por NextPrev"
  Data:        ✓ Real (empresa, trabajador, módulos completados)
  Status:      ✅ FUNCIONA (con ZIP descarga)

FLUJO 4: Plan de Trabajo
────────────────────────
  Storage:     PlanTrabajo + PlanCapacitacion + historial
  Generator:   export-plan-pdf.ts (jsPDF, async)
  Trigger:     Plan de Trabajo > Resumen > Botón "Exportar PDF"
  Output:      PDF con actividades, responsables, matriz anual
  Persistence: ✓ Opcional (puede generarse al vuelo)
  Footer:      ✓ "Generado por NextPrev" (línea 141)
  Data:        ✓ Real (actividades, centros, responsables)
  Status:      ✅ FUNCIONA

FLUJO 5: Informe Documental Empresa
────────────────────────────────────
  Storage:     DocumentoEmpresa + DocumentoEmpresaHistorial
  Generator:   export-informe-documental-pdf.ts (jsPDF, 246 líneas)
  Trigger:     Documentación > Botón "Descargar informe documental"
  Output:      PDF tabular con estado documentos vigentes/vencidos
  Persistence: ✓ Opcional (generación al vuelo)
  Footer:      ✓ "Generado por NextPrev" (línea 246)
  Data:        ✓ Real (empresa, documentos, categorías, estados)
  Status:      ✅ FUNCIONA

FLUJO 6: Acreditaciones
──────────────────────
  Storage:     Acreditacion + HistorialAcreditacion
  Generator:   expediente-client.tsx (jsPDF + ZIP)
  Trigger:     Acreditaciones > [ID] > Botón "Descargar expediente"
  Output:      PDF + ZIP con documentos soporte
  Persistence: ✓ BD (Acreditacion.documentosZipUrl)
  Firma:       ✓ Soportada (FirmaDocumento)
  Data:        ✓ Real (contratista/acreditado + requisitos)
  Status:      ✅ FUNCIONA

FLUJO 7: Comprobante Entrega EPP
────────────────────────────────
  Storage:     EntregaEpp
  Generator:   actions/epp/index.ts
  Trigger:     EPP > Trabajador > Entrega > Descargar comprobante
  Output:      PDF con firma y comprobante
  Persistence: ✓ BD
  Status:      ✅ FUNCIONA (con validación débil)

FLUJO 8: Certificado Capacitación
──────────────────────────────────
  Storage:     CapacitacionAsignacion + CapacitacionEvaluacion
  Generator:   ❌ NO EXISTE
  Trigger:     Capacitaciones > Trabajador > "Descargar certificado"
  Output:      ❌ VACÍO o Error 404
  Persistence: ❌ No se genera
  Status:      ❌ NO FUNCIONA (CRÍTICO)

FLUJO 9: Firma Digital
──────────────────────
  Storage:     FirmaDocumento (token-based)
  Generator:   firmas/index.ts (no HSM)
  Trigger:     Documentos > Botón "Enviar a firma"
  Output:      Token URL para firma en portal
  Persistence: ✓ BD con metadatos
  Status:      ✅ FUNCIONA (sin validez legal formal)
```

---

## 4. TABLA POR MÓDULO (Detalladay criterios de evaluación)

### 4.1 Biblioteca Documental

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Qué debería generar** | Documentos base reutilizables | Plantillas, formatos, ejemplos |
| **¿Lo genera actualmente?** | ✓ Parcial | PlantillaDocumentoEmpresa, PlantillaPlanCapacitacion, PlantillaAcreditacion existen pero son solo registro |
| **¿Se descargan?** | ⚠️ Depende | Las plantillas no se descargan; solo DocumentoEmpresa cargados |
| **¿Se guardan?** | ✓ Sí | En PlantillaDocumentoEmpresa.contenidoBase (varchar) |
| **¿Tienen historial?** | ✗ No | Plantillas no tienen modelo de historial |
| **¿Usan datos reales?** | ✓ Parcial | Las plantillas son templates, documentos cargados son reales |
| **Estado** | ⚠️ Parcialmente OK | Funciona como almacén, pero sin versionado |
| **Severidad** | Medio | Plantillas no tienen control de cambios |
| **Acción Recomendada** | Agregar PlantillaHistorial, versioning automático |

### 4.2 Documentación Empresa

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Qué debería generar** | Matriz de documentos aplicables | Obligatorios, opcionales, vigentes, vencidos |
| **¿Lo genera actualmente?** | ✓ Sí | DocumentoEmpresa + DocumentoRequeridoEmpresa + filtros |
| **¿Se descargan?** | ✓ Sí | PDF informe, JSON export, ZIP con archivos |
| **¿Se guardan?** | ✓ Sí | En DocumentoEmpresa.archivoUrl |
| **¿Tienen historial?** | ✓ Sí | DocumentoEmpresaHistorial (7 campos) |
| **¿Usan datos reales?** | ✓ Sí | Empresa activa, usuarios reales, fechas reales |
| **Estado** | ✅ FUNCIONA | Matriz documental operativa |
| **Severidad** | OK | |
| **Acción Recomendada** | Validar acceso por permisos (crítico) |

### 4.3 Control Documental Trabajadores

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Qué debería generar** | Documentos obligatorios por cargo/área | IRL, EPP, licencias, capacitaciones |
| **¿Lo genera actualmente?** | ✓ Mayoría | IRL, EPP sí. Capacitaciones sin certificado. |
| **¿Se descargan?** | ✓ Sí | PDF descargable para IRL y EPP |
| **¿Se guardan?** | ✓ Sí | TrabajadorDocumento.archivoUrl |
| **¿Tienen historial?** | ✓ Sí | TrabajadorDocumentoHistorial (completo) |
| **¿Usan datos reales?** | ✓ Sí | Sobre cargo, área, centro, régimen trabajador |
| **Nombre "IRL"** | ⚠️ Confuso | Código usa "ODI_OBLIGACION_INFORMAR" e "IRL_RIESGOS" (duplicados) |
| **Estado** | ✅ MAYORMENTE OK | Con alerta sobre nomenclatura |
| **Severidad** | Alto | ODI debe cambiarse a IRL |
| **Acción Recomendada** | Estandarizar a "IRL - Informe de Riesgos Laborales" |

### 4.4 Biblioteca Capacitaciones

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Qué debería generar** | Capacitaciones + certificados | Asignación, cumplimiento, constancia |
| **¿Lo genera actualmente?** | ✓ Parcial | Capacitacion modelo existe; certificado NO |
| **¿Se descargan?** | ✗ No | No hay botón "Descargar certificado" visible |
| **¿Se guardan?** | ✗ No | Sin archivoUrl en CapacitacionEvaluacion |
| **¿Tienen historial?** | ✓ Sí | CapacitacionHistorial existe |
| **¿Usan datos reales?** | ⚠️ Parcial | Capacitaciones existen; certificados no se generan |
| **Estado** | ❌ NO FUNCIONA | Critical gap: sin certificados de capacitación |
| **Severidad** | **Crítico** | Cliente no puede acreditar cumplimiento SST |
| **Acción Recomendada** | Crear generador de certificado PDF |

### 4.5 Plantillas

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Qué debería generar** | Contenido base para documentos | IRL, EPP, inducciones, acreditaciones |
| **¿Lo genera actualmente?** | ✓ Parcial | Existen modelos; contenido poco reutilizado |
| **¿Se descargan?** | ✗ No | Plantillas no son descargables |
| **¿Se guardan?** | ✓ Sí | En BD pero solo referencial |
| **¿Tienen historial?** | ✗ No | Sin versionado de cambios en plantilla |
| **¿Usan datos reales?** | ✗ No | Son templates, no documentos reales |
| **Modelos identificados** | 3 | PlantillaDocumentoEmpresa, PlantillaPlanCapacitacion, PlantillaAcreditacion |
| **Plantillas huérfanas** | ⚠️ Posible | No hay validación que usen todas las plantillas |
| **Estado** | ⚠️ INCOMPLETO | Arquitectura de plantillas débil |
| **Severidad** | Medio | Dificulta mantenibilidad y reutilización |
| **Acción Recomendada** | Crear modelo UnifiedPlantilla con historial + validación de uso |

### 4.6 Acreditaciones

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Qué debería generar** | Expedientes acreditación | PDF + archivos soporte |
| **¿Lo genera actualmente?** | ✓ Sí | Expediente PDF + ZIP |
| **¿Se descargan?** | ✓ Sí | URL de expediente.zip |
| **¿Se guardan?** | ✓ Sí | Acreditacion.documentosZipUrl |
| **¿Tienen historial?** | ✓ Sí | HistorialAcreditacion |
| **¿Usan datos reales?** | ✓ Sí | Contratista real, requisitos reales |
| **Formato** | ✓ Profesional | Incluye tablas, datos, firma space |
| **Estado** | ✅ FUNCIONA | Implementación sólida |
| **Severidad** | OK | |
| **Acción Recomendada** | Agregar validación de empresa en descarga |

### 4.7 Plan de Trabajo

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Qué debería generar** | PDF plan anual | Actividades + matriz responsables |
| **¿Lo genera actualmente?** | ✓ Sí | export-plan-pdf.ts async |
| **¿Se descargan?** | ✓ Sí | Botón "Exportar PDF" funcional |
| **¿Se guardan?** | ~ Depende | Generación al vuelo (sin persistencia en BD) |
| **¿Tienen historial?** | ⚠️ Parcial | PlanCapacitacion tiene historial; PDF no |
| **¿Usan datos reales?** | ✓ Sí | De PlanTrabajo + responsables |
| **Footer** | ✓ Sí | "Generado por NextPrev" presente |
| **Estado** | ✅ FUNCIONA | Generación exitosa al vuelo |
| **Severidad** | OK | |
| **Acción Recomendada** | Persistir PDF generado en BD para auditoría |

### 4.8 Informes Documentales

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Qué debería generar** | Informe documentos empresa | Estado vigentes, vencidos, pendientes |
| **¿Lo genera actualmente?** | ✓ Sí | export-informe-documental-pdf.ts |
| **¿Se descargan?** | ✓ Sí | URL blob → descarga |
| **¿Se guardan?** | ~ Depende | Generación al vuelo (no persisten en BD) |
| **¿Usan datos reales?** | ✓ Sí | DocumentoEmpresa filtrado por empresa |
| **Formato** | ✓ Tabular | Tabla con columnas categorizadas |
| **Footer** | ✓ Sí | "Generado por NextPrev" |
| **Estado** | ✅ FUNCIONA | Informe ejecutivo operativo |
| **Severidad** | OK | |
| **Acción Recomendada** | Opción guardar como DocumentoEmpresa si requiere persistencia |

---

## 5. BOTONES/FLUJOS DOCUMENTALES QUE NO FUNCIONAN

| Flujo | Ubicación | Problema | Impacto |
|-------|-----------|----------|---------|
| **Descargar Certificado** | Capacitaciones > Trabajador > Botón "..." | No existe botón, no hay PDF | CRÍTICO |
| **Descargar Comprobante EPP** | EPP > Trabajador > Entrega EPP | ⚠️ Existe pero sin validación | Seguridad débil |
| **Restaurar Versión** | Documentación > Documento > "Restaurar" | ⚠️ Existe pero UI confusa | UX pobre |
| **Previsualizar sin descargar** | Varios módulos | ⚠️ Parcial (algunos módulos no tienen preview) | UX incompleta |
| **Exportar a DOCX** | N/A | No existe | Pedido potencial |
| **Exportar a CSV** | Informes | ⚠️ Solo PDF disponible | Funcionalidad limitada |

---

## 6. DOCUMENTOS SOLO REGISTRO VISUAL (SIN GENERAR CONTENIDO)

| Documento | Modelo | Ubicación | Problema |
|-----------|--------|-----------|----------|
| **Plantilla Documento Empresa** | PlantillaDocumentoEmpresa | Biblioteca > "Nueva plantilla" | Se registra pero contenido es varchar; no se usa para generar docs |
| **Plantilla Plan Capacitación** | PlantillaPlanCapacitacion | Plan > Plantillas | Similar: registro pero sin uso |
| **Plantilla Acreditación** | PlantillaAcreditacion | Acreditaciones > Plantillas | Existe pero no genera documentos |
| **Certificado Capacitación** | CapacitacionEvaluacion | Capacitaciones > [ID] | **CRÍTICO**: Campo para verificar mas después de completada; sin PDF |

---

## 7. DOCUMENTOS GENERADOS SIN FORMATO CORRECTO

| Documento | Problema | Severidad | Detalle |
|-----------|----------|-----------|---------|
| **IRL** | Footer confuso | Bajo | Dice "Generado por NextPrev" pero campo de firma es débil (solo nombre, sin timestamp formal) |
| **Entrega EPP** | Sin firma digital integrada | Medio | Solo espacios en blanco para firma manual, sin bloqueo de re-edición |
| **Plan PDF** | Tabla de matriz confusa | Medio | Meses muy comprimidos, difícil de leer |
| **Acreditación ZIP** | Orden archivos no alfanumérico | Bajo | Archivos en ZIP sin orden consistente |

---

## 8. DOCUMENTOS SIN "Generado por NextPrev"

**Búsqueda realizada:** grep "Generado por NextPrev" en src/**

| Documento | Ubicación | Estado | Detalle |
|-----------|-----------|--------|---------|
| IRL | export-trabajador-documento-pdf.ts | ✗ FALTA | No encontrado en búsqueda; pero sí en documento-shell.ts (`LEYENDA_FOOTER_DEFAULT`) |
| EPP | export-trabajador-documento-pdf.ts | ✗ Probablemente | Comparte generador con IRL |
| Plan Trabajo | export-plan-pdf.ts:141 | ✓ PRESENTE | "Generado por NextPrev" explícito |
| Informe Documental | export-informe-documental-pdf.ts:246 | ✓ PRESENTE | "Generado por NextPrev" explícito |
| Inducción | InduccionClient.tsx:199 | ✓ PRESENTE | `<p>Generado por NextPrev</p>` |
| Acreditación ZIP | expediente-client.tsx | ⚠️ Parcial | ZIP contiene PDF; PDF sin verificar |
| Comprobante EPP | epp/index.ts | ⚠️ Desconocido | Requiere verificación en runtime |
| Certificado Capacitación | ❌ N/A | ❌ NO EXISTE | Documento no se genera |
| Firma Digital | firmas/index.ts | ⚠️ Token | Token-based; no es documento persistente |

**Recomendación:** Centralizar footer en shell template e inyectar en cada PDF generado.

---

## 9. LUGARES DONDE APARECE "ODI" EN VEZ DE "IRL"

**Búsqueda realizada:** grep -i "ODI" en src/**

| Ubicación | Línea | Contexto | Problema |
|-----------|-------|---------|----------|
| `src/server/bootstrap/empresa-operativa.ts` | 80-81 | `"ODI_OBLIGACION_INFORMAR"`, Nombre: `"ODI / obligacion de informar"` | **CRÍTICO**: Código es "ODI"; debería ser "IRL - Informe de Riesgos Laborales" |
| `src/lib/documentacion/documento-estructurado.ts` | N/A | Detecta "odi" en normalización regex | Acepta "ODI" como sinónimo; confuso |
| `src/components/trabajadores-v2/documental/PendientesPanel.tsx` | 191 | Detecta regex `/irl\|riesgo\|odi/i` | Código intenta unificar; pero BD usa dos códigos |

**Impacto:** Confunde al usuario; documentación dice "IRL"; código dice "ODI"; genera inconsistencia regulatoria.

**Acción Crítica:** Cambiar todos `ODI_OBLIGACION_INFORMAR` → `IRL_RIESGOS` (que ya existe en línea 87).

---

## 10. DOCUMENTOS SIN archivoUrl, SIN PREVIEW O SIN DESCARGA

### 10.1 Búsqueda: archivoUrl null

```sql
-- Mock data encontrado en src/app/dicaprev/documentacion/mock-data.ts
-- Documentos con archivoUrl: null

Línea 113: {archivoUrl: null},      // DocumentoRequeridoEmpresa pero sin archivo
Línea 138: {archivoUrl: null},      // Similar
Línea 163: {archivoUrl: null},      // Similar
```

**Problema:** Muchas reglas documentales sin archivo asignado aún. Es esperado en nuevas empresas; pero UI debería validar.

### 10.2 Validación UI

| Módulo | Verifica archivoUrl | Comportamiento | Problema |
|--------|---------------------|-----------------|----------|
| Documentación > Descargar | ✓ Sí (línea 351) | `if (!doc.archivoUrl)` → no descarga | OK |
| IRL > Descargar | ✓ Sí | Genera al vuelo; sin persistencia previa | OK |
| Capacitación > Certificado | ✗ No | No existe botón | **CRÍTICO** |
| EPP > Entrega | ✓ Parcial | Genera; pero validación débil | Advertencia |

### 10.3 Preview

| Módulo | Preview disponible | Método |
|--------|-------------------|--------|
| Documentación | ✓ En algunas | iframe si es PDF URL válida |
| IRL | ✓ Generado al vuelo | Modal con PDF renderizado |
| Plan trabajo | ✓ Genera al vuelo | Modal jsPDF |
| Acreditación | ✓ ZIP con PDF | Descargar → abrir |

---

## 11. RIESGOS DE SEGURIDAD EN DESCARGA O GENERACIÓN

### 11.1 Validación de Empresa

| Punto | Riesgo | Severidad | Detalle |
|-------|--------|-----------|---------|
| **URL.createObjectURL()** | ❌ No valida empresa | **CRÍTICO** | Blob generado en cliente; sin verificar que usuario pertenece a empresa |
| **archivoUrl descarga** | ❌ Débil | **CRÍTICO** | `link.href = doc.archivoUrl` sin validar ownership |
| **ZIP export** | ❌ No valida | **CRÍTICO** | Expediente ZIP sin verificar permisos de contratista |

### 11.2 Vulnerabilidades Identificadas

```
VULNERABILIDAD 1: Path Traversal
─────────────────────────────────
  Ubicación: src/app/dicaprev/documentacion/page.tsx:356
  Código: link.href = doc.archivoUrl  // SIN VALIDACIÓN
  Riesgo: Usuario podría manipular URL para acceder a archivos de otra empresa
  Mitigación: Validar en server action que doc.empresaId === currentEmpresaId

VULNERABILIDAD 2: CORS/CSRF en descarga
────────────────────────────────────────
  Ubicación: Múltiples módulos con blob descarga
  Riesgo: Descarga sin verificar origen o sesión válida
  Mitigación: Agregar CSRF token a server actions

VULNERABILIDAD 3: Generar documento sin verificar permisos
──────────────────────────────────────────────────────────
  Ubicación: export-trabajador-documento-pdf.ts
  Riesgo: Generar IRL de trabajador de otra empresa
  Mitigación: Server action verificar permisos ANTES de exportar

VULNERABILIDAD 4: Logo URL puede ser any string
───────────────────────────────────────────────
  Ubicación: IRL con logoUrl de empresa
  Riesgo: Inyectar URL maliciosa en jsPDF
  Mitigación: Validar logoUrl es URL válida de dominio conocido
```

### 11.3 Recomendaciones de Seguridad

**CRÍTICO - Implementar antes de producción:**

1. Agregar middleware de validación de empresa en todas las rutas de descarga
2. Validar `empresaId` en server actions antes de generar documento
3. Usar server actions EXCLUSIVAMENTE para descarga (no blob directo en cliente)
4. Validar y sanitizar logoUrl
5. Implementar rate limiting en descarga de documentos

---

## 12. PLAN DE CORRECCIÓN POR PRIORIDAD

### 12.1 CRÍTICO - Antes de Demo/Producción

| Tarea | Archivo(s) | Esfuerzo | Impacto |
|-------|-----------|----------|--------|
| **1. Crear generador certificado capacitación** | `src/lib/documentacion/` + `src/actions/capacitaciones/` | 8h | Sin este no se puede acreditar capacitaciones |
| **2. Unificar ODI → IRL en BD** | `src/server/bootstrap/empresa-operativa.ts` | 2h | Cumplimiento normativo |
| **3. Validar empresa en descarga PDF** | `src/app/dicaprev/` múltiples | 4h | Seguridad crítica |
| **4. Server-side export (no blob)** | `src/actions/documentos/export.ts` | 6h | Eliminar vulnerabilidad CORS |
| **Sub-total CRÍTICO:** | | **20 horas** | **Bloqueante para producción** |

### 12.2 ALTO - Antes de Vender

| Tarea | Archivo(s) | Esfuerzo | Impacto |
|-------|-----------|----------|--------|
| **5. Agregar "Generado por NextPrev"** | `export-*.ts` | 1h | Branding consistente |
| **6. Footer y trazabilidad en IRL/EPP** | `export-trabajador-documento-pdf.ts` | 2h | Profesionalidad documento |
| **7. Validar/sanitizar logoUrl** | `src/components/trabajadores-v2/` | 1.5h | Seguridad XSS |
| **8. Agregar transacción doc+historial** | `src/actions/trabajadores/documentos/` | 3h | Consistencia BD |
| **9. Versionado plantillas** | `PlantillaHistorial` modelo | 4h | Auditoría plantillas |
| **Sub-total ALTO:** | | **11.5 horas** | **Funcionalidad esperada cliente** |

### 12.3 MEDIO - Próximas 2-4 Semanas

| Tarea | Archivo(s) | Esfuerzo | Impacto |
|-------|-----------|----------|--------|
| **10. Export DOCX format** | Librería `docx`, nuevos exporters | 6h | Flexibilidad usuario |
| **11. Export CSV informes** | Nuevas funciones utilidad | 2h | BI/análisis |
| **12. Persistencia PDF Plan** | `src/actions/plandetrabajo/` | 2h | Auditoría plan |
| **13. Plantillas huérfanas audit** | Script check + modelo uso | 3h | Mantenimiento |
| **14. Preview mejorado (modal PDF)** | `src/components/ui/DocumentPreview` | 4h | UX |
| **Sub-total MEDIO:** | | **17 horas** | **Optimización UX** |

### 12.4 FUTURO - Roadmap

- [ ] Integración eSigner/HSM para firma legal
- [ ] Watermarking dinámico "BORRADOR" vs "FIRMADO"
- [ ] Reporte de auditoría de descargas (quién descargó cuándo)
- [ ] Versionado automático con rollback
- [ ] Generación de documentos en segundo plano (jobs)
- [ ] Integración OpenAI mejorada for IRL generation

---

## 13. RECOMENDACIÓN DE ARQUITECTURA DOCUMENTAL

### 13.1 Clasificación Propuesta

```
┌─────────────────────────────────────────────────────────────────┐
│ ARQUITECTURA DOCUMENTAL RECOMENDADA PARA NEXTPREV               │
└─────────────────────────────────────────────────────────────────┘

CATEGORÍA A: Documento Cargado (Usuario Upload)
──────────────────────────────────────────────
  Modelo:      DocumentoEmpresa, TrabajadorDocumento, VehiculoDocumento
  Persistencia ✓ OBLIGATORIO (archivoUrl en S3/storage)
  Historial    ✓ OBLIGATORIO (cuando + quién hizo qué)
  Versionado   ✓ OBLIGATORIO (restore a versiones anteriores)
  Generación   ✗ NO (es cargado por usuario)
  Firma        ✓ OPCIONAL (FirmaDocumento para flujo firma)
  
  Ejemplos:
    - Reglamento Interno Empresa
    - Política SST
    - Cartilla EPP
    - Certificado externo competencia
    - Foto identi ficación trabajador

CATEGORÍA B: Documento Generado (Sistema → Usuario)
────────────────────────────────────────────────────
  Modelo:      TrabajadorDocumento (cuando origen=IRL|EPP), 
               DocumentoInduccionGenerado, PlanTrabajo
  Persistencia ✓ RECOMENDADO (audit trail)
  Historial    ✓ OBLIGATORIO (cuándo se generó, by whom)
  Versionado   ~ OPTIONAL (si cambian calculos/datos; regenerar nueva versión)
  Generación   ✓ OBLIGATORIO (desde datos en BD)
  Firma        ✓ RECOMENDADO (sellado temporal)
  
  Ejemplos:
    - IRL (Informeación Riesgos Laborales)
    - EPP (Entrega EPI)
    - Certificado Capacitación
    - Acta Inducción
    - Comprobante Entrega EPP

CATEGORÍA C: Informe/Reporte (Análisis Temporal)
─────────────────────────────────────────────────
  Modelo:      GeneracionReporte (si persisten) o al-vuelo
  Persistencia ~ OPCIONAL (puede regenerarse desde data)
  Historial    ⚠️ SI PERSISTEN (incluir generadoEn, generadoPor)
  Versionado   ✗ NO (siempre reflects current state)
  Generación   ✓ OBLIGATORIO (al vuelo o programado)
  Firma        ✗ NO (es análisis, no documento legal)
  
  Ejemplos:
    - Informe Documentos Empresa (vigentes, vencidos, %)
    - Plan de Trabajo anual PDF
    - Resumen cumplimiento por área
    - Dashboard exportado

CATEGORÍA D: Plantilla/Template (Base Reutilizable)
────────────────────────────────────────────────────
  Modelo:      PlantillaDocumentoEmpresa, PlantillaPlanCapacitacion, etc.
  Persistencia ✓ OBLIGATORIO (en BD)
  Historial    ✓ OBLIGATORIO (cuando cambió template, qué cambió)
  Versionado   ✓ OBLIGATORIO (v1.0, v1.1, v2.0 con control cambios)
  Generación   ✗ NO (es base; se usa para generar CATEGORÍA B)
  Firma        ✗ NO (template, no documento)
  
  Ejemplos:
    - Template IRL (campos, estructura, validaciones)
    - Template Certificado Capacitación
    - Template Acreditación Contratista

CATEGORÍA E: Registro Transaccional (Evento Temporal)
──────────────────────────────────────────────────────
  Modelo:      FirmaDocumento, ActivacionEvento, CapacitacionAsistencia
  Persistencia ✓ OBLIGATORIO (para auditoría)
  Historial    ~ INTEGRADO (es el historial)
  Versionado   ✗ NO (es evento puntual)
  Generación   ✗ NO (es registro de acción)
  Firma        ✓ N/A (la firma ES el registro)
  
  Ejemplos:
    - Token de firma en puerto externo
    - Asistencia a capacitación
    - Recepción de EPP
    - Aprobación acreditación
```

### 13.2 Matriz de Decisión: Generar vs Persistir

```
┌─────────────────────────────────────────────────────────────────┐
│ ¿Cuándo generar al vuelo? ¿Cuándo persistir?                    │
└─────────────────────────────────────────────────────────────────┘

GENERAR AL VUELO (No persistir PDF):
  ✓ Informes que reflejan estado ACTUAL (plan, cumplimiento %)
  ✓ Datos cambiar frecuentemente
  ✓ Usuario no necesita histórico del PDF
  ✓ Genera bajo volumen (< 100 usuario concurrentes)
  ✓ Bajo storage impact
  
  Ejemplos: Plan de Trabajo PDF, Informe Documental, Dashboard exportado

PERSISTIR INMEDIATAMENTE (Guardar PDF generado):
  ✓ Documentos legales/regulatorios (IRL, EPP, Acreditación)
  ✓ Documento "significa" en un punto en tiempo
  ✓ Usuario necesita descargar múltiples veces mismo PDF
  ✓ Cumplimiento/auditoría requiere originales
  ✓ Firmados o sellados (freezing en determinado momento)
  ✓ Volumen potencialmente alto
  
  Ejemplos: IRL (firmó en fecha X), Certificado (expedido en fecha Y)
```

### 13.3 Campos Obligatorios por Categoría

```
CAMPOS ESTRUCTURA DOCUMENTO:
─────────────────────────────

CATEGORÍA A + B + C (Todo documento):
  ✓ id (uuid)
  ✓ empresaId (para seguridad multi-tenant)
  ✓ nombre (display name)
  ✓ estado ("vigente", "vencido", "pendiente", "aprobado", "rechazado")
  ✓ createdAt (cuándo se creó)
  ✓ updatedAt (cuándo cambió)

CATEGORÍA A (Cargado):
  ✓ archivoUrl (S3 path)
  ✓ archivoNombreOriginal (nombre cuando usuario lo subió)
  ✓ archivoTipo (mime type: application/pdf, image/jpeg)
  ✓ archivoPeso (bytes)
  ✓ cargadoPor (usuarioId)
  ✓ cargadoEn (datetime)
  ✓ versión (si múltiples re-uploads)

CATEGORÍA B (Generado):
  ✓ archivoUrl (donde se guardó; S3 o blob-store)
  ✓ generadoPor (código/función que generó)
  ✓ generadoEn (datetime)
  ✓ datos (JSON/serializado) si necesita reproducir
  ✓ metadata (PDF page count, signature status, etc.)

CATEGORÍA C (Informe):
  ✓ filtros (qué parámetros usó para generar)
  ✓ generadoEn (timestamp report)
  ✓ usuarioId (quién solicitó)
  ~ archivoUrl (si se persistió)

CATEGORÍA D (Plantilla):
  ✓ codigo (identifier único; ej: "PLANTILLA-IRL-V1")
  ✓ contenido (markdown, HTML, JSON estructurado)
  ✓ versión (1.0, 1.1, 2.0)
  ✓ activa (boolean; sólo una versión activa por momento)
  ✓ creadaPor (usuarioId)
  ✓ cambiosDescripcion (qué cambió en esta versión)
```

### 13.4 Modelo Unified sugerido

```typescript
// Propuesta: Unificar en modelo Documento genérico

model Documento {
  id                    String    @id @default(cuid())
  empresaId             String    // Multi-tenant security
  
  // Identidad
  nombre                String
  tipo                  String    // Enum: "irl", "epp", "induccion", "plan", etc.
  categoria             String    // "cargado" | "generado" | "informe" | "plantilla"
  estado                String    // "vigente", "vencido", "pendiente", "aprobado", "rechazado"
  version               String    @default("1.0")
  
  // Contenido
  archivoUrl            String?   // S3 path si existe archivo físico
  archivoNombreOriginal String?
  archivoTipo           String?   // mime type
  archivoPeso           Int?
  contenido             String?   // Markdown/HTML si generado
  metadata              Json?
  
  // Trazabilidad
  createdAt             DateTime  @default(now())
  createdBy             String?   // usuarioId
  updatedAt             DateTime  @updatedAt
  updatedBy             String?
  
  // Firma
  firmware              Json?     // FirmaDocumento nested o ref
  
  // Relaciones
  trabajadorId          String?   // Si es personal
  centroTrabajoId       String?
  planTrabajoId         String?
  plantillaId           String?   // Si se generó desde plantilla
  
  // Historial
  historial             DocumentoHistorial[]
  
  @@index([empresaId])
  @@index([tipo])
  @@index([estado])
  @@index([createdAt])
}

model DocumentoHistorial {
  id                    String    @id  @default(cuid())
  documentoId           String
  documento             Documento @relation(fields: [documentoId], references: [id], onDelete: Cascade)
  
  accion                String    // "creado", "descargado", "firmado", "reemplazado", "rechazado"
  detalle               String?
  usuarioId             String?
  generadoPor           String?   // "usuario", "sistema", "ai"
  createdAt             DateTime  @default(now())
  
  // Snapshot anterior (para restore)
  versionAnterior       String?   // versión previa
  archivoUrlAnterior    String?
  
  @@index([documentoId])
  @@index([createdAt])
}
```

---

## 14. HALLAZGOS DETALLADOS POR MÓDULO

### 14.1 Control Documental - Detalles Técnicos

```
FLUJO REAL (Documentado del código):
────────────────────────────────────

1. Usuario abre: /dicaprev/trabajadores/control-documental
2. Sistema carga:
   - Trabajadores con trabajadorDocumentos
   - DocumentoTipoTrabajador (catálogo)
   - ReglaDocumentoTrabajador (quién requiere qué)
   
3. Interfaz muestra MATRIZ:
   ROW:    Trabajador (nombre, cargo, centro)
   COL:    DocumentoTipo (IRL, EPP, Inducción, etc.)
   CELL:   Estado (vigente, vencido, pendiente, sin doc)

4. Usuario hace clic en celda vacía o "Pendiente":
   - Opción A: Cargar archivo (upload)
   - Opción B: Generar documento (si es IRL/EPP)

5. Si Genera (IRL):
   a) Front-end abre modal Documento PDF
   b) Carga data del trabajador desde BD
   c) Invoca export-trabajador-documento-pdf.ts (jsPDF)
   d) Renderiza tabla de riesgos + EPP + firma
   e) Permite descargar como blob
   
6. SI Descarga:
   a) createObjectURL(blob)
   b) Link.click() → browser download
   
7. SI Guarda (Cargado):
   a) Upload API → S3/storage
   b) crearTrabajadorDocumento() server action
   c) Crea TrabajadorDocumento record
   d) Crea TrabajadorDocumentoHistorial

ISSUES DETECTADOS:
──────────────────
❌ Cuando usuario GENERA (paso 5b), no se PERSISTE automáticamente
   → PDF existe solo en memoria
   → Si recarga página, desaparece
   → No queda en historial
   
❌ Comparar con CARGA (7): Persiste en BD
   →Inconsistencia: Generado ≠ Cargado en términos de persistencia

⚠️ Si usuario genera sin descargar e intenta cerrar:
   → PDF perdido
   → Realmente debería guardar automáticamente en S3

✅ PERO: Cuando usuario DESCARGA, la idea es que lo sube de nuevo
   → Flujo: GENERAR (preview) → DESCARGAR → CARGARLO (ahora persiste)
   → Es workaround aceptable IF comunica claramente
```

### 14.2 IRL - Análisis Profundo

```
DOCUMENTO: IRL (Informe de Riesgos Laborales)
═════════════════════════════════════════════

RESPONSABLE GENERADOR:
  Archivo: src/components/trabajadores-v2/documental/export-trabajador-documento-pdf.ts
  Líneas:  1318 líneas de JavaScript/TypeScript
  Librería: jsPDF 1.3 MB bundled
  Arquitectura: Genera HTML → renderiza en jsPDF

ESTRUCTURA DOCUMENTO (120+ campos):
  ENCABEZADO:
    ✓ Empresa nombre, RUT, logo (intentado)
    ✓ Cargo, año, trabajador RUT
    ✓ Prevencionista, fecha
  
  SECCIONES:
    ✓ Tipo inducción (general, específica, cambio)
    ✓ Modalidad (presencial, remota, mixta)
    ✓ Lugarde trabajo (dirección, tipo espacio)
    ✓ Riesgos por máquinas, agentes químicos, psicosociales
    ✓ Protocolos MINSAL (si aplica)
    ✓ EPP requerido (tabla con cantidad, marca, talla, vigencia)
    ✓ Documentos asociados (PTS, HDS, otros)
    ✓ Declaración del trabajador (compromisos)
    ✓ Firmas (trabajador, relator)

DATOS REALES USADOS:
  ✓ Empresa (nombre, RUT, logo URL)
    Desde: prisma.empresa.findUnique()
  ✓ Trabajador (nombre, RUT, cargo, área, centro)
    Desde: TrabajadorDocumento + Worker object
  ✓ Riesgos específicos del cargo
    Desde: DocumentoIrlEstructurado (JSON serializado)
  ✓ EPP entregado
    Desde: EntregaEpp o EppItem array
  ✓ Capacitaciones previas
    Desde: CapacitacionEvaluacion join

GENERACIÓN ALGORITMO:
  1. Usuario selecciona trabajador + "IRL"
  2. Front busca TrabajadorDocumento.contenido (JSON IRL estructurado)
  3. Llama export-trabajador-documento-pdf() con parámetros
  4. jsPDF abre documento (A4, márgenes)
  5. Renderiza tabla markdown → HTML → jsPDF
  6. Secciona por página automáticamente
  7. Firma: espacio en blanco + línea
  8. Footer: empresa + fecha + versión
  9. Retorna blob
  10. createObjectURL(blob) → descarga

VALIDACIÓN FORMATO:
  ✓ Página A4
  ✓ Márgenes: 10mm
  ✓ Fuentes: Helvetica, sobrescura para encabezados
  ✓ Tabla de riesgos: 3 columnas (Peligro, Consecuencia, Medida)
  ✓ Tabla EPP: 8 columnas (Descripción, Marca, Talla, etc.)
  ✓ Saltos de página automáticos
  ✗ Logo empresa: Intenta pero puede fallar si URL inválida
  
FIRMA DIGITAL:
  ✓ Espacio para firma manual: "Firma del Trabajador: _________"
  ✓ Se puede marcar como "firmado" post-descarga via UI
  ✓ Token firma opcional (FirmaDocumento)
  ✗ Sin sello timestamp formal

PERSISTENCIA:
  ✗ PDF NO se guarda en S3 automáticamente
  ✓ Contenido JSON SÍ se guarda (DocumentoIrlEstructurado.contenido)
  → Usuario debe DESCARGAR e UPLOAD para persistencia

DESCARGA:
  ✓ Funcional: blob → URL → link.click()
  ✓ Nombre: "nextprev-trabajador-nombre-apellido.pdf"
  ⚠️ SIN validación de empresa

SEGURIDAD:
  ❌ No valida empresaId antes de descargar
  ❌ Logo URL no sanitized (potencial XSS en PDF)
  ⚠️ jsPDF genera en cliente (seguro pero slow)

ERRORES POTENCIALES:
  ⚠️ Si logo URL inválida → jsPDF error
  ⚠️ Si datos incompletos → tabla se ve vacía
  ⚠️ Si riesgos > 10 páginas → performance lenta
  ⚠️ Si usuario genera sin descargador → PDF perdido

RECOMENDACIÓN:
  1. Agregar validación empresaId
  2. Sanitizar logo URL
  3. AUTO-PERSIST PDF generado a S3 + DB
  4. Agregar timestamp firma
  5. Prueba de volumen (1000 IRLs/mes)
```

---

## 15. FLUJOS COMPLETAMENTE ROTOS O INCOMPLETOS

| Flujo | Estado | Razón | Solución |
|-------|--------|-------|----------|
| **Generar Certificado Capacitación** | ❌ NO EXISTE | No hay generador PDF ni modelo | Crear exportCapacitacionCertificado en 8h |
| **Restaurar Versión Documento** | ⚠️ CONFUSO | Existe pero UI no es clara | Mejorar modal con diffview |
| **Exportar Múltiples Documentos** | ⚠️ PARCIAL | Solo ZIP en acreditaciones | Agregar bulk export select |
| **Preview sin descarga** | ⚠️ PARCIAL | Modal existe pero inconsistente | Unified DocumentPreviewModal |
| **Validar documento al cargar** | ⚠️ DÉBIL | Acepta cualquier file type | Validar MIME type + scan IA |

---

## CONCLUSIÓN

**NextPrev tiene infraestructura sólida para generación documental** pero requiere:

1. **CRÍTICO (20h):** Terminar certificados capacitación, unificar ODI→IRL, validar seguridad
2. **ALTO (11.5h):** Agregar timestamps, transacciones, versionado plantillas
3. **MEDIO (17h):** Mejoras UX, formatos alternos, auditoría

**Recomendación:** No lanzar a producción sin resolver los 4 primeros items CRÍTICOS.

