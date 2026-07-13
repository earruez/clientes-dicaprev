# Deploy Prisma en Vercel

## Build normal en Vercel

Ejecutar solo generacion de Prisma Client y compilacion de Next.js:

```bash
npx prisma generate && npm run build
```

## Migraciones de produccion

Ejecutar migraciones en un paso separado:

```bash
npx prisma migrate deploy
```

## Regla operativa

Las migraciones no deben ejecutarse dentro del build normal de Vercel.
Se deben correr manualmente o en un job separado para evitar fallos de deploy cuando la base no esta accesible durante build.
