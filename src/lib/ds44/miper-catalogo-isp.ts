export type CategoriaRiesgoIsp = "seguridad" | "emergencia" | "higienico" | "psicosocial" | "musculoesqueletico";
export type MetodologiaRiesgoIsp = "vep_isp" | "evaluacion_especifica";

export type RiesgoCatalogoIsp = {
  codigoIsp: string;
  familia: string;
  riesgoEspecifico: string;
  definicion: string;
  categoria: CategoriaRiesgoIsp;
  metodologiaEvaluacion: MetodologiaRiesgoIsp;
  protocoloAplicable: string | null;
};

/**
 * Catálogo oficial del Anexo C de la matriz IPER ISP v3 (2024).
 * La codificación se conserva para trazabilidad; las sugerencias siempre requieren
 * confirmación humana antes de transformarse en un ítem de la matriz.
 */
export const CATALOGO_RIESGOS_ISP: readonly RiesgoCatalogoIsp[] = [
  {
    "codigoIsp": "A1",
    "familia": "Caída de personas",
    "riesgoEspecifico": "Caídas al mismo nivel",
    "definicion": "Caída que se produce en el mismo plano de sustentación, por ejemplo: caídas en lugares de tránsito o superficies de trabajo, caídas sobre o contra objetos.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "A2",
    "familia": "Caída de personas",
    "riesgoEspecifico": "Caídas a distinto nivel",
    "definicion": "Caída a un plano inferior de sustentación desde una altura no superior a 1,8 m, (incluye caídas en profundidades no mayores a 1,8 m. en excavaciones, agujeros, zanjas, etc.).",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "A3",
    "familia": "Caída de personas",
    "riesgoEspecifico": "Caídas de altura",
    "definicion": "Caída a un plano inferior de sustentación, desde una altura superior a 1,8 m. Caídas desde alturas (incluye caídas en profundidades mayores a 1,8 m).",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "A4",
    "familia": "Caída de personas",
    "riesgoEspecifico": "Caídas al agua",
    "definicion": "Caída a un curso de agua natural, o bien al interior de una estructura que contiene agua.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "B1",
    "familia": "Contacto con objetos",
    "riesgoEspecifico": "Atrapamiento",
    "definicion": "Enganche o aprisionamiento del cuerpo, o parte de éste, por mecanismos de las máquinas, objetos, piezas, materiales, equipos o vehículos que han perdido su estabilidad.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "B2",
    "familia": "Contacto con objetos",
    "riesgoEspecifico": "Caída de objetos",
    "definicion": "Caída de elementos que golpean al cuerpo, por ejemplo, materiales, herramientas, estructuras, etc.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "B3",
    "familia": "Contacto con objetos",
    "riesgoEspecifico": "Cortes por objetos / herramientas corto-punzantes",
    "definicion": "Cortes y/o punzaciones generadas en parte del cuerpo debido al contacto de éste con objetos cortantes, punzantes y/o abrasivos.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "B4",
    "familia": "Contacto con objetos",
    "riesgoEspecifico": "Choque contra objetos",
    "definicion": "Encuentro violento del cuerpo, o de una parte de éste, con uno o varios objetos, estén éstos en movimiento o no.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "C1",
    "familia": "Contacto con seres vivos",
    "riesgoEspecifico": "Contacto con personas",
    "definicion": "Lesiones recibidas en el cuerpo, o parte de éste (agresiones, patadas, mordiscos, etc.) debido a la acción de otras personas.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "C2",
    "familia": "Contacto con seres vivos",
    "riesgoEspecifico": "Contacto con animales y/o insectos",
    "definicion": "Lesiones recibidas en el cuerpo, o parte de éste (arañazos, patadas, mordiscos, etc.) debido a la interacción con animales y/o insectos.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "E1",
    "familia": "Contactos térmicos",
    "riesgoEspecifico": "Contactos térmicos por calor",
    "definicion": "Acción y efecto de hacer contacto físico con superficies o productos calientes.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "E2",
    "familia": "Contactos térmicos",
    "riesgoEspecifico": "Contactos térmicos por frío",
    "definicion": "Acción y efecto de hacer contacto físico con superficies o productos fríos.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "F1",
    "familia": "Contacto con energía eléctrica",
    "riesgoEspecifico": "Contactos eléctricos directos baja tensión",
    "definicion": "Es todo contacto directo de las personas con partes activas en tensión (trabajando con tensiones menores a 1000 volts).",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "F2",
    "familia": "Contacto con energía eléctrica",
    "riesgoEspecifico": "Contactos eléctricos directos alta tensión",
    "definicion": "Es todo contacto directo de las personas con partes activas en tensión (trabajando con tensiones mayores a 1000 volts).",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "F3",
    "familia": "Contacto con energía eléctrica",
    "riesgoEspecifico": "Contactos eléctricos indirectos baja tensión",
    "definicion": "Es todo contacto de las personas con masas puestas accidentalmente en tensión (trabajando con tensiones menores a 1000 volts).",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "F4",
    "familia": "Contacto con energía eléctrica",
    "riesgoEspecifico": "Contactos eléctricos indirectos alta tensión",
    "definicion": "Es todo contacto de las personas con masas puestas accidentalmente en tensión (trabajando con tensiones mayores a 1000 volts).",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "G1",
    "familia": "Contacto con sustancias químicas",
    "riesgoEspecifico": "Contacto con sustancias cáusticas y/o corrosivas",
    "definicion": "Acción y efecto de tocar sustancias y productos cáusticos y/o corrosivos que puedan producir reacciones alérgicas y/o lesiones externas en la piel",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "G2",
    "familia": "Contacto con sustancias químicas",
    "riesgoEspecifico": "Contacto con otras sustancias químicas",
    "definicion": "Acción y efecto de tocar sustancias y productos sin efectos cáusticos y/o corrosivos que puedan producir reacciones alérgicas y/o lesiones externas en la piel",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "H1",
    "familia": "Contacto con elementos que se proyectan",
    "riesgoEspecifico": "Explosiones",
    "definicion": "Liberación brusca de gran cantidad de energía que produce un incremento violento y rápido de la presión, con desprendimiento de calor, luz y gases, teniendo su origen en transformaciones químicas y/o físicas.",
    "categoria": "emergencia",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "H2",
    "familia": "Contacto con elementos que se proyectan",
    "riesgoEspecifico": "Proyección de fragmentos y/o partículas",
    "definicion": "Contacto violento del cuerpo, o una parte de éste, con elementos proyectados como: piezas, fragmentos, partículas o líquido.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "I1",
    "familia": "Contacto con / en Vehículos en movimiento",
    "riesgoEspecifico": "Atropellos o golpes con vehículos",
    "definicion": "Impacto entre un peatón y un vehículo en movimiento.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "I2",
    "familia": "Contacto con / en Vehículos en movimiento",
    "riesgoEspecifico": "Choque, colisión o volcamiento",
    "definicion": "Lesiones generadas en el cuerpo de un conductor o pasajero de un vehículo cuando éste se vuelca o impacta con otro vehículo y/o estructura externa.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "J",
    "familia": "Incendios",
    "riesgoEspecifico": "Incendios",
    "definicion": "Conjunto de condiciones (combustibles, comburentes y fuentes de ignición) cuya conjunción en un momento determinado, pueden originar un fuego incontrolado. Sus efectos son generalmente no deseados, produciendo lesiones personales por el humo (gases tóxicos y altas temperaturas) y daños materiales.",
    "categoria": "emergencia",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "K1",
    "familia": "Exposición a condiciones atmosféricas extremas",
    "riesgoEspecifico": "Exposición a ambientes con deficiencia de oxígeno",
    "definicion": "Exposición de un trabajador a una atmosfera con déficit de oxígeno (concentración de oxígeno inferior al 19,5% en el aire), a presión atmosférica normal.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "K2",
    "familia": "Exposición a condiciones atmosféricas extremas",
    "riesgoEspecifico": "Exposición a sustancias químicas tóxicas",
    "definicion": "Exposición de un trabajador a una atmosfera con altas concentraciones de químicos provenientes principalmente de la descomposición de materia orgánica (ácido sulfhídrico, monóxido de carbono, anhídrido carbónico, amoníaco, etc.).",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "L1",
    "familia": "Exposición a radiaciones",
    "riesgoEspecifico": "Exposición a radiaciones no ionizantes",
    "definicion": "Exposición de un trabajador a altas dosis de radiaciones no ionizantes (ultravioleta (UV), láser, Infrarroja (IR), microondas, radiofrecuencias, campos de frecuencia extremadamente baja (ELF)), entendiendo dicha exposición como accidente.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "L2",
    "familia": "Exposición a radiaciones",
    "riesgoEspecifico": "Exposición a radiaciones ionizantes",
    "definicion": "Exposición de un trabajador a altas dosis de radiaciones ionizantes (rayos X, rayos gamma), entendiendo dicha exposición como accidente.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "M",
    "familia": "Ingesta de sustancias nocivas",
    "riesgoEspecifico": "Ingesta de sustancias nocivas",
    "definicion": "Ingesta de sustancias nocivas que puedan alterar la salud de un trabajador (alimentos en mal estado, venenos, sustancias químicas, etc.).",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "N",
    "familia": "Otros riesgos",
    "riesgoEspecifico": "Otros riesgos",
    "definicion": "Son aquellos riesgos de accidente que, a juicio del evaluador, no han sido descritos en ninguno de los ítems anteriores.",
    "categoria": "seguridad",
    "metodologiaEvaluacion": "vep_isp",
    "protocoloAplicable": null
  },
  {
    "codigoIsp": "O1",
    "familia": "Exposición a agentes químicos",
    "riesgoEspecifico": "Exposición a aerosoles sólidos",
    "definicion": "Permanencia en un ambiente de trabajo con presencia de partículas sólidas en suspensión como polvos, fibras y humos. (Sílice, polvo de harina, fibras, humos de soldadura, etc.)",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "DS 594 y método o protocolo específico aplicable al agente"
  },
  {
    "codigoIsp": "O2",
    "familia": "Exposición a agentes químicos",
    "riesgoEspecifico": "Exposición a aerosoles líquidos",
    "definicion": "Permanencia en un ambiente de trabajo con presencia de partículas líquidas en suspensión como nieblas y rocíos. (nieblas de ácidos, plaguicidas, etc.)",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "DS 594 y método o protocolo específico aplicable al agente"
  },
  {
    "codigoIsp": "O3",
    "familia": "Exposición a agentes químicos",
    "riesgoEspecifico": "Exposición a gases y vapores",
    "definicion": "Permanencia en un ambiente de trabajo con presencia de sustancias en estado gaseoso (gases o vapores), tales como: gases anestésicos, acetonas, tolueno, benceno, xileno, etc.",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "DS 594 y método o protocolo específico aplicable al agente"
  },
  {
    "codigoIsp": "P1",
    "familia": "Exposición a agentes físicos",
    "riesgoEspecifico": "Exposición a ruido",
    "definicion": "Permanencia en un ambiente de trabajo con presencia continua de altos niveles de presión sonora (en forma estable o fluctuante), con la potencialidad de alterar el órgano de la audición.",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de Exposición Ocupacional a Ruido (PREXOR)"
  },
  {
    "codigoIsp": "P2",
    "familia": "Exposición a agentes físicos",
    "riesgoEspecifico": "Exposición a Vibraciones",
    "definicion": "Permanencia en un ambiente de trabajo con presencia de energía vibratoria que se transfiere al cuerpo humano en formal global (cuerpo completo), el cual actúa como receptor de energía mecánica.",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "DS 594 y método o protocolo específico aplicable al agente"
  },
  {
    "codigoIsp": "P3",
    "familia": "Exposición a agentes físicos",
    "riesgoEspecifico": "Exposición a Vibraciones",
    "definicion": "Permanencia en un ambiente de trabajo con presencia de energía vibratoria que se transfiere al componente mano-brazo, el cual actúa como receptor de energía mecánica.",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "DS 594 y método o protocolo específico aplicable al agente"
  },
  {
    "codigoIsp": "P4",
    "familia": "Exposición a agentes físicos",
    "riesgoEspecifico": "Exposición a Radiaciones Ionizantes",
    "definicion": "Permanencia en un ambiente de trabajo con presencia de radiaciones electromagnéticas capaces de producir la ionización de manera directa o indirecta, en su paso a través de la materia (Rayos X, Rayos Gamma, provenientes de generadores o fuentes; entre otras)",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "DS 594 y método o protocolo específico aplicable al agente"
  },
  {
    "codigoIsp": "P5",
    "familia": "Exposición a agentes físicos",
    "riesgoEspecifico": "Exposición a Radiaciones No Ionizantes",
    "definicion": "Permanencia en un ambiente de trabajo con presencia de radiaciones electromagnéticas incapaces de producir ionización de manera directa o indirecta a su paso a través de la materia (Rayos visibles, UV de fuentes naturales o artificiales, Laser, Microondas, entre otros)",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "DS 594 y método o protocolo específico aplicable al agente"
  },
  {
    "codigoIsp": "P6",
    "familia": "Exposición a agentes físicos",
    "riesgoEspecifico": "Exposición a Calor",
    "definicion": "Permanencia en un ambiente de trabajo a altas temperaturas, las cuales pueden generar un aumento de la temperatura corporal interna del trabajador sobre los 38°C.",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "DS 594 y método o protocolo específico aplicable al agente"
  },
  {
    "codigoIsp": "P7",
    "familia": "Exposición a agentes físicos",
    "riesgoEspecifico": "Exposición a Frío",
    "definicion": "Permanencia en un ambiente de trabajo a bajas temperaturas, las cuales pueden generar una disminución de la temperatura corporal interna del trabajador bajo los 36°C.",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "DS 594 y método o protocolo específico aplicable al agente"
  },
  {
    "codigoIsp": "P8",
    "familia": "Exposición a agentes físicos",
    "riesgoEspecifico": "Exposición a Altas presiones",
    "definicion": "Permanencia en un ambiente de trabajo a presiones superiores a la atmosférica (actividades bajo el nivel del mar (buceo), cámaras hiperbáricas, etc.).",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Guía técnica para trabajos hiperbáricos"
  },
  {
    "codigoIsp": "P9",
    "familia": "Exposición a agentes físicos",
    "riesgoEspecifico": "Exposición a Bajas presiones",
    "definicion": "Permanencia en un ambiente de trabajo a presiones inferiores a la atmosférica (trabajos a partir de los 3.000 m.s.n.m. (altitud geográfica).",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Guía técnica sobre exposición ocupacional a hipobaria intermitente crónica por gran altitud"
  },
  {
    "codigoIsp": "Q1",
    "familia": "Exposición a peligros biológicos",
    "riesgoEspecifico": "Transmisión por Fluidos Corporales",
    "definicion": "Se entiende por fluido corporal a todas las secreciones o líquidos biológicos, fisiológicos o patológicos, que se producen en el organismo, tanto de bajo riesgo (deposiciones, secreciones nasales, expectoración, transpiración, lágrimas, orina o vómitos a excepción que contengan sangre visible) y de alto riesgo (se aplican siempre a la sangre y a todos los fluidos que contengan sangre visible, los que por la vía parenteral, pueden transmitir Virus de Hepatitis B, Virus de Hepatitis C, VIH, y otros agentes)",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "DS 594 y método o protocolo específico aplicable al agente"
  },
  {
    "codigoIsp": "Q2",
    "familia": "Exposición a peligros biológicos",
    "riesgoEspecifico": "Transmisión por inhalación dermal, oral y parenteral",
    "definicion": "Exposición a virus, bacterias, parásitos, etc., por inhalación dermal, oral y parenteral, la cual puede afectar la salud de una persona trabajadora generando enfermedades infecciosas y parasitarias agudas o crónicas.",
    "categoria": "higienico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "DS 594 y método o protocolo específico aplicable al agente"
  },
  {
    "codigoIsp": "R1",
    "familia": "Manejo o Manipulación Manual de Carga (MMC) o personas /Pacientes (MMP)",
    "riesgoEspecifico": "Sobrecarga física debido a la manipulación manual de cargas",
    "definicion": "Trabajos en donde se deban levantar, descender o transportar manualmente objetos de más de 3 kilos.\nTrabajos en donde se deban empujar o arrastrar objetos utilizando 1 o 2 manos.",
    "categoria": "musculoesqueletico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Guía técnica para la evaluación y control de riesgos asociados al manejo o manipulación manual de carga"
  },
  {
    "codigoIsp": "R2",
    "familia": "Manejo o Manipulación Manual de Carga (MMC) o personas /Pacientes (MMP)",
    "riesgoEspecifico": "Sobrecarga física debido a la manipulación de personas/ pacientes",
    "definicion": "Trabajos en donde se deba realizar manejo manual de pacientes.\nCorresponde a actividades en donde se requiera fuerza para empujar, tirar, levantar, descender, transferir o de alguna manera mover o sostener una persona o parte del cuerpo de una persona que no sea autovalente, ya sea que se realice con o sin dispositivos de asistencia.",
    "categoria": "musculoesqueletico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Guía técnica para la evaluación y control de riesgos asociados al manejo o manipulación manual de personas/pacientes"
  },
  {
    "codigoIsp": "S1",
    "familia": "Trabajo repetitivo de\nmiembros superiores",
    "riesgoEspecifico": "Sobrecarga física debido al trabajo repetitivo de miembros superiores",
    "definicion": "Tarea donde se involucra los miembros superiores (hombro, brazo, antebrazo, mano), caracterizada por tareas durante las cuales las mismas acciones de trabajo son repetidas por más del 50% de la duración de éstas, y/o el tiempo de ciclo es inferior a 30 segundos, y con una duración total de una hora o más durante la jornada laboral y con un tiempo total de 5 o más horas a la semana.",
    "categoria": "musculoesqueletico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia ocupacional de factores de riesgo de trastornos musculoesqueléticos (TMERT)"
  },
  {
    "codigoIsp": "T1",
    "familia": "Posturas forzadas",
    "riesgoEspecifico": "Sobrecarga Postural debido a trabajo de pie",
    "definicion": "Trabajo en posición bípeda permanente con escasa opción de alternancia postural (Ej. Temporeras, laboratoristas, puestos en líneas de proceso, etc.)",
    "categoria": "musculoesqueletico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo TMERT y guía técnica específica aplicable"
  },
  {
    "codigoIsp": "T2",
    "familia": "Posturas forzadas",
    "riesgoEspecifico": "Sobrecarga postural debido a trabajo sentado",
    "definicion": "Trabajo en posición sentado mantenido por períodos prolongados con escasa opción de alternancia postural (ej. puestos administrativos, uso de prolongado de pantallas de visualización de datos o PVD, camioneros, operador de maquinaria, conductores de locomoción pública, otros)",
    "categoria": "musculoesqueletico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo TMERT y guía técnica específica aplicable"
  },
  {
    "codigoIsp": "T3",
    "familia": "Posturas forzadas",
    "riesgoEspecifico": "Sobrecarga postural debido a trabajo en cuclillas.",
    "definicion": "Trabajo que implica flexionar (doblar) las rodillas al máximo y sostener esta posición durante tiempos prolongados (ej. mecánicos, electricistas, mucamas, etc.).",
    "categoria": "musculoesqueletico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo TMERT y guía técnica específica aplicable"
  },
  {
    "codigoIsp": "T4",
    "familia": "Posturas forzadas",
    "riesgoEspecifico": "Sobrecarga postural debido a trabajo arrodillado",
    "definicion": "Trabajo que implica apoyo (compresión) directa de las rodillas en forma sostenida (Ej. mecánicos de mantención, albañil, instaladores de piso, etc.).",
    "categoria": "musculoesqueletico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo TMERT y guía técnica específica aplicable"
  },
  {
    "codigoIsp": "T5",
    "familia": "Posturas forzadas",
    "riesgoEspecifico": "Sobrecarga Postural debido a Tronco inclinado, en torsión o lateralización",
    "definicion": "Trabajo con Posturas del tronco fuera del rango neutro o de confort; pudiendo incluir una o más de las siguientes situaciones: Trabajo con inclinación del tronco que se aleja del cuerpo (hacia adelante, o había atrás, habitualmente acompañado de piernas extendidas); Trabajo con torsión (rotación o giro) del tronco; Trabajo con lateralización del tronco (desviación lateral de la columna).",
    "categoria": "musculoesqueletico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo TMERT y guía técnica específica aplicable"
  },
  {
    "codigoIsp": "T6",
    "familia": "Posturas forzadas",
    "riesgoEspecifico": "Sobrecarga postural por flexión o extensión de la columna cervical",
    "definicion": "Adopción de postura estática, en flexión o extensión del segmento cabeza – cuello, sin una pausa o variación postural que permita un adecuado descanso. Ejemplo (salas de control, uso de PVD en trabajo de oficina, etc.)",
    "categoria": "musculoesqueletico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo TMERT y guía técnica específica aplicable"
  },
  {
    "codigoIsp": "T7",
    "familia": "Posturas forzadas",
    "riesgoEspecifico": "Sobrecarga Postural debido a trabajo fuera del alcance funcional",
    "definicion": "Trabajos que implican estiramiento, extensión, flexión, elevación, rotación o cualquier otro movimiento de extremidades (superiores e inferiores) producto de la operación de elementos que se encuentran fuera del alcance funcional. (Ej.: limpiador de vidrios, reponedor, carpinteros, pintores, mucamas, otros)",
    "categoria": "musculoesqueletico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo TMERT y guía técnica específica aplicable"
  },
  {
    "codigoIsp": "T8",
    "familia": "Posturas estáticas",
    "riesgoEspecifico": "Sobrecarga postural debido a actividad muscular estática",
    "definicion": "Tareas con actividad muscular en posturas estáticas de cabeza/cuello, tronco, miembros superiores o inferiores, que se mantengan por más de 4 segundos consecutivamente.\nCorresponde a actividades en donde se aplica fuerza muscular y no se visualiza movimiento evidente de los segmentos del cuerpo, es decir las articulaciones se mantienen en su posición o hay mínimas variaciones.",
    "categoria": "musculoesqueletico",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo TMERT y guía técnica específica aplicable"
  },
  {
    "codigoIsp": "D1",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "1. Dimensión carga de trabajo (CT).",
    "definicion": "La carga de trabajo son las exigencias que se le hacen a los trabajadores y trabajadoras para que cumplan con un determinado objetivo o tarea en un tiempo acotado o limitado. Es decir, en la carga de trabajo existe una relación entre la cantidad de tareas y el tiempo en que se deben realizar, que puede ser desde minutos hasta semanas o más.",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  },
  {
    "codigoIsp": "D2",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "2.Dimensión exigencias emocionales (EM)",
    "definicion": "Las exigencias emocionales demandan nuestra capacidad para entender la situación de otras personas, sobre todo cuando esas personas sienten a su vez emociones intensas. Por ejemplo, la atención de víctimas de violencia o violación sexual, personas que pierden una persona querida, o que pierden su trabajo o han sufrido un accidente grave o amputación, o saben que tienen una enfermedad incurable, o adultos y niños en situación social crítica, o con problemas con la justicia.",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  },
  {
    "codigoIsp": "D3",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "3.Dimensión desarrollo profesional (DP)",
    "definicion": "El desarrollo profesional es la oportunidad y el estímulo que ofrece el trabajo para que cada persona ponga en práctica los conocimientos y la experiencia que ya tiene, pero pueda también adquirir nuevos conocimientos y experiencia",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  },
  {
    "codigoIsp": "D4",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "4.Dimensión reconocimiento y claridad de rol (RC)",
    "definicion": "Esta dimensión o característica evalúa el reconocimiento, respeto y rectitud en el trato que recibimos en nuestro trabajo. También mide el sentido de las tareas que se realizan y la claridad de los límites de la responsabilidad que tenemos o que se nos asigna. La claridad de los roles asignados favorece el reconocimiento y el respeto.",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  },
  {
    "codigoIsp": "D5",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "5.Dimensión conflicto de rol (CR)",
    "definicion": "En el trabajo, el rol es lo que se espera que una persona haga en el puesto que tiene asignado. El conflicto de rol evalúa la sensación de molestia personal ante el tipo de tareas que estamos obligados a hacer, especialmente cuando creemos que esas tareas son incongruentes entre sí, o que podrían hacerse de una manera diferente o cuando creemos que no nos corresponde realizarlas.",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  },
  {
    "codigoIsp": "D6",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "6. Dimensión calidad del liderazgo (QL)",
    "definicion": "La calidad del liderazgo es la forma en que se expresa el mando de una jefatura sobre nosotros. Incluye la capacidad de la jefatura de planificar el trabajo, resolver conflictos y colaborar para que los trabajadores/as subordinados puedan llegar a completar su tarea.",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  },
  {
    "codigoIsp": "D7",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "7. Dimensión compañerismo (CM)",
    "definicion": "El compañerismo es la sensación de pertenecer a un equipo de trabajo conformado por pares, donde se recibe y se entrega ayuda cuando se necesita.",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  },
  {
    "codigoIsp": "D8",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "8 Dimensión inseguridad en las condiciones de trabajo (IT)",
    "definicion": "La inseguridad en las condiciones de trabajo es la sensación de que se nos puede cambiar de una manera más o menos arbitraria la forma en que trabajamos, o las tareas, los horarios, los lugares a los que estamos destinados.",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  },
  {
    "codigoIsp": "D9",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "9.Dimensión equilibrio trabajo y vida privada (TV)",
    "definicion": "El equilibrio entre el trabajo y la vida privada es la manera en que estos dos ámbitos de nuestra vida nos permiten un desarrollo adecuado como personas, sin que una exigencia desmedida del trabajo interfiera con la vida privada.",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  },
  {
    "codigoIsp": "D10",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "10 Dimensión confianza y justicia organizacional (CJ)",
    "definicion": "La confianza y la justicia organizacional mide el grado de seguridad o confianza hacia la empresa o institución con el que los trabajadores/as afrontan sus tareas cotidianas. Esta seguridad se puede expresar de varias maneras, como confianza en los directivos, en los compañeros y compañeras de trabajo, en la solución justa de los conflictos y otras características similares.",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  },
  {
    "codigoIsp": "D11",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "11. Dimensión vulnerabilidad (VU)",
    "definicion": "La vulnerabilidad en el trabajo es la sensación de temor, desprotección o indefensión ante un trato que el(la) trabajador(a) considera injusto por parte de la organización. Se puede entender también como la incapacidad de ejercer derechos o de resistir la disciplina que impone la relación laboral.",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  },
  {
    "codigoIsp": "D12",
    "familia": "Riesgos psicosociales laborales",
    "riesgoEspecifico": "12. Dimensión violencia y acoso (VA)",
    "definicion": "La violencia y el acoso en el trabajo es la exposición a conductas intimidatorias, ofensivas y no deseadas por las personas, que se relacionan con características de quien sufre dicha conducta tales como su apariencia física, género u orientación sexual, origen étnico, nacionalidad, creencias, etc.",
    "categoria": "psicosocial",
    "metodologiaEvaluacion": "evaluacion_especifica",
    "protocoloAplicable": "Protocolo de vigilancia de riesgos psicosociales en el trabajo"
  }
] as const;

export const CATALOGO_RIESGOS_ISP_POR_CODIGO = new Map(
  CATALOGO_RIESGOS_ISP.map((riesgo) => [riesgo.codigoIsp, riesgo]),
);
