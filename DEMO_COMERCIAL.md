# Empresa Demo Comercial

## Descripción

Script idempotente para generar datos demo de una empresa comercial completa en NextPrev.

**Empresa:** Centros Comerciales SpA  
**Tipo:** Administración y operación de centros comerciales (mediana empresa)

## Instalación y Ejecución

### Local (desarrollo)

```bash
# Asegurar que .env está configurado con DATABASE_URL válida
npm run seed:demo-comercial
```

### En Producción (Vercel/Neon)

```bash
# 1. Actualizar .env local con CONNECTION_URL de producción
export DATABASE_URL="postgresql://usuario:pass@host.neon.tech/dbname"

# 2. Ejecutar seed contra producción
npm run seed:demo-comercial
```

## Credenciales Demo

- **Email:** `admin.centros@nextprev.cl`
- **Contraseña:** `Demo2026`
- **Rol:** Administrador de Empresa

## Datos Incluidos

### Estructura Organizacional

- **5 Centros de Trabajo:**
  - Oficina Central
  - Centro Comercial Norte
  - Centro Comercial Oriente
  - Strip Center Sur
  - Bodega y Mantención

- **7 Áreas:** Administración, Operaciones, Mantención, Seguridad, Prevención, Atención Locatarios, Servicios Generales

- **7 Cargos:** Administrador, Supervisor, Técnico Mantención, Guardia, Prevencionista, Auxiliar Aseo, Coordinador Locatarios

### Personal

- **18 trabajadores ficticios** distribuidos en centros, áreas y cargos
- Estados variados: activo, pendiente documental
- Documentos con estados: completo, faltante, vencido, rechazado
- Inducciones: pendiente, en progreso, completada

### Seguridad y Prevención

- **5 Items EPP:** Casco, guantes, lentes, zapatos, chaleco reflectante
- **Entregas EPP:** Creadas para ~70% del personal operativo
- **5 Checklists de Inspección:**
  - Zonas comunes
  - Salas eléctricas
  - Patio de comidas
  - Bodegas
  - Estacionamientos

- **Hallazgos:** 5 hallazgos con prioridades variadas
- **Accidentes/Incidentes:** 1 incidente cerrado + 1 investigación abierta

### Contratación y Servicios

- **3 contratistas demo:**
  - Aseo Integral Demo SpA
  - Seguridad Privada Demo SpA
  - Mantención Eléctrica Demo SpA

- Documentos con estados: completo, faltante, vencido

### Plan de Trabajo

- **Plan 2026** con 6 actividades:
  - Inspección salas eléctricas (trimestral)
  - Capacitación emergencia (semestral)
  - Simulacro evacuación (semestral)
  - Revisión extintores (mensual)
  - Control contratistas (continua)
  - Inspección zonas comunes (semanal)

## Características del Script

✅ **Idempotente** — Se puede ejecutar múltiples veces sin crear duplicados  
✅ **Demo Completa** — Cubre la mayoría de módulos del sistema  
✅ **Datos Ficticios** — Nombres, RUTs y empresas claramente demostrativas  
✅ **Sin Datos Reales** — No usa información de clientes activos  
✅ **Compatible** — Funciona con BD local y producción (Neon)

## Validación después de Ejecutar

1. Acceder a `http://localhost:3000/login` (desarrollo) o URL de producción
2. Ingresar credenciales:
   - Email: `admin.centros@nextprev.cl`
   - Contraseña: `Demo2026`
3. Navegar módulos:
   - Dashboard → Resumen de KPIs
   - Trabajadores → Control documental
   - Cumplimiento → Hallazgos, evidencias
   - EPP → Entregas
   - Contratistas → Lista con documentos
   - Checklists → Inspecciones
   - Acreditaciones → Solicitudes demo
   - Plan de Trabajo → Actividades 2026

## Notas Técnicas

- **Hash de Contraseña:** Usa scrypt compatible con `src/lib/password-hash.ts`
- **Token Inducción:** Generado aleatoriamente para cada inducción
- **Timestamps:** Fechas realistas con variación

## Revertir Demo

Para eliminar la empresa demo:

```bash
# Conectar a DB y ejecutar:
DELETE FROM "Empresa" WHERE nombre = 'Centros Comerciales SpA';
```

Prisma eliminará cascada todas las relaciones automáticamente.

---

**Creado:** Junio 2026  
**Versión:** 1.0  
**Mantenedor:** NextPrev Dev Team
