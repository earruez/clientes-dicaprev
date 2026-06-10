# Reglas para Agentes

Este documento define las reglas permanentes para cualquier agente que trabaje en este repositorio.

## Stack real del proyecto

- Next.js con App Router.
- TypeScript.
- Tailwind CSS.
- Prisma.
- PostgreSQL.

## Reglas de trabajo

- Trabajar siempre en una rama separada por fase o tarea.
- Nunca modificar `main` directamente.
- No avanzar de fase sin instruccion explicita.
- No implementar funcionalidades fuera del alcance de la fase activa.
- No crear una base nueva de Next.js.
- No redisenar la UI salvo instruccion explicita.
- Reutilizar componentes, estilos y patrones existentes.
- Respetar la estructura actual del proyecto.
- Leer archivos existentes antes de modificarlos.
- No sobrescribir `package.json`, `prisma/schema.prisma`, `README.md` ni archivos existentes sin revisarlos primero.
- No tocar `node_modules`, `.next`, archivos generados ni `.env`.
- No modificar `.env` bajo ninguna circunstancia.
- No instalar librerias sin aprobacion explicita.
- Mantener textos visibles para usuarios en espanol.
- Mantener lenguaje tecnico en espanol en documentacion interna.
- No mencionar marcas de competidores ni nombres de plataformas externas especificas en textos visibles, documentacion funcional o documentos generados.
- Para documentos generados por la app, usar la leyenda `Generado por NextPrev`.

## Reglas de implementacion

- Usar Server Components por defecto.
- Usar `"use client"` solo cuando sea necesario por estado, efectos, eventos del navegador o APIs del cliente.
- Reutilizar componentes existentes antes de crear componentes nuevos.
- Mantener cambios acotados a los archivos de la fase activa.
- Evitar refactors amplios si no son parte del objetivo.
- Validar imports antes de terminar.
- Validar tipos antes de terminar.
- Validar build antes de entregar cuando el cambio lo amerite.
- Documentar cualquier validacion no ejecutada y su motivo.

## Flujo recomendado por fase

1. Confirmar rama activa distinta de `main`.
2. Leer `PLAN_ACCION.md` y ubicar la fase correspondiente.
3. Revisar archivos probables antes de editar.
4. Implementar solo el alcance de la fase.
5. Ejecutar validaciones disponibles.
6. Preparar resumen tecnico en espanol.
7. Dejar lista la rama para pull request.

## Condiciones generales para detenerse

- La rama activa es `main`.
- El cambio requiere modificar `.env`.
- El cambio requiere instalar dependencias sin aprobacion.
- El cambio implica redisenar UI sin instruccion explicita.
- El cambio requiere alterar archivos generados.
- El alcance solicitado contradice una restriccion de la fase.
- No es posible validar imports, tipos o build por falta de configuracion o dependencia critica.
