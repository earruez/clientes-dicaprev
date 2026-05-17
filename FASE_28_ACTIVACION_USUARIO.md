# DICAPREV — Fase 28.0: Activación y Experiencia Inicial del Usuario

## Visión Completada ✅

**Objetivo:** Asegurar que un usuario nuevo entienda y use el sistema en menos de 5 minutos.

El flujo de activación ahora detecta automáticamente empresas nuevas (cumplimiento < 30%) y guía al usuario a través de 4 pasos intuitivos para generar documentos obligatorios y mejorar cumplimiento.

---

## 📋 Entregables

### 1. Flujo de Activación Funcional ✅
- **Ubicación:** [/src/app/dicaprev/dashboard/components/ActivacionFlow.tsx](src/app/dicaprev/dashboard/components/ActivacionFlow.tsx)
- **Características:**
  - 4 pasos visuales: IRL → EPP → Revisar → Firmar
  - Barra de progreso en tiempo real
  - Step cards con indicadores de estado (pendiente/activo/completado)
  - CTA principal destacada: "Generar IRL y EPP"
  - Opción de "Saltar por ahora"

### 2. CTA Visible y Prominente ✅
- **Ubicación:** [/src/app/dicaprev/dashboard/_client.tsx](src/app/dicaprev/dashboard/_client.tsx)
- **Características:**
  - Card azul gradiente con ícono de rayo (Zap)
  - Aparece solo si cumplimiento < 30%
  - Título claro: "Activación rápida"
  - Subtítulo motivacional: "Completa estos 4 pasos en menos de 5 minutos"

### 3. Impacto en Cumplimiento Mesurable ✅
- **Detección de Cumplimiento:**
  - Valor actual mostrado en card principal: `{cumplimiento.porcentaje}%`
  - Contador de documentos: totalCumple | totalIncompletos | totalFaltantes
  - Barra de progreso visual con colores: 🟢 verde (alto), 🟡 amarillo (medio), 🔴 rojo (bajo)

- **Feedback Esperado:**
  - Al completar generación: +25% cumplimiento
  - 2 documentos creados (IRL, EPP)
  - Visible inmediatamente en el card al recargar

- **Integración:**
  - Recarga automática con `recargarResumen()` después de cada acción
  - API endpoint: [GET /api/dicaprev/empresa/resumen](src/app/api/dicaprev/empresa/resumen/route.ts)

### 4. Sin Agregar Complejidad UI ✅
- **Componentes Reutilizados:**
  - `Button` - componente UI existente
  - `Card` - componente UI existente
  - `Progress` - componente UI existente
  - Lucide icons - ya en el proyecto

- **Estilos:**
  - 100% Tailwind CSS (diseño tokens del proyecto)
  - Colores semánticos existentes
  - Responsive mobile-first

- **Nuevas Dependencias:**
  - NINGUNA (reutiliza todo del proyecto)

---

## 🏗️ Arquitectura Implementada

```
src/app/dicaprev/dashboard/
├── page.tsx                    # Server component → obtiene resumen inicial
├── _client.tsx                 # Client component → lógica + UI principal
└── components/
    └── ActivacionFlow.tsx      # Flujo de 4 pasos (nuevo)

src/app/api/dicaprev/empresa/
└── resumen/route.ts            # API para recargar datos (nuevo)
```

### Flujo de Datos

```
1. Usuario accede a /dicaprev/dashboard
   ↓
2. page.tsx (servidor) → getResumenEmpresa() → carga resumen
   ↓
3. _client.tsx (cliente) detecta cumplimiento < 30%
   ↓
4. Si es estado inicial:
   └─ Muestra ActivacionFlow
      ├─ Paso 1: generarDocumentosFaltantes() → +IRL, +EPP
      ├─ Paso 2: Auto-marcar como completado
      ├─ Paso 3: Revisar (visual)
      └─ Paso 4: Firmar → recargarResumen() → actualiza cumplimiento
```

---

## 🎯 Funcionalidades Clave

### Detección Automática de Estado Inicial
```typescript
// En _client.tsx
const esEstadoInicial = resumen.cumplimiento.porcentaje < 30;

// Muestra activación solo si es estado inicial
{esEstadoInicial && (
  <ActivacionFlow resumen={resumen} onComplete={recargarResumen} />
)}
```

### Flujo de 4 Pasos
| Paso | Acción | Resultado |
|------|--------|-----------|
| 1 | Generar IRL + EPP | 2 documentos creados, +progreso |
| 2 | Automático | Marcar ambos como generados |
| 3 | Revisar | Validación visual |
| 4 | Firmar | Activar cumplimiento, recargar datos |

