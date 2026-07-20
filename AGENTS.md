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
- Se permite actualizar `main` mediante `git fetch`, `git switch main` y `git pull origin main` antes de crear una rama de trabajo.
- Estar en `main` no impide ejecutar comprobaciones de solo lectura, actualizar referencias remotas o crear una rama nueva.
- Antes de editar archivos, confirmar que la rama activa sea distinta de `main`.
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
- No imprimir secretos, credenciales, tokens, URLs privadas de bases de datos ni contenidos de archivos de entorno.
- No ejecutar comandos fuera de `/Users/dicaprev/Desktop/clientes-dicaprev` sin aprobacion explicita.
- Mantener textos visibles para usuarios en espanol.
- Mantener lenguaje tecnico en espanol en documentacion interna.
- No mencionar marcas de competidores ni nombres de plataformas externas especificas en textos visibles, documentacion funcional o documentos generados.
- Para documentos generados por la app, usar la leyenda `Generado por NextPrev`.

## Operaciones rutinarias preautorizadas

Dentro de `/Users/dicaprev/Desktop/clientes-dicaprev`, se pueden ejecutar sin pedir una aprobacion adicional:

- Leer archivos del repositorio.
- Crear y editar archivos propios de la tarea dentro del workspace.
- `npm run lint`.
- `npm run typecheck`.
- `npm run build`.
- `npm run test -- --passWithNoTests`.
- `npx prisma validate`.
- `npx prisma generate`.
- `git diff`.
- `git status`.
- `git log`.
- `git fetch origin --prune`.
- `git switch` para cambiar o crear ramas de trabajo.
- `git pull origin main`.
- `git add` con rutas explicitas pertenecientes a la tarea.
- `git commit` en una rama de trabajo.
- `git push -u origin <rama>` sin `--force`.
- Crear pull requests hacia `main` mediante `gh pr create`.

Estas autorizaciones no amplian el alcance funcional de la tarea. Antes de commit o push se debe revisar el diff y excluir cambios ajenos.

## Acciones que siempre requieren aprobacion explicita

- `vercel --prod` y cualquier deploy manual.
- `npx prisma migrate deploy`.
- `npx prisma db push`.
- Cualquier migracion aplicada a una base de produccion.
- Crear, modificar, cargar o imprimir `.env`, `.env.*` o variables de entorno.
- Comandos que puedan mostrar secretos, tokens, credenciales o URLs privadas.
- Instalar, actualizar o eliminar dependencias.
- `npm install`, `npm add`, `npm update`, `pnpm add`, `yarn add`, `brew install`, `apt install` o equivalentes.
- `rm -rf`, borrado masivo, `git clean`, `git reset --hard` y operaciones equivalentes.
- `git push --force`, `git push --force-with-lease` y borrado remoto de ramas.
- Comandos que escriban o actuen fuera de `/Users/dicaprev/Desktop/clientes-dicaprev`.
- Acceso de red que no sea necesario para Git/GitHub o para la tarea aprobada.

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

- La rama activa es `main` y la siguiente accion modificaria archivos, crearia un commit o implementaria funcionalidad.
- El cambio requiere modificar `.env`.
- El cambio requiere instalar dependencias sin aprobacion.
- El cambio implica redisenar UI sin instruccion explicita.
- El cambio requiere alterar archivos generados.
- El alcance solicitado contradice una restriccion de la fase.
- No es posible validar imports, tipos o build por falta de configuracion o dependencia critica.
