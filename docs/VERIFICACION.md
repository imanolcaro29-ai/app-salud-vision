# Verificación de Salud Visión 1.3.0

**Completada el 19/09/2026. Resultado: 89 pruebas aprobadas, 0 fallidas y 0 omitidas.** `npm run check` revisó la sintaxis de 36 archivos JavaScript y el configurador HTML, además de los recursos de publicación.

## Qué se comprobó

- Autenticación, revocación de sesiones, origen, CSRF y permisos de los cuatro perfiles.
- Separación por escuelas, ocultamiento de datos según rol y rechazo de escrituras no autorizadas.
- Autorización individual, clasificación por el servidor, fechas, concurrencia y recorrido de tamizaje, consulta, receta, preparación, entrega y seguimiento.
- Habilitación del registro por administración, confirmaciones obligatorias y configuración guardada.
- Edición de apariencia con validación, cifrado y rechazo de conflictos de revisión.
- Cambio de nombre y correo, comprobación de contraseña, correo duplicado y revocación de sesiones anteriores.
- Eliminación de cuentas, conservación de auditoría, impedimento de autoeliminación y administración concurrente sin dejar la app sin administrador activo.
- Exportación XLSX autorizada: tres hojas, totales, cobertura, fórmulas, formatos, filtros y casos sin escuelas o sin alumnos. Un nombre que comienza con `=` permanece como texto.
- Persistencia SQLite y PostgreSQL, reconexión, compatibilidad de la API con Vercel y recursos sin 404.
- Esquema `hv` separado de tablas ajenas simuladas, reaplicación del SQL y rechazo de colisiones con un esquema ajeno.

Las pruebas PostgreSQL utilizan **Postgres.js y PGlite mediante protocolo PostgreSQL**, no la base real del usuario. SQLite usa bases temporales y registros ficticios.

## Simulacros de navegador

Se ejecutaron los dos recorridos Playwright incluidos, con Chromium sin interfaz gráfica:

1. `tests/browser.mjs`: alta de alumno ficticio, autorización, tamizaje, revisión de escritorio, móvil y práctica de Lupi.
2. `tests/browser-improvements.mjs`: ingreso real en una base de prueba; tutorial completo con avance, retroceso y ejercicio; habilitación del registro; configuración visual y persistencia al recargar; cambio de nombre y correo; creación y eliminación de una cuenta administrativa; descarga Excel; lectura de recursos; vistas móviles; cierre de sesión y reingreso con el correo actualizado.

Se revisaron capturas a **1366 × 768** y **390 × 844**, además del recorrido inicial a 1366 × 900. No se detectaron errores JavaScript de la app en esos recorridos. La captura inmediata al cambiar de ancho tomaba el menú durante su transición; el simulacro final espera a que la transición termine antes de comprobar la vista.

Se revisaron visualmente las tres hojas del Excel generado con datos ficticios: 95 registrados, 69 evaluados y cobertura 72,6 %. El libro incluye un ejemplo en `docs/Indicadores_Ejemplo.xlsx`.

## Repetir las pruebas

Con Node 24:

```bash
npm ci
npm run check
npm test
```

Para repetir los recorridos de navegador:

```bash
npm install --no-save playwright
npx playwright install chromium
npm run test:e2e
node tests/browser-improvements.mjs
```

Las pruebas de navegador son opcionales y requieren descargar Chromium. Admiten `CHROMIUM_PATH` y `CHROMIUM_ARGS` para un Chromium de prueba ya disponible. Las capturas se guardan en `test-results/`. Las credenciales de estas pruebas son ficticias y no se habilitan en producción.

## Alcance

La entrega incluye código y paquete verificables. No se publicó esta versión en la cuenta de Vercel del usuario ni se ingresó a su Supabase. Falta comprobar ese despliegue después de actualizar GitHub. No se hicieron pruebas en teléfonos físicos, de carga masiva, una restauración remota de Supabase ni una validación clínica prospectiva.