### Feedback Visual Progresivo
- ✅ Barra de progreso: 0% → 25% → 50% → 75% → 100%
- ✅ Step cards: gris → azul (activo) → verde (completado)
- ✅ Contador: "0 de 4 completados" → "4 de 4 completados"
- ✅ Pantalla final: ¡Activación completada! + links a documentación

---

## 📊 Impacto Esperado

| Métrica | Valor |
|---------|-------|
| Cumplimiento inicial | 0-30% |
| Cumplimiento post-activación | +25% (aprox 25-55%) |
| Documentos generados | 2 (IRL, EPP) |
| Tiempo requerido | ~5 minutos |
| Nuevas dependencias | 0 |
| Reutilización de componentes | 100% |

---

## 🚀 Cómo Usa El Usuario

### Flujo Happy Path (5 minutos)

1. **Usuario entra a dashboard (min 0)**
   - Ve: "Bienvenido a DICAPREV"
   - Ve: Card azul "Activación rápida"

2. **Paso 1: Generar (min 0-1)**
   - Click: Botón "Generar IRL y EPP"
   - Vé: Spinner "Generando..."
   - Alcanza: Paso 2 auto-completado

3. **Paso 3: Revisar (min 1-2)**
   - Vé: Checklist "IRL generado" + "EPP generado"
   - Click: "Documentos correctos"

4. **Paso 4: Firmar (min 2-5)**
   - Click: "Firmar y activar"
   - Vé: Pantalla final "¡Activación completada!"
   - Vé: Cumplimiento actualizado en card (ej: 30% → 55%)

5. **Acceso a siguiente módulo (min 5)**
   - Click: Link "Ir a Documentación"
   - Continúa gestión documentaria

---

## 🔧 Integración Técnica

### Server Component (page.tsx)
```typescript
// Obtiene resumen empresarial del servidor
const resumen = await getResumenEmpresa();
return <DashboardClient resumenInicial={resumen} />;
```

### Client Component (_client.tsx)
```typescript
// Detecta estado y muestra activación
const esEstadoInicial = resumen.cumplimiento.porcentaje < 30;
{esEstadoInicial && (
  <ActivacionFlow 
    resumen={resumen} 
    onComplete={recargarResumen}
    isLoading={isLoading}
  />
)}
```

### Componente de Activación (ActivacionFlow.tsx)
```typescript
// Maneja 4 pasos + generación de documentos
const handleGenerarDocumentos = async () => {
  const resultado = await generarDocumentosFaltantes({ 
    empresaId: resumen.empresa.id 
  });
  // Marca pasos 1 y 2 como completados
  setPasoCompletado({ ...prev, 1: true, 2: true });
  setPasoActual(3);
};
```

### API de Recarga (route.ts)
```typescript
export async function GET() {
  const resumen = await getResumenEmpresa();
  return NextResponse.json(resumen);
}
```

---

## 🔐 Seguridad y Validación

- ✅ Autenticación: Heredada de `getResumenEmpresa()` (requirePermission)
- ✅ Validación: Solo genera documentos si empresa existe
- ✅ Error handling: Try-catch en recargarResumen()
- ✅ Permisos: No modifica acceso a módulos existentes

---

## 📈 Próximos Pasos (Fuera de Scope)

1. **Analítica:** Rastrear cuántos usuarios completan activación
2. **A/B Testing:** Variaciones del copy/UX
3. **Personalización:** Copy basado en industria/tamaño empresa
4. **Automatización Paso 4:** Firmar automáticamente después de generación
5. **Email de Confirmación:** Notificar al representante legal

---

## ✅ Checklist de Validación

- [x] Detecta estado inicial (cumplimiento < 30%)
- [x] Muestra CTA principal visible
- [x] Flujo de 4 pasos funciona completamente
- [x] Genera documentos IRL + EPP
- [x] Feedback de cumplimiento visible
- [x] Recarga datos post-acción
- [x] Responsive en mobile
- [x] Sin dependencias nuevas
- [x] Compila sin errores
- [x] Reutiliza componentes UI existentes
- [x] Estilos Tailwind consistentes
- [x] Integración con actions existentes

---

**Estado:** ✅ COMPLETADA — Fase 28.0 lista para producción
**Fecha:** 13 de mayo de 2026
**Tiempo de Implementación:** ~2 horas
**Archivos Modificados:** 2 + 2 nuevos = 4 total
