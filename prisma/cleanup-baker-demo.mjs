import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL no configurada')
}

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

/**
 * Normaliza nombres de empresa para comparación
 * "Baker SpA" → "baker spa"
 */
function normalizarNombre(nombre) {
  if (!nombre) return ''
  return nombre.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Normaliza RUT para comparación
 * "77.881.890-6" → "778818906"
 */
function normalizarRut(rut) {
  if (!rut) return ''
  return rut.replace(/[\s.-]/g, '')
}

/**
 * Main: Limpiar duplicados Baker SpA
 */
async function cleanupBakerDemo() {
  console.log('🔍 Iniciando limpieza de duplicados Baker SpA...\n')

  try {
    // Parámetros de búsqueda
    const targetNombre = 'baker spa'
    const targetRut = '778818906'

    // Buscar todas las empresas
    const todasEmpresas = await prisma.empresa.findMany({
      select: {
        id: true,
        nombre: true,
        rut: true,
        activa: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Filtrar empresas Baker SpA por nombre O RUT
    const empresasBaker = todasEmpresas.filter((e) => {
      const nombreNorm = normalizarNombre(e.nombre)
      const rutNorm = normalizarRut(e.rut)
      return nombreNorm === targetNombre || rutNorm === targetRut
    })

    console.log(`📊 Resultados de búsqueda:`)
    console.log(`   Total empresas en BD: ${todasEmpresas.length}`)
    console.log(`   Empresas "Baker SpA" encontradas: ${empresasBaker.length}\n`)

    if (empresasBaker.length === 0) {
      console.log('✅ No hay duplicados Baker SpA. Abortando.\n')
      return
    }

    if (empresasBaker.length === 1) {
      console.log('✅ Solo existe una Baker SpA. Abortando.\n')
      return
    }

    // Proteger DICAPREV SpA y Centros Comerciales SpA
    const protegidas = [
      normalizarNombre('DICAPREV SpA'),
      normalizarNombre('Centros Comerciales SpA'),
    ]

    const empresasADesactivar = empresasBaker.filter((e) => {
      const nombreNorm = normalizarNombre(e.nombre)
      return !protegidas.includes(nombreNorm)
    })

    // La más antigua será la que mantengamos activa
    const masAntigua = empresasBaker[0]

    console.log(`📌 Acción propuesta:`)
    console.log(`   Conservar ACTIVA: ${masAntigua.nombre} (ID: ${masAntigua.id})`)
    console.log(`   Creada: ${masAntigua.createdAt.toISOString()}\n`)

    if (empresasADesactivar.length > 0) {
      console.log(`🔴 A desactivar (${empresasADesactivar.length}):`)
      empresasADesactivar.forEach((e, i) => {
        const estado = e.activa ? '(activa)' : '(ya inactiva)'
        console.log(
          `   ${i + 1}. ${e.nombre} (ID: ${e.id}) ${estado}`
        )
      })
      console.log('')
    }

    // Ejecutar updates
    let desactivadas = 0
    let omitidas = 0

    for (const empresa of empresasADesactivar) {
      if (empresa.activa) {
        // Solo actualizar si está activa
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: { activa: false },
        })
        desactivadas++
        console.log(`   ✓ Desactivada: ${empresa.nombre}`)
      } else {
        // Ya está inactiva, solo contar
        omitidas++
        console.log(`   ⊙ Omitida (ya inactiva): ${empresa.nombre}`)
      }
    }

    console.log(`\n📈 Resumen final:`)
    console.log(`   ✓ Empresas Baker encontradas: ${empresasBaker.length}`)
    console.log(`   ✓ Empresa conservada ACTIVA: 1 (${masAntigua.nombre})`)
    console.log(`   ✓ Empresas desactivadas: ${desactivadas}`)
    console.log(`   ✓ Empresas omitidas (ya inactivas): ${omitidas}`)
    console.log(`   ✓ Empresas protegidas: ${protegidas.length}`)
    console.log(`\n✅ Limpieza completada exitosamente.\n`)
  } catch (error) {
    console.error('❌ Error durante limpieza:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

// Ejecutar
cleanupBakerDemo()
