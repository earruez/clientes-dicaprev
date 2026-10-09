# Revisión móvil de NextPrev — 9 de octubre de 2026

## Alcance y evidencia

Revisión del código de rutas, tablas, modales, paneles laterales y componentes compartidos. Se inspeccionaron los patrones de ancho fijo, columnas no adaptables, alturas de viewport, overflow y gestos táctiles. Los contenedores de tablas de la aplicación ya permiten desplazamiento horizontal; las tablas del HTML generado para informes no se modificaron.

La visita a `https://app.nextprev.cl` redirigió a `/login`. No hay una sesión autenticada en el navegador de revisión. Esta revisión de código y las validaciones de CI no equivalen a una prueba visual completa en dispositivos.

## Correcciones

- Diálogo compartido: margen lateral también en tablet, menor padding en teléfonos, hijos que pueden encogerse, cierre táctil de 44 px y pie de acciones que admite varias filas.
- Hallazgos manuales/IA y navegación móvil: distribución flex explícita del contenedor con cabecera, cuerpo desplazable y pie. Se conserva el bloqueo del cierre accidental de hallazgos y la selección separada de cámara/galería.
- Vehículos: formularios de alta, edición y mantención en una columna en teléfonos; encabezado adaptable; el panel cerrado deja de renderizar controles fuera de pantalla.
- Trabajadores: paneles de ficha, formulario, carga individual y masiva no renderizan controles cuando están cerrados; pasos del alta pueden pasar a varias filas.
- Selectores: límite de ancho/alto del desplegable, textos largos adaptables, flecha que no se comprime y capa por encima de los paneles documentales.
- Pestañas: desplazamiento horizontal y controles táctiles; barras que admiten varias filas sin altura fija.
- Notificaciones: ancho limitado al teléfono, altura limitada al viewport y lista desplazable con cabecera/pie accesibles.
- Encabezados compartidos: texto y acciones se adaptan al ancho disponible. Formularios nativos: ancho acotado y tamaño de fuente móvil que evita zoom involuntario al escribir.
- Permisos, acreditaciones y confirmaciones de administración: campos/pasos adaptables y scroll en confirmaciones largas.
- Se retira la restricción `touch-action: pan-y` de los contenedores de página y paneles para conservar los gestos nativos, incluido el zoom y los desplazamientos de contenido anidado. Se conservan overflow y overscroll existentes.

No se alteran reglas de negocio, permisos, base de datos, generación documental, envíos ni dependencias.

## Verificación pendiente con sesión

Comprobar en 320, 375, 390 y 768 px, además de orientación horizontal:

1. Menú y campanita; navegar hasta la última opción y cerrar.
2. Hallazgo manual y con foto: cámara/galería, análisis, resultado, edición y cierre. Usar datos de prueba para cualquier alta.
3. Vehículo: alta/edición, pestañas del detalle, documentos y mantenciones; alcanzar botones inferiores con teclado abierto.
4. Trabajadores: ficha, alta/edición, carga documental individual/masiva e historial; cerrar y volver a abrir.
5. Documentación, permisos, capacitaciones, acreditaciones y DS44/MIPER: filtros, selectores largos, tablas, pestañas y modales.
6. Confirmaciones del administrador sin ejecutar eliminaciones; firma e inducción públicas solo con enlaces de prueba autorizados.

CI valida lint, tipos, tests existentes y build. Las pruebas físicas en Safari/iOS y Chrome/Android siguen siendo necesarias para afirmar compatibilidad completa, particularmente teclado, cámara y selección de archivos.
