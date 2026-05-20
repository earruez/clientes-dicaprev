◇ injected env (0) from .env // tip: ⌘ enable debugging { debug: true }
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPERADMIN', 'ADMIN_EMPRESA', 'PREVENCIONISTA', 'SUPERVISOR', 'TRABAJADOR', 'AUDITOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT,
    "razonSocial" TEXT,
    "giro" TEXT,
    "direccion" TEXT,
    "tipoEmpresa" TEXT,
    "tamanoEmpresa" TEXT,
    "codigoCiiu" TEXT,
    "inicioActividades" TEXT,
    "ciudad" TEXT,
    "region" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "web" TEXT,
    "logoUrl" TEXT,
    "representanteLegal" TEXT,
    "rutRepresentanteLegal" TEXT,
    "mutualidad" TEXT,
    "cotizacionAdicional" TEXT,
    "cantidadTrabajadores" INTEGER NOT NULL DEFAULT 0,
    "activacionPasoActual" INTEGER,
    "activacionCompletada" BOOLEAN NOT NULL DEFAULT false,
    "activacionCompletadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "empresaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivacionEvento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "evento" TEXT NOT NULL,
    "pasoActual" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivacionEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoEmpresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo" TEXT,
    "estado" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "archivoNombre" TEXT,
    "archivoNombreOriginal" TEXT,
    "archivoUrl" TEXT,
    "archivoTipo" TEXT,
    "archivoPeso" INTEGER,
    "tieneVencimiento" BOOLEAN NOT NULL DEFAULT false,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "observaciones" TEXT,
    "empresaId" TEXT NOT NULL,
    "subidoPorId" TEXT NOT NULL,
    "documentoRequeridoId" TEXT,
    "creadoPorEmail" TEXT,
    "firmado" BOOLEAN NOT NULL DEFAULT false,
    "firmadoPor" TEXT,
    "firmadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaDocumentoEmpresa" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "contenidoBase" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlantillaDocumentoEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoRequeridoEmpresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "aplicaDesdeTrabajadores" INTEGER,
    "aplicaHastaTrabajadores" INTEGER,
    "requiereVencimiento" BOOLEAN NOT NULL DEFAULT false,
    "periodicidadMeses" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoRequeridoEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoEmpresaHistorial" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,
    "version" TEXT,
    "archivoNombre" TEXT,
    "archivoNombreOriginal" TEXT,
    "archivoUrl" TEXT,
    "archivoTipo" TEXT,
    "archivoPeso" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoEmpresaHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObligacionEmpresaEstado" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "obligacionClave" TEXT NOT NULL,
    "cumple" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL,
    "observacion" TEXT,
    "actualizadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObligacionEmpresaEstado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HallazgoCumplimiento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "centroTrabajoId" TEXT,
    "trabajadorId" TEXT,
    "obligacionClave" TEXT,
    "tipo" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaCompromiso" TIMESTAMP(3) NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HallazgoCumplimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentroTrabajo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "comuna" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "cantidadTrabajadores" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CentroTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cargo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "areaId" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "perfilSST" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "esCritico" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trabajador" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "centroTrabajoId" TEXT,
    "areaId" TEXT,
    "cargoId" TEXT,
    "posicionDotacionId" TEXT,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "rut" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "fechaIngreso" TIMESTAMP(3),
    "fechaNacimiento" TIMESTAMP(3),
    "tipoContrato" TEXT,
    "jornada" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenciaCumplimiento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "fechaEvidencia" TIMESTAMP(3) NOT NULL,
    "observacion" TEXT,
    "archivoNombre" TEXT,
    "archivoUrl" TEXT,
    "archivoTipo" TEXT,
    "archivoPeso" INTEGER,
    "hallazgoId" TEXT,
    "obligacionClave" TEXT,
    "accionPlanId" TEXT,
    "centroTrabajoId" TEXT,
    "trabajadorId" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenciaCumplimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenciaCumplimientoHistorial" (
    "id" TEXT NOT NULL,
    "evidenciaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenciaCumplimientoHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrabajadorDocumento" (
    "id" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'trabajador',
    "estado" TEXT NOT NULL DEFAULT 'pendiente_carga',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "esVigente" BOOLEAN NOT NULL DEFAULT true,
    "versionNumero" INTEGER NOT NULL DEFAULT 1,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "reemplazadoPorId" TEXT,
    "motivoReemplazo" TEXT,
    "archivoNombre" TEXT,
    "archivoNombreOriginal" TEXT,
    "archivoUrl" TEXT,
    "archivoTipo" TEXT,
    "archivoPeso" INTEGER,
    "tieneVencimiento" BOOLEAN NOT NULL DEFAULT false,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "observaciones" TEXT,
    "subidoPorId" TEXT,
    "creadoPorEmail" TEXT,
    "firmado" BOOLEAN NOT NULL DEFAULT false,
    "firmadoPor" TEXT,
    "firmadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrabajadorDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrabajadorDocumentoHistorial" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,
    "version" TEXT,
    "origen" TEXT,
    "contenidoSnapshot" TEXT,
    "archivoNombre" TEXT,
    "archivoNombreOriginal" TEXT,
    "archivoUrl" TEXT,
    "archivoTipo" TEXT,
    "archivoPeso" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrabajadorDocumentoHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoTipoTrabajador" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "vigenciaDias" INTEGER,
    "requiereVencimiento" BOOLEAN NOT NULL DEFAULT false,
    "requiereArchivo" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoTipoTrabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglaDocumentoTrabajador" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipoDocumentoId" TEXT NOT NULL,
    "cargoId" TEXT,
    "areaId" TEXT,
    "centroTrabajoId" TEXT,
    "tipoContrato" TEXT,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReglaDocumentoTrabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capacitacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "modalidad" TEXT NOT NULL,
    "duracionHoras" INTEGER,
    "vigenciaMeses" INTEGER,
    "requiereEvaluacion" BOOLEAN NOT NULL DEFAULT false,
    "requiereFirma" BOOLEAN NOT NULL DEFAULT false,
    "generaCertificado" BOOLEAN NOT NULL DEFAULT false,
    "esObligatoria" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacitacionAsignacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "sesionId" TEXT,
    "origen" TEXT NOT NULL DEFAULT 'manual',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEnvio" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "fechaCompletada" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "fechaCancelacion" TIMESTAMP(3),
    "token" TEXT,
    "observacion" TEXT,
    "nota" DOUBLE PRECISION,
    "aprobado" BOOLEAN,
    "evidenciaDocumentoId" TEXT,
    "certificadoDocumentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacitacionAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacitacionSesion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "creadoPorId" TEXT,
    "titulo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TIMESTAMP(3),
    "horaFin" TIMESTAMP(3),
    "modalidad" TEXT NOT NULL,
    "ubicacion" TEXT,
    "relator" TEXT,
    "cupos" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'programada',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacitacionSesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacitacionHistorial" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "asignacionId" TEXT,
    "sesionId" TEXT,
    "evaluacionId" TEXT,
    "usuarioId" TEXT,
    "tipoEvento" TEXT NOT NULL,
    "detalle" TEXT,
    "estado" TEXT,
    "fechaEvento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacitacionHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacitacionEvaluacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "asignacionId" TEXT,
    "sesionId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'registrada',
    "asistencia" BOOLEAN,
    "nota" DOUBLE PRECISION,
    "aprobado" BOOLEAN,
    "fechaEvaluacion" TIMESTAMP(3) NOT NULL,
    "observacion" TEXT,
    "evidenciaDocumentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacitacionEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacitacionAsistencia" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "asignacionId" TEXT,
    "estadoAsistencia" TEXT NOT NULL DEFAULT 'ausente',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaCheckIn" TIMESTAMP(3),
    "horaCheckOut" TIMESTAMP(3),
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacitacionAsistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCapacitacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "periodo" TEXT,
    "anio" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "version" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "aprobadoPorId" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanCapacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCapacitacionItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "cargoId" TEXT,
    "areaId" TEXT,
    "centroTrabajoId" TEXT,
    "periodicidad" TEXT NOT NULL,
    "mesProgramado" INTEGER,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "responsableId" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanCapacitacionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglaCapacitacionCargo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "cargoId" TEXT,
    "areaId" TEXT,
    "centroTrabajoId" TEXT,
    "tipoContrato" TEXT,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "periodicidad" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReglaCapacitacionCargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaPlanCapacitacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipoEmpresa" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaPlanCapacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaPlanCapacitacionItem" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "cargoId" TEXT,
    "areaId" TEXT,
    "centroTrabajoId" TEXT,
    "periodicidad" TEXT NOT NULL,
    "mesProgramado" INTEGER,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaPlanCapacitacionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosicionDotacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "centroTrabajoId" TEXT NOT NULL,
    "cargoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "esCritica" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosicionDotacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "centroTrabajoId" TEXT,
    "patente" TEXT NOT NULL,
    "codigoInterno" TEXT,
    "tipo" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "anio" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'operativo',
    "responsable" TEXT,
    "proximaRevision" TEXT,
    "kilometraje" INTEGER,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiculoDocumento" (
    "id" TEXT NOT NULL,
    "vehiculoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "subido" BOOLEAN NOT NULL DEFAULT false,
    "vencimiento" TEXT,
    "archivoNombre" TEXT,
    "archivoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehiculoDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiculoMantencion" (
    "id" TEXT NOT NULL,
    "vehiculoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'programada',
    "observaciones" TEXT,
    "kilometraje" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehiculoMantencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandanteAcreditacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'mandante',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MandanteAcreditacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaAcreditacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "mandanteId" TEXT,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'mandante_general',
    "descripcion" TEXT NOT NULL DEFAULT '',
    "origen" TEXT NOT NULL DEFAULT 'nextprev',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaAcreditacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitoPlantillaAcreditacion" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "nombreDocumento" TEXT NOT NULL,
    "codigoDocumento" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'empresa',
    "aplicaA" TEXT NOT NULL DEFAULT 'empresa',
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "permiteMultiples" BOOLEAN NOT NULL DEFAULT false,
    "requiereVencimiento" BOOLEAN NOT NULL DEFAULT false,
    "requiereRevisionManual" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "observacionAyuda" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequisitoPlantillaAcreditacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acreditacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "mandanteId" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "nombreProyecto" TEXT,
    "obraFaena" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'en_preparacion',
    "responsableId" TEXT,
    "observaciones" TEXT,
    "fechaEnvio" TIMESTAMP(3),
    "fechaRespuesta" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Acreditacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcreditacionTrabajador" (
    "id" TEXT NOT NULL,
    "acreditacionId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcreditacionTrabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcreditacionVehiculo" (
    "id" TEXT NOT NULL,
    "acreditacionId" TEXT NOT NULL,
    "vehiculoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcreditacionVehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoAcreditacion" (
    "id" TEXT NOT NULL,
    "acreditacionId" TEXT NOT NULL,
    "requisitoId" TEXT NOT NULL,
    "titularTipo" TEXT NOT NULL DEFAULT 'empresa',
    "titularId" TEXT,
    "titularNombre" TEXT,
    "nombreDocumento" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'empresa',
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "estado" TEXT NOT NULL DEFAULT 'faltante',
    "archivoUrl" TEXT,
    "archivoNombre" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "fuenteTipo" TEXT,
    "fuenteId" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoAcreditacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialAcreditacion" (
    "id" TEXT NOT NULL,
    "acreditacionId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialAcreditacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneracionDocumentosLog" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generados" INTEGER NOT NULL DEFAULT 0,
    "actualizados" INTEGER NOT NULL DEFAULT 0,
    "omitidos" INTEGER NOT NULL DEFAULT 0,
    "duracionMs" INTEGER NOT NULL DEFAULT 0,
    "usoIA" BOOLEAN NOT NULL DEFAULT false,
    "errorIA" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneracionDocumentosLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "ActivacionEvento_empresaId_evento_idx" ON "ActivacionEvento"("empresaId", "evento");

-- CreateIndex
CREATE INDEX "ActivacionEvento_createdAt_idx" ON "ActivacionEvento"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoEmpresa_empresaId_documentoRequeridoId_key" ON "DocumentoEmpresa"("empresaId", "documentoRequeridoId");

-- CreateIndex
CREATE INDEX "PlantillaDocumentoEmpresa_empresaId_idx" ON "PlantillaDocumentoEmpresa"("empresaId");

-- CreateIndex
CREATE INDEX "PlantillaDocumentoEmpresa_codigo_idx" ON "PlantillaDocumentoEmpresa"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaDocumentoEmpresa_empresaId_codigo_key" ON "PlantillaDocumentoEmpresa"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoRequeridoEmpresa_nombre_categoria_key" ON "DocumentoRequeridoEmpresa"("nombre", "categoria");

-- CreateIndex
CREATE INDEX "ObligacionEmpresaEstado_empresaId_idx" ON "ObligacionEmpresaEstado"("empresaId");

-- CreateIndex
CREATE INDEX "ObligacionEmpresaEstado_actualizadoPorId_idx" ON "ObligacionEmpresaEstado"("actualizadoPorId");

-- CreateIndex
CREATE UNIQUE INDEX "ObligacionEmpresaEstado_empresaId_obligacionClave_key" ON "ObligacionEmpresaEstado"("empresaId", "obligacionClave");

-- CreateIndex
CREATE INDEX "HallazgoCumplimiento_empresaId_idx" ON "HallazgoCumplimiento"("empresaId");

-- CreateIndex
CREATE INDEX "HallazgoCumplimiento_centroTrabajoId_idx" ON "HallazgoCumplimiento"("centroTrabajoId");

-- CreateIndex
CREATE INDEX "HallazgoCumplimiento_trabajadorId_idx" ON "HallazgoCumplimiento"("trabajadorId");

-- CreateIndex
CREATE INDEX "HallazgoCumplimiento_obligacionClave_idx" ON "HallazgoCumplimiento"("obligacionClave");

-- CreateIndex
CREATE INDEX "HallazgoCumplimiento_estado_idx" ON "HallazgoCumplimiento"("estado");

-- CreateIndex
CREATE INDEX "HallazgoCumplimiento_creadoPorId_idx" ON "HallazgoCumplimiento"("creadoPorId");

-- CreateIndex
CREATE INDEX "CentroTrabajo_empresaId_idx" ON "CentroTrabajo"("empresaId");

-- CreateIndex
CREATE INDEX "Area_empresaId_idx" ON "Area"("empresaId");

-- CreateIndex
CREATE INDEX "Cargo_empresaId_idx" ON "Cargo"("empresaId");

-- CreateIndex
CREATE INDEX "Cargo_areaId_idx" ON "Cargo"("areaId");

-- CreateIndex
CREATE INDEX "Trabajador_empresaId_idx" ON "Trabajador"("empresaId");

-- CreateIndex
CREATE INDEX "Trabajador_centroTrabajoId_idx" ON "Trabajador"("centroTrabajoId");

-- CreateIndex
CREATE INDEX "Trabajador_areaId_idx" ON "Trabajador"("areaId");

-- CreateIndex
CREATE INDEX "Trabajador_cargoId_idx" ON "Trabajador"("cargoId");

-- CreateIndex
CREATE INDEX "Trabajador_posicionDotacionId_idx" ON "Trabajador"("posicionDotacionId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_empresaId_idx" ON "EvidenciaCumplimiento"("empresaId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_hallazgoId_idx" ON "EvidenciaCumplimiento"("hallazgoId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_obligacionClave_idx" ON "EvidenciaCumplimiento"("obligacionClave");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_centroTrabajoId_idx" ON "EvidenciaCumplimiento"("centroTrabajoId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_trabajadorId_idx" ON "EvidenciaCumplimiento"("trabajadorId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_estado_idx" ON "EvidenciaCumplimiento"("estado");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimiento_fechaEvidencia_idx" ON "EvidenciaCumplimiento"("fechaEvidencia");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimientoHistorial_evidenciaId_idx" ON "EvidenciaCumplimientoHistorial"("evidenciaId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimientoHistorial_usuarioId_idx" ON "EvidenciaCumplimientoHistorial"("usuarioId");

-- CreateIndex
CREATE INDEX "EvidenciaCumplimientoHistorial_createdAt_idx" ON "EvidenciaCumplimientoHistorial"("createdAt");

-- CreateIndex
CREATE INDEX "TrabajadorDocumento_trabajadorId_tipo_esVigente_idx" ON "TrabajadorDocumento"("trabajadorId", "tipo", "esVigente");

-- CreateIndex
CREATE INDEX "TrabajadorDocumento_trabajadorId_idx" ON "TrabajadorDocumento"("trabajadorId");

-- CreateIndex
CREATE INDEX "TrabajadorDocumento_empresaId_idx" ON "TrabajadorDocumento"("empresaId");

-- CreateIndex
CREATE INDEX "TrabajadorDocumento_subidoPorId_idx" ON "TrabajadorDocumento"("subidoPorId");

-- CreateIndex
CREATE INDEX "DocumentoTipoTrabajador_empresaId_idx" ON "DocumentoTipoTrabajador"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoTipoTrabajador_empresaId_codigo_key" ON "DocumentoTipoTrabajador"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "ReglaDocumentoTrabajador_empresaId_idx" ON "ReglaDocumentoTrabajador"("empresaId");

-- CreateIndex
CREATE INDEX "ReglaDocumentoTrabajador_tipoDocumentoId_idx" ON "ReglaDocumentoTrabajador"("tipoDocumentoId");

-- CreateIndex
CREATE INDEX "ReglaDocumentoTrabajador_cargoId_idx" ON "ReglaDocumentoTrabajador"("cargoId");

-- CreateIndex
CREATE INDEX "ReglaDocumentoTrabajador_areaId_idx" ON "ReglaDocumentoTrabajador"("areaId");

-- CreateIndex
CREATE INDEX "ReglaDocumentoTrabajador_centroTrabajoId_idx" ON "ReglaDocumentoTrabajador"("centroTrabajoId");

-- CreateIndex
CREATE INDEX "Capacitacion_empresaId_idx" ON "Capacitacion"("empresaId");

-- CreateIndex
CREATE INDEX "Capacitacion_activa_idx" ON "Capacitacion"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "Capacitacion_empresaId_codigo_key" ON "Capacitacion"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CapacitacionAsignacion_token_key" ON "CapacitacionAsignacion"("token");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_empresaId_idx" ON "CapacitacionAsignacion"("empresaId");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_trabajadorId_idx" ON "CapacitacionAsignacion"("trabajadorId");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_capacitacionId_idx" ON "CapacitacionAsignacion"("capacitacionId");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_sesionId_idx" ON "CapacitacionAsignacion"("sesionId");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_estado_idx" ON "CapacitacionAsignacion"("estado");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_fechaAsignacion_idx" ON "CapacitacionAsignacion"("fechaAsignacion");

-- CreateIndex
CREATE INDEX "CapacitacionAsignacion_fechaVencimiento_idx" ON "CapacitacionAsignacion"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "CapacitacionSesion_empresaId_idx" ON "CapacitacionSesion"("empresaId");

-- CreateIndex
CREATE INDEX "CapacitacionSesion_capacitacionId_idx" ON "CapacitacionSesion"("capacitacionId");

-- CreateIndex
CREATE INDEX "CapacitacionSesion_creadoPorId_idx" ON "CapacitacionSesion"("creadoPorId");

-- CreateIndex
CREATE INDEX "CapacitacionSesion_estado_idx" ON "CapacitacionSesion"("estado");

-- CreateIndex
CREATE INDEX "CapacitacionSesion_fecha_idx" ON "CapacitacionSesion"("fecha");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_empresaId_idx" ON "CapacitacionHistorial"("empresaId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_trabajadorId_idx" ON "CapacitacionHistorial"("trabajadorId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_capacitacionId_idx" ON "CapacitacionHistorial"("capacitacionId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_asignacionId_idx" ON "CapacitacionHistorial"("asignacionId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_sesionId_idx" ON "CapacitacionHistorial"("sesionId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_evaluacionId_idx" ON "CapacitacionHistorial"("evaluacionId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_usuarioId_idx" ON "CapacitacionHistorial"("usuarioId");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_estado_idx" ON "CapacitacionHistorial"("estado");

-- CreateIndex
CREATE INDEX "CapacitacionHistorial_fechaEvento_idx" ON "CapacitacionHistorial"("fechaEvento");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_empresaId_idx" ON "CapacitacionEvaluacion"("empresaId");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_trabajadorId_idx" ON "CapacitacionEvaluacion"("trabajadorId");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_capacitacionId_idx" ON "CapacitacionEvaluacion"("capacitacionId");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_asignacionId_idx" ON "CapacitacionEvaluacion"("asignacionId");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_sesionId_idx" ON "CapacitacionEvaluacion"("sesionId");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_estado_idx" ON "CapacitacionEvaluacion"("estado");

-- CreateIndex
CREATE INDEX "CapacitacionEvaluacion_fechaEvaluacion_idx" ON "CapacitacionEvaluacion"("fechaEvaluacion");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_empresaId_idx" ON "CapacitacionAsistencia"("empresaId");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_trabajadorId_idx" ON "CapacitacionAsistencia"("trabajadorId");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_capacitacionId_idx" ON "CapacitacionAsistencia"("capacitacionId");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_sesionId_idx" ON "CapacitacionAsistencia"("sesionId");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_asignacionId_idx" ON "CapacitacionAsistencia"("asignacionId");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_estadoAsistencia_idx" ON "CapacitacionAsistencia"("estadoAsistencia");

-- CreateIndex
CREATE INDEX "CapacitacionAsistencia_fecha_idx" ON "CapacitacionAsistencia"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "CapacitacionAsistencia_sesionId_trabajadorId_key" ON "CapacitacionAsistencia"("sesionId", "trabajadorId");

-- CreateIndex
CREATE INDEX "PlanCapacitacion_empresaId_idx" ON "PlanCapacitacion"("empresaId");

-- CreateIndex
CREATE INDEX "PlanCapacitacion_estado_idx" ON "PlanCapacitacion"("estado");

-- CreateIndex
CREATE INDEX "PlanCapacitacion_anio_idx" ON "PlanCapacitacion"("anio");

-- CreateIndex
CREATE INDEX "PlanCapacitacion_periodo_idx" ON "PlanCapacitacion"("periodo");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_planId_idx" ON "PlanCapacitacionItem"("planId");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_capacitacionId_idx" ON "PlanCapacitacionItem"("capacitacionId");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_cargoId_idx" ON "PlanCapacitacionItem"("cargoId");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_areaId_idx" ON "PlanCapacitacionItem"("areaId");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_centroTrabajoId_idx" ON "PlanCapacitacionItem"("centroTrabajoId");

-- CreateIndex
CREATE INDEX "PlanCapacitacionItem_estado_idx" ON "PlanCapacitacionItem"("estado");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_empresaId_idx" ON "ReglaCapacitacionCargo"("empresaId");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_capacitacionId_idx" ON "ReglaCapacitacionCargo"("capacitacionId");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_cargoId_idx" ON "ReglaCapacitacionCargo"("cargoId");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_areaId_idx" ON "ReglaCapacitacionCargo"("areaId");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_centroTrabajoId_idx" ON "ReglaCapacitacionCargo"("centroTrabajoId");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_tipoContrato_idx" ON "ReglaCapacitacionCargo"("tipoContrato");

-- CreateIndex
CREATE INDEX "ReglaCapacitacionCargo_activo_idx" ON "ReglaCapacitacionCargo"("activo");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacion_empresaId_idx" ON "PlantillaPlanCapacitacion"("empresaId");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacion_activa_idx" ON "PlantillaPlanCapacitacion"("activa");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacion_tipoEmpresa_idx" ON "PlantillaPlanCapacitacion"("tipoEmpresa");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacionItem_plantillaId_idx" ON "PlantillaPlanCapacitacionItem"("plantillaId");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacionItem_capacitacionId_idx" ON "PlantillaPlanCapacitacionItem"("capacitacionId");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacionItem_cargoId_idx" ON "PlantillaPlanCapacitacionItem"("cargoId");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacionItem_areaId_idx" ON "PlantillaPlanCapacitacionItem"("areaId");

-- CreateIndex
CREATE INDEX "PlantillaPlanCapacitacionItem_centroTrabajoId_idx" ON "PlantillaPlanCapacitacionItem"("centroTrabajoId");

-- CreateIndex
CREATE INDEX "PosicionDotacion_empresaId_idx" ON "PosicionDotacion"("empresaId");

-- CreateIndex
CREATE INDEX "PosicionDotacion_centroTrabajoId_idx" ON "PosicionDotacion"("centroTrabajoId");

-- CreateIndex
CREATE INDEX "PosicionDotacion_cargoId_idx" ON "PosicionDotacion"("cargoId");

-- CreateIndex
CREATE UNIQUE INDEX "PosicionDotacion_empresaId_centroTrabajoId_cargoId_key" ON "PosicionDotacion"("empresaId", "centroTrabajoId", "cargoId");

-- CreateIndex
CREATE INDEX "Vehiculo_empresaId_idx" ON "Vehiculo"("empresaId");

-- CreateIndex
CREATE INDEX "VehiculoDocumento_vehiculoId_idx" ON "VehiculoDocumento"("vehiculoId");

-- CreateIndex
CREATE UNIQUE INDEX "VehiculoDocumento_vehiculoId_tipo_key" ON "VehiculoDocumento"("vehiculoId", "tipo");

-- CreateIndex
CREATE INDEX "VehiculoMantencion_vehiculoId_idx" ON "VehiculoMantencion"("vehiculoId");

-- CreateIndex
CREATE INDEX "MandanteAcreditacion_empresaId_idx" ON "MandanteAcreditacion"("empresaId");

-- CreateIndex
CREATE INDEX "MandanteAcreditacion_activo_idx" ON "MandanteAcreditacion"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "MandanteAcreditacion_empresaId_nombre_key" ON "MandanteAcreditacion"("empresaId", "nombre");

-- CreateIndex
CREATE INDEX "PlantillaAcreditacion_empresaId_idx" ON "PlantillaAcreditacion"("empresaId");

-- CreateIndex
CREATE INDEX "PlantillaAcreditacion_mandanteId_idx" ON "PlantillaAcreditacion"("mandanteId");

-- CreateIndex
CREATE INDEX "PlantillaAcreditacion_activa_idx" ON "PlantillaAcreditacion"("activa");

-- CreateIndex
CREATE INDEX "PlantillaAcreditacion_updatedAt_idx" ON "PlantillaAcreditacion"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaAcreditacion_empresaId_nombre_version_key" ON "PlantillaAcreditacion"("empresaId", "nombre", "version");

-- CreateIndex
CREATE INDEX "RequisitoPlantillaAcreditacion_plantillaId_idx" ON "RequisitoPlantillaAcreditacion"("plantillaId");

-- CreateIndex
CREATE INDEX "RequisitoPlantillaAcreditacion_activo_idx" ON "RequisitoPlantillaAcreditacion"("activo");

-- CreateIndex
CREATE INDEX "Acreditacion_empresaId_idx" ON "Acreditacion"("empresaId");

-- CreateIndex
CREATE INDEX "Acreditacion_mandanteId_idx" ON "Acreditacion"("mandanteId");

-- CreateIndex
CREATE INDEX "Acreditacion_plantillaId_idx" ON "Acreditacion"("plantillaId");

-- CreateIndex
CREATE INDEX "Acreditacion_estado_idx" ON "Acreditacion"("estado");

-- CreateIndex
CREATE INDEX "Acreditacion_responsableId_idx" ON "Acreditacion"("responsableId");

-- CreateIndex
CREATE INDEX "Acreditacion_fechaVencimiento_idx" ON "Acreditacion"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "Acreditacion_updatedAt_idx" ON "Acreditacion"("updatedAt");

-- CreateIndex
CREATE INDEX "AcreditacionTrabajador_acreditacionId_idx" ON "AcreditacionTrabajador"("acreditacionId");

-- CreateIndex
CREATE INDEX "AcreditacionTrabajador_trabajadorId_idx" ON "AcreditacionTrabajador"("trabajadorId");

-- CreateIndex
CREATE UNIQUE INDEX "AcreditacionTrabajador_acreditacionId_trabajadorId_key" ON "AcreditacionTrabajador"("acreditacionId", "trabajadorId");

-- CreateIndex
CREATE INDEX "AcreditacionVehiculo_acreditacionId_idx" ON "AcreditacionVehiculo"("acreditacionId");

-- CreateIndex
CREATE INDEX "AcreditacionVehiculo_vehiculoId_idx" ON "AcreditacionVehiculo"("vehiculoId");

-- CreateIndex
CREATE UNIQUE INDEX "AcreditacionVehiculo_acreditacionId_vehiculoId_key" ON "AcreditacionVehiculo"("acreditacionId", "vehiculoId");

-- CreateIndex
CREATE INDEX "DocumentoAcreditacion_acreditacionId_idx" ON "DocumentoAcreditacion"("acreditacionId");

-- CreateIndex
CREATE INDEX "DocumentoAcreditacion_requisitoId_idx" ON "DocumentoAcreditacion"("requisitoId");

-- CreateIndex
CREATE INDEX "DocumentoAcreditacion_estado_idx" ON "DocumentoAcreditacion"("estado");

-- CreateIndex
CREATE INDEX "DocumentoAcreditacion_titularId_idx" ON "DocumentoAcreditacion"("titularId");

-- CreateIndex
CREATE INDEX "DocumentoAcreditacion_fechaVencimiento_idx" ON "DocumentoAcreditacion"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "HistorialAcreditacion_acreditacionId_idx" ON "HistorialAcreditacion"("acreditacionId");

-- CreateIndex
CREATE INDEX "HistorialAcreditacion_usuarioId_idx" ON "HistorialAcreditacion"("usuarioId");

-- CreateIndex
CREATE INDEX "HistorialAcreditacion_createdAt_idx" ON "HistorialAcreditacion"("createdAt");

-- CreateIndex
CREATE INDEX "GeneracionDocumentosLog_empresaId_idx" ON "GeneracionDocumentosLog"("empresaId");

-- CreateIndex
CREATE INDEX "GeneracionDocumentosLog_usuarioId_idx" ON "GeneracionDocumentosLog"("usuarioId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivacionEvento" ADD CONSTRAINT "ActivacionEvento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivacionEvento" ADD CONSTRAINT "ActivacionEvento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoEmpresa" ADD CONSTRAINT "DocumentoEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoEmpresa" ADD CONSTRAINT "DocumentoEmpresa_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoEmpresa" ADD CONSTRAINT "DocumentoEmpresa_documentoRequeridoId_fkey" FOREIGN KEY ("documentoRequeridoId") REFERENCES "DocumentoRequeridoEmpresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaDocumentoEmpresa" ADD CONSTRAINT "PlantillaDocumentoEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoEmpresaHistorial" ADD CONSTRAINT "DocumentoEmpresaHistorial_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "DocumentoEmpresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoEmpresaHistorial" ADD CONSTRAINT "DocumentoEmpresaHistorial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligacionEmpresaEstado" ADD CONSTRAINT "ObligacionEmpresaEstado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligacionEmpresaEstado" ADD CONSTRAINT "ObligacionEmpresaEstado_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallazgoCumplimiento" ADD CONSTRAINT "HallazgoCumplimiento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallazgoCumplimiento" ADD CONSTRAINT "HallazgoCumplimiento_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallazgoCumplimiento" ADD CONSTRAINT "HallazgoCumplimiento_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallazgoCumplimiento" ADD CONSTRAINT "HallazgoCumplimiento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentroTrabajo" ADD CONSTRAINT "CentroTrabajo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cargo" ADD CONSTRAINT "Cargo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cargo" ADD CONSTRAINT "Cargo_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trabajador" ADD CONSTRAINT "Trabajador_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trabajador" ADD CONSTRAINT "Trabajador_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trabajador" ADD CONSTRAINT "Trabajador_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trabajador" ADD CONSTRAINT "Trabajador_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trabajador" ADD CONSTRAINT "Trabajador_posicionDotacionId_fkey" FOREIGN KEY ("posicionDotacionId") REFERENCES "PosicionDotacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimiento" ADD CONSTRAINT "EvidenciaCumplimiento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimiento" ADD CONSTRAINT "EvidenciaCumplimiento_hallazgoId_fkey" FOREIGN KEY ("hallazgoId") REFERENCES "HallazgoCumplimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimiento" ADD CONSTRAINT "EvidenciaCumplimiento_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimiento" ADD CONSTRAINT "EvidenciaCumplimiento_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimiento" ADD CONSTRAINT "EvidenciaCumplimiento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimientoHistorial" ADD CONSTRAINT "EvidenciaCumplimientoHistorial_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "EvidenciaCumplimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaCumplimientoHistorial" ADD CONSTRAINT "EvidenciaCumplimientoHistorial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrabajadorDocumento" ADD CONSTRAINT "TrabajadorDocumento_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrabajadorDocumento" ADD CONSTRAINT "TrabajadorDocumento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrabajadorDocumento" ADD CONSTRAINT "TrabajadorDocumento_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrabajadorDocumentoHistorial" ADD CONSTRAINT "TrabajadorDocumentoHistorial_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "TrabajadorDocumento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrabajadorDocumentoHistorial" ADD CONSTRAINT "TrabajadorDocumentoHistorial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoTipoTrabajador" ADD CONSTRAINT "DocumentoTipoTrabajador_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaDocumentoTrabajador" ADD CONSTRAINT "ReglaDocumentoTrabajador_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaDocumentoTrabajador" ADD CONSTRAINT "ReglaDocumentoTrabajador_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "DocumentoTipoTrabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaDocumentoTrabajador" ADD CONSTRAINT "ReglaDocumentoTrabajador_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaDocumentoTrabajador" ADD CONSTRAINT "ReglaDocumentoTrabajador_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaDocumentoTrabajador" ADD CONSTRAINT "ReglaDocumentoTrabajador_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capacitacion" ADD CONSTRAINT "Capacitacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "CapacitacionSesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_evidenciaDocumentoId_fkey" FOREIGN KEY ("evidenciaDocumentoId") REFERENCES "TrabajadorDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsignacion" ADD CONSTRAINT "CapacitacionAsignacion_certificadoDocumentoId_fkey" FOREIGN KEY ("certificadoDocumentoId") REFERENCES "TrabajadorDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionSesion" ADD CONSTRAINT "CapacitacionSesion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionSesion" ADD CONSTRAINT "CapacitacionSesion_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionSesion" ADD CONSTRAINT "CapacitacionSesion_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "CapacitacionAsignacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "CapacitacionSesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "CapacitacionEvaluacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionHistorial" ADD CONSTRAINT "CapacitacionHistorial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "CapacitacionAsignacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "CapacitacionSesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionEvaluacion" ADD CONSTRAINT "CapacitacionEvaluacion_evidenciaDocumentoId_fkey" FOREIGN KEY ("evidenciaDocumentoId") REFERENCES "TrabajadorDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsistencia" ADD CONSTRAINT "CapacitacionAsistencia_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsistencia" ADD CONSTRAINT "CapacitacionAsistencia_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsistencia" ADD CONSTRAINT "CapacitacionAsistencia_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsistencia" ADD CONSTRAINT "CapacitacionAsistencia_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "CapacitacionSesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacitacionAsistencia" ADD CONSTRAINT "CapacitacionAsistencia_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "CapacitacionAsignacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacion" ADD CONSTRAINT "PlanCapacitacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacion" ADD CONSTRAINT "PlanCapacitacion_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PlanCapacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCapacitacionItem" ADD CONSTRAINT "PlanCapacitacionItem_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCapacitacionCargo" ADD CONSTRAINT "ReglaCapacitacionCargo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCapacitacionCargo" ADD CONSTRAINT "ReglaCapacitacionCargo_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCapacitacionCargo" ADD CONSTRAINT "ReglaCapacitacionCargo_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCapacitacionCargo" ADD CONSTRAINT "ReglaCapacitacionCargo_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaCapacitacionCargo" ADD CONSTRAINT "ReglaCapacitacionCargo_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacion" ADD CONSTRAINT "PlantillaPlanCapacitacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacionItem" ADD CONSTRAINT "PlantillaPlanCapacitacionItem_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaPlanCapacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacionItem" ADD CONSTRAINT "PlantillaPlanCapacitacionItem_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacionItem" ADD CONSTRAINT "PlantillaPlanCapacitacionItem_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacionItem" ADD CONSTRAINT "PlantillaPlanCapacitacionItem_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaPlanCapacitacionItem" ADD CONSTRAINT "PlantillaPlanCapacitacionItem_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosicionDotacion" ADD CONSTRAINT "PosicionDotacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosicionDotacion" ADD CONSTRAINT "PosicionDotacion_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosicionDotacion" ADD CONSTRAINT "PosicionDotacion_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehiculo" ADD CONSTRAINT "Vehiculo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehiculo" ADD CONSTRAINT "Vehiculo_centroTrabajoId_fkey" FOREIGN KEY ("centroTrabajoId") REFERENCES "CentroTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiculoDocumento" ADD CONSTRAINT "VehiculoDocumento_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiculoMantencion" ADD CONSTRAINT "VehiculoMantencion_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandanteAcreditacion" ADD CONSTRAINT "MandanteAcreditacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaAcreditacion" ADD CONSTRAINT "PlantillaAcreditacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaAcreditacion" ADD CONSTRAINT "PlantillaAcreditacion_mandanteId_fkey" FOREIGN KEY ("mandanteId") REFERENCES "MandanteAcreditacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitoPlantillaAcreditacion" ADD CONSTRAINT "RequisitoPlantillaAcreditacion_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaAcreditacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acreditacion" ADD CONSTRAINT "Acreditacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acreditacion" ADD CONSTRAINT "Acreditacion_mandanteId_fkey" FOREIGN KEY ("mandanteId") REFERENCES "MandanteAcreditacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acreditacion" ADD CONSTRAINT "Acreditacion_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaAcreditacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acreditacion" ADD CONSTRAINT "Acreditacion_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcreditacionTrabajador" ADD CONSTRAINT "AcreditacionTrabajador_acreditacionId_fkey" FOREIGN KEY ("acreditacionId") REFERENCES "Acreditacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcreditacionTrabajador" ADD CONSTRAINT "AcreditacionTrabajador_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcreditacionVehiculo" ADD CONSTRAINT "AcreditacionVehiculo_acreditacionId_fkey" FOREIGN KEY ("acreditacionId") REFERENCES "Acreditacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcreditacionVehiculo" ADD CONSTRAINT "AcreditacionVehiculo_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoAcreditacion" ADD CONSTRAINT "DocumentoAcreditacion_acreditacionId_fkey" FOREIGN KEY ("acreditacionId") REFERENCES "Acreditacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoAcreditacion" ADD CONSTRAINT "DocumentoAcreditacion_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "RequisitoPlantillaAcreditacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialAcreditacion" ADD CONSTRAINT "HistorialAcreditacion_acreditacionId_fkey" FOREIGN KEY ("acreditacionId") REFERENCES "Acreditacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialAcreditacion" ADD CONSTRAINT "HistorialAcreditacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

