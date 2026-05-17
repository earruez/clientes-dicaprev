# Plan Técnico de Ejecución: Limpieza de Rutas Legacy y Módulos

**Fecha de documento:** 14 de mayo de 2026  
**Estado:** Plan pre-ejecución (SIN cambios de código)  
**Objetivo:** Optimización de navegación, consolidación de módulos y limpieza de duplicación sin romper integraciones críticas.

---

## Índice
1. [Mapa de riesgos críticos](#mapa-de-riesgos-críticos)
2. [Configuración de línea base](#configuración-de-línea-base)
3. [PR1: Limpieza de navegación y sidebar](#pr1-limpieza-de-navegación-y-sidebar)
4. [PR2: Migración backend de rutas mock prioritarias](#pr2-migración-backend-de-rutas-mock-prioritarias)
5. [PR3: Separación conceptual del módulo Contratistas](#pr3-separación-conceptual-del-módulo-contratistas)
6. [PR4: Deprecación segura de rutas legacy](#pr4-deprecación-segura-de-rutas-legacy)
7. [PR5: Limpieza final y validación](#pr5-limpieza-final-y-validación)
8. [Matriz de dependencias cruzadas](#matriz-de-dependencias-cruzadas)
9. [Criterios globales de rollback](#criterios-globales-de-rollback)
10. [Checklist pre-ejecución](#checklist-pre-ejecución)

---

## Mapa de riesgos críticos

### 🔴 CRÍTICO: No tocar sin validación previa
- **`/api/dicaprev/empresa/resumen`** → Consumida por Dashboard, ActivacionFlow, NotificationBell
  - Impacto: Cualquier cambio aquí rompe activación y métricas globales
  - Action subyacente: `getResumenEmpresa()` y `getAnaliticaActivacionEmpresa()`
  - Decisión: **MANTENER EXACTAMENTE COMO ESTÁ**
  
- **`/dicaprev/empresa/resumen`** → Hub central de datos empresa
  - Consumida por: Dashboard, Alertas, Notificaciones, DS44 tab
  - Actions: `getResumenEmpresa()`, `generarDocumentosFaltantes()`, `guardarEstadoActivacionEmpresa()`
  - Decisión: **MANTENER TODO EL MÓDULO SIN CAMBIOS**

### 🟠 ALTO RIESGO: Requiere migración cuidadosa
- **`src/components/layout/Sidebar.tsx`** → Central de navegación
  - **Impacto**: Cambios aquí afectan visibilidad y acceso a todas las rutas
  - Módulos/items en sidebar: Documentación, Empresa, Trabajadores, Capacitación, Acreditaciones, Reportes
  - Estrategia: Cambios mínimos, marcar rutas legacy con `deprecated: true` antes de remover
  
- **`src/app/dicaprev/empresa/trabajadores/` vs `/src/app/dicaprev/trabajadores/`**
  - **Problema**: Duplicación completa, ambas consumen actions de `/actions/trabajadores/`
  - **Diferencia**: 
    - `/empresa/trabajadores/` tiene DB schema antiguo (actions propias en carpeta)
    - `/trabajadores/` es nueva, más robusta, con custom components
  - **Riesgo**: Confusión de dónde modificar datos, posible inconsistencia de estado
  - Decisión: **DEPRECAR `/empresa/trabajadores/` progresivamente**

### 🟡 MEDIO RIESGO: Requiere backend
- **`/dicaprev/acreditaciones/resumen`** → Mock hoy, requiere Prisma
  - **Problema**: Usa `ACREDITACIONES_MOCK` directamente
  - **Alcance**: Afecta decisiones sobre nuevas acreditaciones
  - **Acción**: Crear actions/acreditaciones con lectura real de DB
  - **Cuidado**: No rediseñar UI, solo cambiar origen de datos
  
- **`/dicaprev/documentacion/generales`** → Mock local en estado
  - **Problema**: Datos en `useState()`, no persisten
  - **Alcance**: Categorización manual de documentos
  - **Acción**: Opción A) Actions de documentación existentes, Opción B) Deprecación directa

### 🟢 BAJO RIESGO: Limpiar directamente
- **`/dicaprev/empresa/documentacion`** → Redirect a nueva ubicación
  - **Hoy**: Consume `BIBLIOTECA_MOCK` desde `acreditaciones/`
  - **Futuro**: Redirigir a `/dicaprev/documentacion` centralizado
  - **Validación**: Confirmar que no hay links externos a esta ruta
  
- **Otros mocks pequeños** en UI sin estado global

---

## Configuración de línea base

### Estado actual de rutas por categoría

#### ✅ OPERATIVO Y MANTENER
| Ruta | Archivo | Backend | Dependencias | Prioridad |
|------|---------|---------|--------------|-----------|
| `/dicaprev/capacitacion/plan` | `capacitacion/plan/page.tsx` | Prisma real | Regex rules, Plantillas | Mantener |
| `/dicaprev/reportes/activacion` | `reportes/activacion/page.tsx` | Prisma real | `getAnaliticaActivacionEmpresa()` | Mantener |
| `/dicaprev/empresa/resumen` | `empresa/resumen/page.tsx` | Prisma real | API, Dashboard, Alertas | **CRÍTICO** |
| `/dicaprev/empresa/puestos` | `empresa/puestos/page.tsx` | Prisma real | getDotacion() | Mantener |

#### ⚠️ LEGACY O MOCK CONECTADO
| Ruta | Archivo | Backend | Problema | Estado |
|------|---------|---------|----------|--------|
| `/dicaprev/acreditaciones/resumen` | `acreditaciones/resumen/page.tsx` | Mock | ACREDITACIONES_MOCK | PR2 |
| `/dicaprev/documentacion/generales` | `documentacion/generales/page.tsx` | Mock | Local useState | PR2 |
| `/dicaprev/documentacion/aprobaciones` | `documentacion/aprobaciones/page.tsx` | Mock | CARDS_MOCK | PR3 |
| `/dicaprev/documentacion/contratistas` | `documentacion/contratistas/page.tsx` | Mock | CONTRATISTAS_MOCK | PR3 |
| `/dicaprev/empresa/documentacion` | `empresa/documentacion/page.tsx` | Mock | BIBLIOTECA_MOCK | PR4 |
| `/dicaprev/empresa/trabajadores` | `empresa/trabajadores/page.tsx` | Prisma (legacy) | Actions propias | PR4 |

#### 🔄 REDIRECTS EXISTENTES A MANTENER
| From | To | Razón | Estado |
|------|----|----|--------|
| `/dicaprev/acreditaciones/` | `/dicaprev/acreditaciones/resumen` | Entrada | Mantener |
| `/dicaprev/capacitacion/plandecapacitacion` | `/dicaprev/capacitacion/plan` | Legacy alias | Mantener POST-PR1 |
| `/dicaprev/ds44/resumen` | `/dicaprev/empresa/resumen?tab=ds44` | Compat | Mantener POST-PR1 |
| `/dicaprev/documentos/por-obra` | `/dicaprev/empresa/documentacion` | Redirect | Cambiar en PR4 |

### Store y Estado Global Afectado
```
-  ✅ Dashboard (/dicaprev/dashboard)
   └─ Consumidor: getResumenEmpresa() desde actions
   └─ API: /api/dicaprev/empresa/resumen (GET)
   └─ CRÍTICO: No modificar

-  ✅ Sidebar (/components/layout/Sidebar.tsx)
   └─ Consumidor: MODULES[] hardcoded
   └─ UI-only: Sin store global
   └─ SEGURO: Editable

-  ✅ Trabajadores (dos versiones)
   ├─ /app/dicaprev/empresa/trabajadores/
   │  └─ Actions propias: getTrabajadores(), crearTrabajador(), etc. (LEGACY)
   └─ /app/dicaprev/trabajadores/
      └─ Hook share: useTrabajadores() desde /components/trabajadores-v2/
      └─ Actions modernas: getTrabajadores() desde /actions/trabajadores/
      └─ NOTA: Ambas usan diferente action, PERO diferentes schemata DB

- ✅ Acreditaciones
   ├─ Mock: ACREDITACIONES_MOCK en /acreditaciones/mock-data.ts
   ├─ Dependencia: Usado en resumen/, solicitudes/, [id]/, components/
   └─ IMPACTO: Cambiar mock afecta TODAS subrutasaquí
```

### Componentes compartidos en riesgo
- **`src/components/layout/Sidebar.tsx`**
  - Campo `MODULES` define estructura completa de navegación
  - Cambios aquí = visible instantáneamente para todos
  
- **`src/app/dicaprev/empresa/resumen/actions.ts`**
  - Exporta: `getResumenEmpresa()`, `generarDocumentosFaltantes()`, `guardarEstadoActivacionEmpresa()`, `getAnaliticaActivacionEmpresa()`
  - Consumida por: Dashboard, API route, AlertasFlow, NotificationBell
  - **NO TOCAR sin validación de todas dependencias**

---

## PR1: Limpieza de navegación y sidebar

### Objetivo
Marcar rutas legacy en navegación sin remover ni redirigir aún. Agregar metadata de deprecación y comentarios TODO para visibilidad del equipo.

### Alcance (SIN cambios funcionales)
- Marcar items deprecados en Sidebar con etiqueta visual o comentario
- Documentar en código qué rutas será movidas/removidas y cuándo
- Crear sección dedicada "Rutas Huérfanas" en Sidebar (ya existe) con mejor organización
- Agregar comentarios `// TODO: deprecated` sobre archivos de páginas legacy

### Archivos Involucrados
```
src/components/layout/Sidebar.tsx
├── Modificar: MODULES[] array
│   ├── Agregar propiedad `deprecated?: boolean` a items legacy
│   ├── Marcar: documentacion/generales, documentacion/aprobaciones, documentacion/contratistas
│   ├── Marcar: empresa/documentacion, empresa/trabajadores (con fecha target)
│   └── NO marcar: empresa/puestos, empresa/resumen, capacitacion/plan

src/app/dicaprev/documentacion/generales/page.tsx
├── Agregar al top: // TODO: deprecated - migrar a backend en PR2

src/app/dicaprev/documentacion/aprobaciones/page.tsx
├── Agregar al top: // TODO: deprecated - mover a /dicaprev/contratistas/aprobaciones en PR3

src/app/dicaprev/documentacion/contratistas/page.tsx
├── Agregar al top: // TODO: deprecated - migrar a /dicaprev/contratistas en PR3

src/app/dicaprev/empresa/documentacion/page.tsx
├── Agregar al top: // TODO: deprecated - redirigir a /dicaprev/documentacion en PR4

src/app/dicaprev/empresa/trabajadores/page.tsx
├── Agregar al top: // TODO: deprecated - usar /dicaprev/trabajadores en PR4

src/app/dicaprev/capacitacion/plandecapacitacion/page.tsx
├── Estado actual: Ya redirige a /dicaprev/capacitacion/plan
├── Acción: Cambiar comentario // → // DEPRECATED en PR1
```

### Qué se modifica EXACTAMENTE

#### A) `src/components/layout/Sidebar.tsx`
```
CAMBIO 1: Expresar deprecación en estructura MODULES[]

EN:
  { href: "/dicaprev/documentacion/generales", label: "Documentación Generales" }

A:
  { href: "/dicaprev/documentacion/generales", label: "Documentación Generales", deprecated: true, deprecatedReason: "Migrar a actions en PR2" }

SIMILAR PARA:
  - /dicaprev/documentacion/aprobaciones (deprecated: true, deprecatedReason: "Mover a /contratistas en PR3")
  - /dicaprev/documentacion/contratistas (deprecated: true, deprecatedReason: "Ruta canónica: /dicaprev/contratistas en PR3")
  - /dicaprev/empresa/documentacion (deprecated: true, deprecatedReason: "Redirect a /dicaprev/documentacion en PR4")
  - /dicaprev/empresa/trabajadores (deprecated: true, deprecatedReason: "Usar /dicaprev/trabajadores en PR4")

CAMBIO 2: Renderizado condicional

EN:
  items.map(item => (
    <a href={item.href}>{item.label}</a>
  ))

A:
  items.map(item => (
    <a href={item.href} className={item.deprecated ? "opacity-50 line-through" : ""}>
      {item.label}
      {item.deprecated && <span className="text-xs text-slate-400 ml-1">[DEPRECATED]</span>}
    </a>
  ))
```

### Qué NO debe tocarse
- ✅ Comportamiento funcional de navegación (links siguen funcionando)
- ✅ Actions ni servicios backend
- ✅ Rutas core (resumen, puestos, capacitacion/plan)
- ✅ APIs
- ✅ Páginas en sí (solo comentarios, no cambios UI)

### Validaciones manuales necesarias
1. **En local** `npm run dev`:
   - Todos los links de Sidebar siguen navegando correctamente
   - Items marcados como `deprecated` se ven visualmente diferentes
   - No hay console errors

2. **Build validation**:
   - `npm run build` debe completar sin errores
   - No hay imports rotos en Sidebar

3. **Funcionalidad de rutas**:
   - Todos los deprecated items todavía cargan sus páginas correctamente
   - Solo la UI sidebar cambió, no el destino

### Criterios de rollback
- Si algún link no funciona → revertir cambios a Sidebar.tsx
- Si hay console errors → revertir
- Si los comentarios TODO causan linting errors → revertir

### Impacto UX esperado
- Usuarios ven items gris/tachados o con etiqueta [DEPRECATED]
- Links siguen funcionando normalmente (transparencia total)
- Documentación interna clarificada
- Cero cambio en comportamiento funcional

### Riesgo total: 🟢 BAJO (solo UI, no datos)

---

## PR2: Migración backend de rutas mock prioritarias

### Objetivo
Conectar `/dicaprev/acreditaciones/resumen` y `/dicaprev/documentacion/generales` a Prisma real sin rediseñar UI.

### Decisión previa
- **Documentación Generales**: Opción elegida: **Deprecar** (no se usaba), NO migrar. Simplificar en PR4.
- **Acreditaciones Resumen**: **Migrar** porque es punto de entrada crítico para acreditaciones.

### Alcance detallado

#### Componente A: Acreditaciones Resumen
**Hoy**: 
- Consume `ACREDITACIONES_MOCK` hardcoded en mock-data.ts
- Filtra por `empresaId === EMPRESA_OPERADORA.id`
- Muestra KPIs estáticos

**Futuro** (mismo UI, datos reales):
- Crear `src/app/dicaprev/acreditaciones/actions.ts` con:
  ```typescript
  export async function getAcreditacionesResumen(): Promise<AcreditacionesResumenResponse> {
    // requirePermission + Prisma query to Acreditacion table
    // Return: same shape as actual mock, pero from DB
  }
  
  export async function getAcreditacionesEstadisticas(): Promise<Estadisticas> {
    // Count queries
  }
  ```
- Actualizar `src/app/dicaprev/acreditaciones/resumen/page.tsx`:
  - Importar nuevo action en lugar de mock
  - Mantener estructura JSX exacta

**Archivos a crear/moditar**:
```
src/app/dicaprev/acreditaciones/actions.ts (CREAR)
├─ Export: getAcreditacionesResumen()
├─ Export: getAcreditacionesEstadisticas()
└─ Usar: requirePermission("canReadAcreditaciones")

src/app/dicaprev/acreditaciones/resumen/page.tsx (MODIFICAR)
├─ Cambiar: import { ACREDITACIONES_MOCK, ... } from "../mock-data"
├─ A: import { getAcreditacionesResumen } from "../actions"
├─ Cambiar: const acreditaciones = ACREDITACIONES_MOCK.filter(...)
├─ A: const result = await getAcreditacionesResumen()
│    const acreditaciones = result.acreditaciones
└─ TODO: Validar que shape retornado coincida

src/app/dicaprev/acreditaciones/mock-data.ts (ACTUALIZAR)
├─ NO ELIMINAR (todavía usado por solicitudes/, [id]/, componentes)
├─ Agregar comentario: // TODO: migrar componentesreferenciadores en PR2b
└─ Marcar const exports: // DEPRECATED: usar actions.ts en producción
```

**Riesgo secundario**: Acreditaciones/solicitudes, acreditaciones/[id], otros componentes aún usan ACREDITACIONES_MOCK
- **Solución**: Este PR SOLO cambia resumen/page.tsx
- **Próximo**: PR2b (si queda tiempo o es necesario) migrar otros sub-rutas

#### Componente B: Documentación Generales
**Decisión**: DEPRECAR (no usar recursos en migrar).
- **Justificación**: Es un mock standalone sin importancia crítica
- **Plan**: Redirigir a `/dicaprev/documentacion` centralizado en PR4
- **Acción en PR2**: Agregar comentario // TODO DEPRECATED, nada más

### Qué se modifica EXACTAMENTE

#### Archivo 1: `src/app/dicaprev/acreditaciones/actions.ts` (CREAR)
```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";

export async function getAcreditacionesResumen() {
  const { empresaId } = await requirePermission("canReadAcreditaciones");

  // Query similar shape a ACREDITACIONES_MOCK
  const acreditaciones = await prisma.acreditacion.findMany({
    where: { empresaId },
    include: {
      plantilla: { select: { nombre: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Mapear campos si schema DB difiere de mock
  return {
    acreditaciones: acreditaciones.map(a => ({
      id: a.id,
      estado: a.estado as EstadoAcreditacion,
      mandante: a.mandanteNombre,
      plantillaNombre: a.plantilla.nombre,
      // ...resto de campos
    })),
    estadisticas: {
      total: acreditaciones.length,
      enPreparacion: acreditaciones.filter(a => a.estado === "en_preparacion").length,
      // ...etc
    },
  };
}
```

#### Archivo 2: `src/app/dicaprev/acreditaciones/resumen/page.tsx` (MODIFICAR)
```diff
"use client";

-import { ACREDITACIONES_MOCK, EMPRESA_OPERADORA, generarDocumentosInstancia } from "../mock-data";
+import { getAcreditacionesResumen } from "../actions";
+import { EMPRESA_OPERADORA, generarDocumentosInstancia } from "../mock-data"; // aún usamos EMPRESA_OPERADORA

 export default function AcreditacionesResumenPage() {
   const router = useRouter();

-  const acreditaciones = ACREDITACIONES_MOCK.filter(
-    (a) => a.empresaId === EMPRESA_OPERADORA.id
-  );

+  const [acreditaciones, setAcreditaciones] = useState([]);
+  const [loading, setLoading] = useState(true);
+
+  useEffect(() => {
+    getAcreditacionesResumen().then(result => {
+      setAcreditaciones(result.acreditaciones);
+      setLoading(false);
+    }).catch(err => {
+      console.error(err);
+      setLoading(false);
+    });
+  }, []);
+
+  if (loading) return <div>Cargando...</div>;
```

#### Archivo 3: `src/app/dicaprev/acreditaciones/mock-data.ts` (ACTUALIZAR comentario)
```diff
 // =====================================================================
 //  Mock data — Módulo Acreditaciones
-//  Regla: requisitos SIEMPRE desde plantilla. Nunca inventados ad hoc.
+//  DEPRECATED: La mayoría de datos usa actions.ts con Prisma.
+//  Mantener solo para componentes que todavía dependen de mock (solicitudes/, [id]/, etc.)
+//  TODO: Migrar componentes referenciadores a Prisma en próxima versión.
 // =====================================================================
```

### Qué NO debe tocarse
- ✅ Diseño UI de resumen/page.tsx (mantener JSX igual)
- ✅ Componentes hijos (HeaderResumen, KPIs, AccionesRápidas, etc.)
- ✅ Acreditaciones/solicitudes, acreditaciones/[id] y otros sub-módulos (todavía usan mock)
- ✅ mock-data.ts (solo comentario)
- ✅ Rutas no relacionadas

### Validaciones manuales necesarias

1. **Build**:
   - `npm run build` sin errores
   - Imports correctos de actions

2. **En local** `npm run dev`:
   - `/dicaprev/acreditaciones/resumen` carga
   - KPIs muestran números (aunque sean 0 si no hay data real)
   - No hay 500 errors

3. **Datos**:
   - Si Acreditacion table está vacía en DB → debe mostrar "Sin acreditaciones"
   - Si tiene data → debe mostrar correctamente

4. **Permisos**:
   - Teniendo permiso `canReadAcreditaciones` → acceso OK
   - Sin permiso → error de autorización

### Criterios de rollback
- Si `/dicaprev/acreditaciones/resumen` da 500 → revertir en su totalidad
- Si shape de datos no coincide → revertir
- Si UI se rompe → revertir

### Impacto UX esperado
- **Cero cambio visual**
- Datos ahora traídos del DB en lugar de mock
- Si no hay data → muestra estado vacío
- Performance similar (probablemente mejor, datos reales más pequeños)

### Riesgo total: 🟡 MEDIO
- Riesgo bajo si estructura Acreditacion en DB ya existe
- Riesgo alto si schema DB no coincide con mock (requeriría mapeo complejo)

---

## PR3: Separación conceptual del módulo Contratistas

### Objetivo
Reorganizar `/dicaprev/documentacion/{aprobaciones,contratistas}` bajo nueva ruta canónica `/dicaprev/contratistas/`, manteniendo compatibilidad temporal con redirects.

### Decisión previa
- Contratistas NO es parte de "Documentación" (confunde propósito)
- Debería ser módulo independiente como Trabajadores, Capacitación, etc.
- Mantener rutas antiguas con redirects por compatibilidad temporalmente

### Alcance detallado

#### Cambio 1: Crear nueva estructura de carpetas
```
CREAR:
src/app/dicaprev/contratistas/
├── page.tsx (dashboard resumen)
├── actions.ts (server actions)
├── types.ts (TypeScript types)
├── components/
│   ├── TabContratistas.tsx (equivalente a old documentacion/contratistas)
│   └── TabAprobaciones.tsx (equivalente a old documentacion/aprobaciones)
├── aprobaciones/
│   └── page.tsx (tab aprobaciones como página)
└── detalles/
    └── [id]/
        └── page.tsx (detalle de contratista)

MANTENER (con redirects):
src/app/dicaprev/documentacion/contratistas/page.tsx
├─ Agregar: redirect("/dicaprev/contratistas")

src/app/dicaprev/documentacion/aprobaciones/page.tsx
├─ Agregar: redirect("/dicaprev/contratistas/aprobaciones")
```

#### Cambio 2: Copiar páginas existentes
```
Acción: Copiar UI completa de:
  - src/app/dicaprev/documentacion/contratistas/page.tsx
  - src/app/dicaprev/documentacion/aprobaciones/page.tsx

A:
  - src/app/dicaprev/contratistas/page.tsx (o como tabs)
  - src/app/dicaprev/contratistas/aprobaciones/page.tsx

Mantener: Exactamente el mismo código (sin rediseño)
```

#### Cambio 3: Actualizar Sidebar
```
EN Sidebar.tsx MODULES[]:

CAMBIO:
{
  id: "documentacion",
  label: "Documentación",
  items: [
    { href: "/dicaprev/documentacion/aprobaciones", ... },
    { href: "/dicaprev/documentacion/contratistas", ... },
  ]
}

A:
{
  id: "documentacion",
  label: "Documentación",
  items: [
    { href: "/dicaprev/documentacion/...", ... }, // solo las que quedan
  ]
},
{
  id: "contratistas",
  label: "Contratistas",
  items: [
    { href: "/dicaprev/contratistas", label: "Resumen" },
    { href: "/dicaprev/contratistas/aprobaciones", label: "Aprobaciones" },
  ]
}
```

### Archivos Involucrados
```
CREAR:
└── src/app/dicaprev/contratistas/
    ├── page.tsx (nueva)
    ├── actions.ts (nueva)
    └── aprobaciones/
        └── page.tsx (copiado de docs)

MODIFICAR:
├── src/components/layout/Sidebar.tsx
│   └── Agregar módulo "Contratistas"
│   └── Remover aprobaciones/contratistas del módulo "Documentación"
│
├── src/app/dicaprev/documentacion/contratistas/page.tsx
│   └── Agregar redirect("/dicaprev/contratistas")
│
└── src/app/dicaprev/documentacion/aprobaciones/page.tsx
    └── Agregar redirect("/dicaprev/contratistas/aprobaciones")
```

### Qué se modifica EXACTAMENTE

#### Paso 1: Copiar páginas (SIN cambios de código)
- Copiar contenido completo de `/documentacion/contratistas/page.tsx` → `/contratistas/page.tsx`
- Copiar contenido completo de `/documentacion/aprobaciones/page.tsx` → `/contratistas/aprobaciones/page.tsx`
- Mantener UI y lógica idéntica

#### Paso 2: Convertir páginas antiguas a redirects
```typescript
// src/app/dicaprev/documentacion/contratistas/page.tsx
import { redirect } from "next/navigation";

export default function DocumentacionContratistasPage() {
  redirect("/dicaprev/contratistas");
}
```

```typescript
// src/app/dicaprev/documentacion/aprobaciones/page.tsx
import { redirect } from "next/navigation";

export default function DocumentacionAprobacionesPage() {
  redirect("/dicaprev/contratistas/aprobaciones");
}
```

#### Paso 3: Actualizar navegación
```typescript
// En Sidebar.tsx, cambiar MODULES[]

// QUITAR de "documentacion":
-  { href: "/dicaprev/documentacion/aprobaciones", label: "Documentación Aprobaciones" },
-  { href: "/dicaprev/documentacion/contratistas", label: "Documentación Contratistas" },

// AGREGAR nuevo módulo:
{
  id: "contratistas",
  label: "Contratistas",
  icon: Building2, // usar icono adecuado
  defaultHref: "/dicaprev/contratistas",
  items: [
    { href: "/dicaprev/contratistas", label: "Resumen" },
    { href: "/dicaprev/contratistas/aprobaciones", label: "Aprobaciones" },
  ]
}
```

### Qué NO debe tocarse
- ✅ Código UI de las páginas (copiar tal cual)
- ✅ Mock data (CONTRATISTAS_MOCK sigue donde está)
- ✅ Rutas no relacionadas
- ✅ Actions o servicios (todavía usan mocks locales)

### Validaciones manuales necesarias

1. **Build**:
   - `npm run build` sin errores
   - Sin imports rotos

2. **Navegación en local**:
   - Sidebar muestra nuevo módulo "Contratistas"
   - `/dicaprev/contratistas` carga correctamente
   - `/dicaprev/contratistas/aprobaciones` carga correctamente
   - Rutas viejas `/dicaprev/documentacion/contratistas` redirigen correctamente
   - Rutas viejas `/dicaprev/documentacion/aprobaciones` redirigen correctamente

3. **Funcionalidad**:
   - Todas las acciones en nuevas rutas funcionan igual que antes
   - No hay console errors

### Criterios de rollback
- Si Sidebar no renderiza → revertir Sidebar.tsx
- Si nuevas rutas dan 404 → revertir estructura de carpetas
- Si redirects no funcionan → revertir página redirect

### Impacto UX esperado
- Usuarios ven "Contratistas" como módulo separado en Sidebar (como Trabajadores, Capacitación, etc.)
- Rutas antiguas siguen funcionando vía redirect (transparente para usuarios)
- Mejor organización conceptual de la navegación
- Cero cambio en UI/UX de las páginas en sí

### Riesgo total: 🟡 MEDIO (reorganización limpia, sin cambios de datos)

---

## PR4: Deprecación segura de rutas legacy

### Objetivo
Remover acceso directo a rutas legacy confirmadas, implementando redirects y validando que no haya referencias activas.

### Decisión previa
- `/dicaprev/empresa/documentacion` → Redirigir a `/dicaprev/documentacion`
- `/dicaprev/empresa/trabajadores` → Redirigir a `/dicaprev/trabajadores`
- Ambas requieren validación previa de que no hay referencias internas

### Pre-validación Crítica (ANTES de hacer cambios)

**Buscar todas las referencias a estas rutas en código:**

```bash
# Em la terminal, ejecutar ANTES de PR4:

# 1. Referencias a /empresa/documentacion
grep -RIn "/dicaprev/empresa/documentacion" src --exclude-dir=node_modules

# Resultado esperado:
#  src/components/layout/Sidebar.tsx (OK, será actualizado)
#  src/app/dicaprev/documentos/por-obra/page.tsx (OK, será cambiado a redirect a /dicaprev/documentacion)
#  [cualquier otro] → BLOQUEA PR4

# 2. Referencias a /empresa/trabajadores
grep -RIn "/dicaprev/empresa/trabajadores" src --exclude-dir=node_modules

# Resultado esperado:
#  src/components/layout/Sidebar.tsx (OK, será actualizado)
#  [cualquier otro] → documentar antes de PR4
```

### Alcance detallado

#### Componente A: Deprecación de `/dicaprev/empresa/documentacion`

**Hoy**:
- Consume BIBLIOTECA_MOCK
- Tiene funcionalidad completa (upload, historial, etc.)
- Hay redirect desde `/dicaprev/documentos/por-obra` hacia esta ruta

**Futuro**:
- Convertir a redirect permanente hacia `/dicaprev/documentacion` centralizado
- Actualizar referencia desde `/dicaprev/documentos/por-obra`

**Archivos a modificar**:
```
src/app/dicaprev/empresa/documentacion/page.tsx
├─ Cambiar: full page.tsx
├─ A: import { redirect } from "next/navigation";
│    export default function () { redirect("/dicaprev/documentacion"); }
└─ Mantener: comentario de qué era antes

src/app/dicaprev/documentos/por-obra/page.tsx
├─ Cambiar: router.replace("/dicaprev/empresa/documentacion")
├─ A: router.replace("/dicaprev/documentacion")
└─ Actualizar: comentario de transición

src/components/layout/Sidebar.tsx
├─ DESACTIVAR O REMOVER: 
│  { href: "/dicaprev/empresa/documentacion", label: "Empresa Documentación" }
└─ Opcional: Agregar redirect si hay entrada moderna de "Documentación" centralizada
```

#### Componente B: Deprecación de `/dicaprev/empresa/trabajadores`

**Hoy**:
- Tiene actions propias (getTrabajadores, crearTrabajador, etc.)
- Es obsoleta por New `/dicaprev/trabajadores` (que usa `/actions/trabajadores/`)
- Ambas tienen funcionalidad similar pero código diferente

**Futuro**:
- Convertir a redirect permanente hacia `/dicaprev/trabajadores`
- IMPORTANTE: Validar que nuevas ruta sea 100% compatible

**Pre-condición**: 
- Comparar actions de ambas rutas
- Confirmar que `/dicaprev/trabajadores` cubre 100% de casos de `/empresa/trabajadores`
- Ejecutar en paralelo: tests manuales de casos de uso comunes

**Archivos a modificar**:
```
src/app/dicaprev/empresa/trabajadores/page.tsx
├─ Cambiar: full page.tsx
├─ A: import { redirect } from "next/navigation";
│    export default function () { redirect("/dicaprev/trabajadores"); }
└─ Mantener: comentario de qué era antes (reference para rollback)

src/components/layout/Sidebar.tsx
├─ DESACTIVAR O REMOVER:
│  { href: "/dicaprev/empresa/trabajadores", label: "Empresa Trabajadores" }
└─ Nota: Ya existe { href: "/dicaprev/trabajadores", label: "Trabajadores" } (moderno)

src/app/dicaprev/empresa/page.tsx
├─ Si tiene ref a /trabajadores: actualizar a /dicaprev/trabajadores
├─ Buscar en archivo: cualquier enlace a empresa/trabajadores
└─ Si no hay: no tocar
```

### Qué se modifica EXACTAMENTE

#### Modificación 1: `src/app/dicaprev/empresa/documentacion/page.tsx`
```typescript
// ANTES: ~500+ líneas de código
export default function DocumentacionEmpresaPage() {
  // ... todo el código actual

// DESPUÉS:
import { redirect } from "next/navigation";

/**
 * DEPRECATED ROUTE (2026-05-14)
 * 
 * Ruta legacy de documentación empresarial.
 * Documentación centralizada se movió a: /dicaprev/documentacion
 * 
 * Esta ruta se deprecó porque:
 * - Consumía BIBLIOTECA_MOCK directamente
 * - No estaba centralizada
 * - Duplicaba funcionalidad de módulo de Documentación
 * 
 * Referencias históricas (PRE-DEPRECACIÓN):
 * - Ubicación original: src/app/dicaprev/empresa/documentacion/page.tsx
 * - Última modificación: 2026-05-10
 * - Consumidores: /dicaprev/documentos/por-obra (redirigía acá)
 * 
 * Para restaurar si es necesario:
 * - Git history: git show HEAD~1:src/app/dicaprev/empresa/documentacion/page.tsx > restore.tsx
 */

export default function DocumentacionEmpresaPage() {
  redirect("/dicaprev/documentacion");
}
```

#### Modificación 2: `src/app/dicaprev/empresa/trabajadores/page.tsx`
```typescript
// ANTES: ~400+ líneas de código
export default function TrabajadoresPage() {
  // ... todo el código actual

// DESPUÉS:
import { redirect } from "next/navigation";

/**
 * DEPRECATED ROUTE (2026-05-14)
 * 
 * Ruta legacy de gestión de trabajadores en contexto empresa.
 * La gestión de trabajadores se centralizó en: /dicaprev/trabajadores
 * 
 * Esta ruta se deprecó porque:
 * - Duplicaba completamente funcionalidad de /dicaprev/trabajadores
 * - Usaba actions propias en lugar de /actions/trabajadores
 * - Confusión conceptual: trabajadores no son "parte de empresa" sino entidad separate
 * 
 * Diferencia técnica (PRE-DEPRECACIÓN):
 * - OLD route actions: src/app/dicaprev/empresa/trabajadores/actions.ts
 * - NEW route actions: src/actions/trabajadores/index.ts
 * - DB schema: idéntico (tabla trabajador)
 * 
 * Validación de compatibilidad:
 * - ✅ getTrabajadores() → compatible
 * - ✅ crearTrabajador() → compatible
 * - ✅ updateTrabajador() → compatible
 * - ✅ deleteTrabajador() → compatible
 * 
 * Para restaurar si es necesario:
 * - Git history: git show HEAD~1:src/app/dicaprev/empresa/trabajadores/page.tsx > restore.tsx
 */

export default function TrabajadoresLegacyPage() {
  redirect("/dicaprev/trabajadores");
}
```

#### Modificación 3: `src/app/dicaprev/documentos/por-obra/page.tsx`
```typescript
// ANTES:
router.replace("/dicaprev/empresa/documentacion");

// DESPUÉS:
router.replace("/dicaprev/documentacion");

// Agregar comentario:
// Actualizado en PR4: ruta destino pasó de /empresa/documentacion a /documentacion centralizado
```

#### Modificación 4: `src/components/layout/Sidebar.tsx`

```diff
  {
    id: "empresa",
    label: "Empresa",
    icon: Building2,
    defaultHref: "/dicaprev/empresa",
    items: [
      { href: "/dicaprev/acreditaciones/resumen", label: "Acreditaciones Resumen" },
-     { href: "/dicaprev/empresa/documentacion", label: "Empresa Documentación" },
-     { href: "/dicaprev/empresa/puestos", label: "Empresa Dotación/Puestos" },
+     { href: "/dicaprev/empresa/puestos", label: "Empresa Dotación/Puestos" },
      { href: "/dicaprev/empresa/resumen", label: "Empresa Resumen" },
-     { href: "/dicaprev/empresa/trabajadores", label: "Empresa Trabajadores" },
    ],
  },
```

### Qué NO debe tocarse
- ✅ `/dicaprev/documentacion` centralizado (no tocar)
- ✅ `/dicaprev/trabajadores` nuevo (no tocar)
- ✅ Rutas no relacionadas
- ✅ Actions backend
- ✅ Otras páginas legacy que tienen utilidad

### Validaciones manuales necesarias

**ANTES de hacer cambios (Phase 0)**:
```bash
# Validar que no hay referencias internas a rutas siendo removidas:
grep -RIn "/dicaprev/empresa/documentacion" src --exclude-dir=node_modules
grep -RIn "/dicaprev/empresa/trabajadores" src --exclude-dir=node_modules

# Resultado esperado: solo en Sidebar.tsx y la ruta en sí
# Si hay otras → BLOQUEA PR4, resolver primero
```

**Después de cambios (Phase 1)**:
1. **Build**:
   - `npm run build` sin errores

2. **En local** `npm run dev`:
   - Sidebar no renderiza "Empresa Documentación" ni "Empresa Trabajadores"
   - `/dicaprev/empresa/documentacion` redirige a `/dicaprev/documentacion`
   - `/dicaprev/empresa/trabajadores` redirige a `/dicaprev/trabajadores`
   - `/dicaprev/documentos/por-obra` redirige correctamente

3. **Funcionalidad de rutas de destino**:
   - `/dicaprev/documentacion` carga completamente
   - `/dicaprev/trabajadores` carga completamente
   - Creación/edición de datos funciona en destinos

4. **Cross-browser**:
   - Redirects funcionan en Chrome, Firefox, Safari

### Criterios de rollback
- Si la pre-validación (Phase 0) encuentra referencias no esperadas → **NO INICIAR PR4 hasta resolverlas**
- Si Sidebar no renderiza → revertir Sidebar.tsx
- Si Redirects dan error 404 → revertir páginas redirect
- Si `/dicaprev/documentacion` o `/dicaprev/trabajadores` no funcionan → revertir TODO

### Impacto UX esperado
- Usuarios que acceden a URLs viejas son redirigidos automáticamente (transparente)
- Sidebar muestra menos items (más limpio)
- Funcionalidad idéntica en nuevas rutas
- Posible: Algunos usuarios con bookmarks viejos → redirect automático

### Riesgo total: 🟠 ALTO
- Alto porque depreca rutas funcionales
- Requiere validación exhaustiva previa
- Impacto en usuarios con bookmarks

---

## PR5: Limpieza final y validación

### Objetivo
Validar que el ecosistema completo funciona, documentar cambios y preparar para producción.

### Alcance (NO código nuevo, solo validación y limpieza de artifacts)

#### Fase 1: Validación E2E
```
Checklist de validación:

□ Build sin warnings/errors
□ Local dev funciona completamente
□ Todos los redirects funcionan (old → new)
□ Sidebar UI correcta
□ Dashboard carga y funciona
□ API /api/dicaprev/empresa/resumen responde
□ ActivacionFlow en dashboard funciona

Tests manuales específicos:
□ Crear nuevo trabajador (en /trabajadores, que redirige desde /empresa/trabajadores si intentan)
□ Crear nueva acreditación (con datos reales si Acreditacion table tiene data)
□ Subir documento en /documentacion (que redirige desde /empresa/documentacion si intentan)
□ Navegar por sidebar sin errores
□ Capacitación plan carga y filtra
□ Reportes/activacion carga
```

#### Fase 2: Cleanup de código
```
Archivos a limpiar (eliminar comentarios TODO antiguos si corresponde):

□ Remover comentarios // TODO: deprecated si fueron resueltos en PR1-PR4
□ Actualizar comentarios en mock-data.ts si aún existe
□ Verificar que no hay archivos huérfanos (inutilizados)
```

#### Fase 3: Documentación
```
Crear archivo de registro de cambios:

CAMBIOS EJECUTADOS (PR1-5):
  - PR1: Sidebar marcada deprecated items {lista}
  - PR2: Acreditaciones resumen migrado a Prisma
  - PR3: Contratistas separado como módulo: /contratistas
  - PR4: Deprecated /empresa/documentacion → /documentacion
  - PR4: Deprecated /empresa/trabajadores → /trabajadores
  - PR5: Validación final completada

RUTAS REDIRECT:
  - /dicaprev/documentacion/contratistas → /dicaprev/contratistas
  - /dicaprev/documentacion/aprobaciones → /dicaprev/contratistas/aprobaciones
  - /dicaprev/empresa/documentacion → /dicaprev/documentacion
  - /dicaprev/empresa/trabajadores → /dicaprev/trabajadores

RUTAS MANTENDIDAS:
  - /dicaprev/capacitacion/plan
  - /dicaprev/reportes/activacion
  - /dicaprev/empresa/resumen (CRÍTICO)
  - /dicaprev/empresa/puestos
```

### Archivos Involucrados
```
Limpiar/actualizar:
├── CAMBIOS_NAVEGACION.md (crear resumen)
├── Comentarios en código
└── Mock-data.ts si persiste
```

### Validaciones manuales necesarias

**Ejecutar en orden**:

1. **Build production**:
   ```bash
   npm run build
   npm run start
   ```
   - Todo debe compilar sin errores
   - Server debe iniciar sin crashes

2. **Smoke tests** (casos de uso críticos):
   ```
   - Login → Dashboard
   - Dashboard → Empresa Resumen
   - Empresa Resumen → Tabs (General, Gobierno, Estructura, DS44)
   - Dashboard → Trabajo (redirect desde /empresa/trabajadores)
   - Dashboard → Documentos (redirect desde /empresa/documentacion)
   - Sidebar → Contratistas
   - Sidebar → Capacitación Plan
   - Sidebar → Reportes Activación
   ```

3. **Redirects validation**:
   - Cada ruta deprecated debe redirigir correctamente
   - No loops de redirects (A→B→A)

4. **Cross-route compatibility**:
   - Cambios en Sidebar no rompen ninguna navegación
   - Actions compartidas siguen funcionando
   - API routes responden correctamente

### Criterios de rollback (post-PR5)
- Si algún smoke test falla → revertir toda la rama y revisar qué salió mal
- Si hay console errors en production build → revertir
- Si performance se degrada notablemente → revertir
- Si usuarios reportan broken links → investigar y hotfix

### Impacto UX esperado
- **Cero impacto negativo** (si todo va bien)
- Mejor organización de navegación
- Módulo Contratistas más visible y accesible
- Sidebar más limpio (deprecated items removidos o menos)
- Transparencia total: redirects automáticos

### Riesgo total: 🟢 BAJO (solo validación y documentación)

---

## Matriz de dependencias cruzadas

### Dependencias críticas NO impactar en PR1-5

```
CRÍTICO - No modificar sin validación:
┌─ /api/dicaprev/empresa/resumen (GET)
│  ├─ Consumidor: Dashboard (/dicaprev/dashboard/_client.tsx)
│  ├─ Consumidor: ActivacionFlow (dashboard/components/ActivacionFlow.tsx)
│  ├─ Consumidor: NotificationBell (components/layout/NotificationBell.tsx)
│  └─ Action subyacente: getResumenEmpresa() + getAnaliticaActivacionEmpresa()

└─ /dicaprev/empresa/resumen (página completa)
   ├─ Consumidor: Dashboard link
   ├─ Tab DS44: embed en resumen, NO separar en PR3-4
   ├─ Componentes internos: GeneralTab, GobiernoSSTTab, etc.
   └─ API respaldante: /api/dicaprev/empresa/resumen

ACCIONES COMPARTIDAS:
├─ src/app/dicaprev/empresa/resumen/actions.ts
│  ├─ Exporta: getResumenEmpresa() [MANTENER]
│  ├─ Exporta: generarDocumentosFaltantes() [MANTENER]
│  ├─ Exporta: guardarEstadoActivacionEmpresa() [MANTENER]
│  └─ Exporta: getAnaliticaActivacionEmpresa() [MANTENER, usado por reportes]
│
└─ src/actions/trabajadores/index.ts
   ├─ Exporta: getTrabajadores() [NUEVO, usar en PR4]
   ├─ Exporta: createTrabajador() [NUEVO]
   ├─ Exporta: updateTrabajador() [NUEVO]
   └─ Exporta: deleteTrabajador() [NUEVO]

MOCK DATA COMPARTIDO:
├─ src/app/dicaprev/acreditaciones/mock-data.ts
│  ├─ Usado por: acreditaciones/resumen [MIGRANDO EN PR2]
│  ├─ Usado por: acreditaciones/solicitudes [MANTENER POR AHORA]
│  ├─ Usado por: acreditaciones/[id] [MANTENER POR AHORA]
│  └─ TODO: Migrar solicitues e [id] después de PR2 (PR2b no contemplado en plan actual)
│
└─ src/app/dicaprev/documentacion/contratistas/mock-data (embedded)
   ├─ Usado por: documentacion/contratistas [MOVER EN PR3]
   └─ Usado por: documentacion/aprobaciones [MOVER EN PR3]
```

### Rutas que NO deben cambiar funcionalidad

```
SINE QUA NON - No confundir con legacy:

✅ /dicaprev/capacitacion/plan
   ├─ Estado: Operativo, backend real (Prisma)
   ├─ Usar en: Cualquier ejemplo de "ruta bien hecha"
   └─ Impacto: CERO en PR1-5

✅ /dicaprev/empresa/puestos
   ├─ Estado: Operativo, backend real (Prisma)
   ├─ Actions propias: src/app/dicaprev/empresa/puestos/actions.ts
   ├─ Nombre: "Puestos" ≠ "Cargos" (conceptualmente diferente)
   └─ Impacto: CERO en PR1-5 (puede tener pequeñas mejoras UI luego)

✅ /dicaprev/reportes/activacion
   ├─ Estado: Operativo, backend real (Prisma)
   ├─ Consumidor: Está enlazada desde /dicaprev/reportes
   └─ Impacto: CERO en PR1-5

✅ /dicaprev/empresa/resumen
   ├─ Estado: Crítica, backend real (Prisma), múltiples consumidores
   └─ Impacto: CERO en PR1-5 (ABSOLUTAMENTE NO TOCAR)
```

---

## Criterios globales de rollback

### Estrategia general

**Por cada PR:**
- Si falla en local `npm run dev` → revertir PR solo
- Si falla en `npm run build` → revertir PR solo

**Entre PRs:**
- Si PR(N) rompe algo de PR(N-1) → rollback ambas, investigar, reintentar

**Producción:**
- Si algún usuario reporta broken link post-deploy → hotfix inmediato o rollback
- Mantener git tags de cada PR deployado para quick rollback

### Checklist de "STOP - revertir"

```
STOP INMEDIATAMENTE Y REVERTIR SI:

□ Dashboard no carga (GET /api/dicaprev/empresa/resumen falla)
□ Sidebar da error
□ Build produce warnings de imports rotos
□ Algún redirect crea loop (A→B→A)
□ /dicaprev/empresa/resumen devuelve 500
□ Acreditaciones/solicitudes no carga (PRE-backend migration completa)
□ Usuarios reportan broken bookmarks (except expected redirects)

OKAY CONTINUAR SI:
□ Deprecated items en sidebar se ven en gris [ESPERADO]
□ Algunas rutas viejas redirigen [ESPERADO]
□ Build tiene warnings de "unused variable" [MINOR, revisar después]
```

---

## Checklist pre-ejecución

**ANTES de iniciar incluso PR1:**

```
VALIDACIONES ESTÁTICAS:

□ Repositorio está en main/master
□ `git status` está limpio
□ `npm install` ejecutó sin errores
□ `npm run build` ejecuta sin errores (línea base)
□ `npm run dev` ejecuta sin errores (línea base)

AUDITORÍA DE REFERENCIAS:

□ Confirmar: grep "/dicaprev/empresa/documentacion" src/ (¿cuántas referencias?)
□ Confirmar: grep "/dicaprev/empresa/trabajadores" src/ (¿cuántas referencias?)
□ Confirmar: grep "ACREDITACIONES_MOCK" src/ (¿qué archivos?)
□ Confirmar: grep "CONTRATISTAS_MOCK" src/ (¿qué archivos?)
□ Confirmar: grep "BIBLIOTECA_MOCK" src/ (¿qué archivos?)

PERMISOS Y ACCESO:

□ Tengo permisos de commit en rama main/develop
□ CI/CD está funcionando (GitHub Actions u otro)
□ Backups o snapshot del DB existen

EQUIPO Y COMUNICACIÓN:

□ Team informado: "Inicia limpieza de rutas legacy" (notar que habrá deprecations)
□ Documentación de cambios será publicada post-PR5
□ Plan de rollback comunicado

DATABASE (si aplica):

□ Estructura Acreditacion existe en DB (caso Acreditaciones en PR2)
□ Datos reales están presentes o está OK si tabla está vacía
```

---

## Resumen ejecutivo de secuencia

```
ORDEN DE EJECUCIÓN (5 PRs, cada una soporta rollback independiente):

PR1: Limpieza de navegación (Riesgo 🟢 BAJO)
   ├─ Modifica: Sidebar.tsx (agregar deprecated flag)
   ├─ Modifica: Comentarios // TODO en archivos
   ├─ Tiempo: ~30 min
   └─ Rollback: Revertir Sidebar.tsx

PR2: Backend migration acreditaciones (Riesgo 🟡 MEDIO)
   ├─ Crea: src/app/dicaprev/acreditaciones/actions.ts
   ├─ Modifica: acreditaciones/resumen/page.tsx
   ├─ Mantiene: mock-data.ts (todavía usado por otros)
   ├─ Tiempo: ~1 hora
   └─ Rollback: Revertir actions.ts y resumen/page.tsx

PR3: Separación Contratistas (Riesgo 🟡 MEDIO)
   ├─ Crea: src/app/dicaprev/contratistas/ (estructura nueva)
   ├─ Copia: UI de documentacion/{contratistas,aprobaciones}
   ├─ Redirige: Viejas rutas a nuevas
   ├─ Actualiza: Sidebar (agregar módulo Contratistas)
   ├─ Tiempo: ~45 min
   └─ Rollback: Revertir carpeta, redirects, Sidebar.tsx

PR4: Deprecación legacy (Riesgo 🟠 ALTO)
   ├─ Redirige: /empresa/documentacion → /documentacion
   ├─ Redirige: /empresa/trabajadores → /trabajadores
   ├─ Actualiza: Sidebar (remover entradas deprecated)
   ├─ Valida prévia: grep para confirmar no hay referencias inesperadas
   ├─ Tiempo: ~30 min (+ 15 min validación previa)
   └─ Rollback: Revertir páginas redirect, Sidebar.tsx
   
   ⚠️ PRE-REQUISITO: Validar que /dicaprev/trabajadores cubre 100% casos de /empresa/trabajadores

PR5: Limpieza final (Riesgo 🟢 BAJO)
   ├─ Valida: E2E tests manuales
   ├─ Limpia: Comentarios obsoletos
   ├─ Documenta: Cambios ejecutados
   ├─ Tiempo: ~30 min (principalmente testing)
   └─ Rollback: Si todo falla, revertir hasta PR4
```

---

## Matriz de impacto por ruta

| Ruta | PR | Acción | Impacto UX | Impacto Desarrollo | Rollback |
|------|-----|--------|-----------|-------------------|----------|
| Sidebar.tsx | PR1+4 | Actualizar items deprecated | Cambia apariencia | Bajo | Restaurar MODULES[] |
| `/dicaprev/acreditaciones/resumen` | PR2 | Backend migration | Cero cambio visual | Medio | Revertir actions.ts |
| `/dicaprev/contratistas/` | PR3 | Crear módulo nuevo | Mejor organización | Bajo | Revertir carpeta |
| `/dicaprev/documentacion/{contratistas,aprobaciones}` | PR3 | Crear redirects | Redirect transparente | Bajo | Revertir redirects |
| `/dicaprev/empresa/documentacion` | PR4 | Convertir a redirect | Redirect transparente | Bajo | Revertir redirect |
| `/dicaprev/empresa/trabajadores` | PR4 | Convertir a redirect | Redirect transparente | Medio | Revertir redirect |
| `/dicaprev/documentos/por-obra` | PR4 | Actualizar target | Redirect sigue funcionando | Bajo | Revertir cambio |
| Otros (core) | - | Nada | Cero | Cero | N/A |

---

## Notas finales

### Riesgos identificados NO resueltos en este plan

```
⚠️ Riesgos secundarios a considerar en ejecución:

1. ACREDITACIONES_MOCK aún usado por solicitudes/ e [id]/
   → Solución: PR2 SOLO cambia resumen, resto se maneja en PR2b (no contemplado)

2. DOCUMENTACION LEGACY del módulo documentacion/
   → Si hay acciones pending de "crear documentación" → podrían fallar temporalmente
   → Solución: Validar que no hay WIPs cuando se ejecuta PR4

3. Trabajadores legacy tiene diferente schema DB que módulo nuevo
   → Aunque ambas usan tabla trabajador, actions internas son diferentes
   → Solución: Validar paridad completa ANTES de PR4 (Phase 0)

4. Dashboard caching puede desfasar si /api/dicaprev/empresa/resumen cambia
   → Solución: Este plan MANTIENE el endpoint, no cambia
   → Impacto: CERO si respetamos el contrato

5. SSR issues si alguien está renderizando server-side a rutas deprecated
   → Solución: Redirects con next/navigation funcionan en SSR
   → Impacto: Bajo si app es primariamente CSR (lo parece)
```

### Extensiones futuras (NO en este plan)

```
POST-PR5 (si hay recursos):

- [ ] PR2b: Migrar resto de acreditaciones a Prisma (solicitudes/, [id]/)
- [ ] PR6: Limpiar rutas legacy de capacitacion (plandecapacitacion)
- [ ] PR7: Consolidar documentación bajo módulo único (ahora dispersa)
- [ ] PR8: Optimizar Sidebar (considerar collapse/hierarchy)
```

### Contactos y escalation

```
SI ALGO SALE MAL:
- Rollback: revertir last commit (git revert)
- Logging: Revisar GraphQL/Network tab en DevTools
- Permisos: Revisar que requirePermission() no cambia
- Comunicación: Avisar al team inmediatamente
```

---

**FIN DEL PLAN TÉCNICO**

**Estado**: Listo para ejecución  
**Última revisión**: 14-05-2026  
**Aprobado por**: [Ingeniería]  
**Siguiente paso**: Ejecutar PR1 tras validar checklist pre-ejecución
