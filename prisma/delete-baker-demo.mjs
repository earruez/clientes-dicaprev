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

const PROTECTED_NAMES = new Set(['dicaprev spa', 'centros comerciales spa'])

function normalizeName(value) {
  if (!value) return ''
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
}

function normalizeRut(value) {
  if (!value) return ''
  return value.replace(/[^0-9kK]/g, '').toLowerCase()
}

async function getCounts(empresaId) {
  const [usuariosRelacionados, documentosRelacionados, trabajadoresRelacionados, modulosRelacionados] = await Promise.all([
    prisma.usuarioEmpresa.count({ where: { empresaId } }),
    prisma.documentoEmpresa.count({ where: { empresaId } }),
    prisma.trabajador.count({ where: { empresaId } }),
    prisma.empresaModulo.count({ where: { empresaId } }),
  ])

  return {
    usuariosRelacionados,
    documentosRelacionados,
    trabajadoresRelacionados,
    modulosRelacionados,
  }
}

async function deleteEmpresaDependencias(tx, empresaId) {
  await tx.usuarioEmpresa.deleteMany({ where: { empresaId } })
  await tx.usuario.updateMany({ where: { empresaId }, data: { empresaId: null } })

  await tx.evidenciaCumplimiento.deleteMany({ where: { empresaId } })
  await tx.hallazgoCumplimiento.deleteMany({ where: { empresaId } })
  await tx.obligacionEmpresaEstado.deleteMany({ where: { empresaId } })

  await tx.documentoEmpresa.deleteMany({ where: { empresaId } })
  await tx.trabajadorDocumento.deleteMany({ where: { empresaId } })

  await tx.capacitacionAsistencia.deleteMany({ where: { empresaId } })
  await tx.capacitacionEvaluacion.deleteMany({ where: { empresaId } })
  await tx.capacitacionHistorial.deleteMany({ where: { empresaId } })
  await tx.capacitacionAsignacion.deleteMany({ where: { empresaId } })
  await tx.capacitacionSesion.deleteMany({ where: { empresaId } })
  await tx.reglaCapacitacionCargo.deleteMany({ where: { empresaId } })
  await tx.planCapacitacion.deleteMany({ where: { empresaId } })
  await tx.plantillaPlanCapacitacion.deleteMany({ where: { empresaId } })
  await tx.capacitacion.deleteMany({ where: { empresaId } })

  await tx.entregaEpp.deleteMany({ where: { empresaId } })
  await tx.eppItem.deleteMany({ where: { empresaId } })

  await tx.acreditacion.deleteMany({ where: { empresaId } })
  await tx.plantillaAcreditacion.deleteMany({ where: { empresaId } })
  await tx.mandanteAcreditacion.deleteMany({ where: { empresaId } })
  await tx.contratista.deleteMany({ where: { empresaId } })

  await tx.checklistEjecucion.deleteMany({ where: { empresaId } })
  await tx.checklistTemplate.deleteMany({ where: { empresaId } })

  await tx.accidenteAccionCorrectiva.deleteMany({ where: { empresaId } })
  await tx.accidenteInvestigacion.deleteMany({ where: { empresaId } })

  await tx.induccionTrabajador.deleteMany({ where: { empresaId } })
  await tx.firmaDocumento.deleteMany({ where: { empresaId } })

  await tx.planTrabajo.deleteMany({ where: { empresaId } })

  await tx.vehiculo.deleteMany({ where: { empresaId } })
  await tx.trabajador.deleteMany({ where: { empresaId } })
  await tx.posicionDotacion.deleteMany({ where: { empresaId } })
  await tx.reglaDocumentoTrabajador.deleteMany({ where: { empresaId } })
  await tx.documentoTipoTrabajador.deleteMany({ where: { empresaId } })
  await tx.documentoTipoVehiculo.deleteMany({ where: { empresaId } })
  await tx.cargo.deleteMany({ where: { empresaId } })
  await tx.area.deleteMany({ where: { empresaId } })
  await tx.centroTrabajo.deleteMany({ where: { empresaId } })

  await tx.plantillaDocumentoEmpresa.deleteMany({ where: { empresaId } })
  await tx.activacionEvento.deleteMany({ where: { empresaId } })
  await tx.empresaModulo.deleteMany({ where: { empresaId } })
  await tx.generacionDocumentosLog.deleteMany({ where: { empresaId } })
}

async function run() {
  console.log('Iniciando eliminación definitiva de Baker SpA duplicadas...\n')

  const resumen = {
    eliminadas: [],
    omitidas: [],
    errores: [],
  }

  try {
    const empresas = await prisma.empresa.findMany({
      select: {
        id: true,
        nombre: true,
        rut: true,
        activa: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const baker = empresas.filter((empresa) => {
      const byName = normalizeName(empresa.nombre) === 'baker spa'
      const byRut = normalizeRut(empresa.rut) === '778818906'
      return byName || byRut
    })

    if (baker.length === 0) {
      console.log('0 encontradas, nada que eliminar')
      return
    }

    console.log(`Empresas Baker encontradas: ${baker.length}\n`)

    for (const empresa of baker) {
      const normalizedName = normalizeName(empresa.nombre)
      if (PROTECTED_NAMES.has(normalizedName)) {
        resumen.omitidas.push({ id: empresa.id, nombre: empresa.nombre, motivo: 'Empresa protegida' })
        continue
      }

      const counts = await getCounts(empresa.id)
      console.log(`- ID: ${empresa.id}`)
      console.log(`  Nombre: ${empresa.nombre}`)
      console.log(`  RUT: ${empresa.rut ?? 'sin RUT'}`)
      console.log(`  Estado activo: ${empresa.activa ? 'sí' : 'no'}`)
      console.log(`  Usuarios relacionados: ${counts.usuariosRelacionados}`)
      console.log(`  Documentos relacionados: ${counts.documentosRelacionados}`)
      console.log(`  Trabajadores relacionados: ${counts.trabajadoresRelacionados}`)
      console.log(`  Módulos relacionados: ${counts.modulosRelacionados}`)
      console.log('')
    }

    for (const empresa of baker) {
      const normalizedName = normalizeName(empresa.nombre)
      if (PROTECTED_NAMES.has(normalizedName)) {
        continue
      }

      try {
        await prisma.$transaction(async (tx) => {
          await deleteEmpresaDependencias(tx, empresa.id)
          await tx.empresa.delete({ where: { id: empresa.id } })
        })

        resumen.eliminadas.push({ id: empresa.id, nombre: empresa.nombre })
      } catch (error) {
        resumen.errores.push({
          id: empresa.id,
          nombre: empresa.nombre,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    console.log('Resumen final:')
    console.log(`- eliminadas: ${resumen.eliminadas.length}`)
    console.log(`- omitidas: ${resumen.omitidas.length}`)
    console.log(`- errores: ${resumen.errores.length}`)

    if (resumen.eliminadas.length > 0) {
      console.log('\nDetalle eliminadas:')
      for (const item of resumen.eliminadas) {
        console.log(`  * ${item.nombre} (${item.id})`)
      }
    }

    if (resumen.omitidas.length > 0) {
      console.log('\nDetalle omitidas:')
      for (const item of resumen.omitidas) {
        console.log(`  * ${item.nombre} (${item.id}) - ${item.motivo}`)
      }
    }

    if (resumen.errores.length > 0) {
      console.log('\nDetalle errores:')
      for (const item of resumen.errores) {
        console.log(`  * ${item.nombre} (${item.id}) - ${item.error}`)
      }
    }
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

run().catch((error) => {
  console.error('Error fatal en delete-baker-demo:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
