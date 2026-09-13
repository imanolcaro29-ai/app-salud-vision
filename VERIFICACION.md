# Corrección 1.2.1 — configurador independiente

Se integró la lógica en ABRIR_CONFIGURADOR.html para que no dependa de scripts/config-values.js al abrirse como archivo local. Se ejecutaron las cuatro pruebas del configurador: codificación de contraseña, conservación del secreto, validación de entradas y ejecución de todos los scripts del HTML con envío del formulario en un DOM simulado. La última comprueba la generación de los seis valores y la conservación del secreto tras un segundo envío. Las cuatro aprobaron. También pasó la revisión sintáctica de los 30 archivos JavaScript y scripts del HTML. No se efectuó una nueva prueba visual en un navegador Windows.

La suite completa de 74 pruebas de la versión 1.2.0 se conserva como antecedente debajo.

---

# Verificación 1.2.0 — ecosistema VinTracker

**74 pruebas aprobadas; 0 fallidas, canceladas u omitidas.** Sintaxis válida en 30 archivos JavaScript y el configurador HTML. Ejecutado el 13 de septiembre de 2026 con Node 24.19.0.

Se repitió la suite completa SQLite/PostgreSQL. Se amplió el ensayo de base compartida con tablas ficticias en `public`, `vintracker`, `vintracker_aventura`, `auth` y `storage`: se conservaron los registros, la política de lectura y el acceso de `authenticated` a VinTracker; ese rol no pudo leer `hv.users`. También se probó que una colisión con un esquema `hv` ajeno detenga la instalación y conserve objetos y permisos existentes.

El menú de aplicaciones tiene recursos locales y enlaces sin datos de sesión, con protección de referencia y apertura de los destinos externos en otra pestaña. Se comprobó que sus dos puntos de acceso estén presentes en el código de la interfaz. No se modificaron ni probaron las aplicaciones reales de VinTracker o Aventura; sus códigos no se incluyeron en este trabajo. No se realizaron nuevos ensayos visuales de navegador para esta actualización.

La publicación y conexión en las cuentas del usuario siguen pendientes. Las simulaciones PostgreSQL utilizan PGlite y el cliente Postgres.js real; no certifican la configuración remota, la carga de producción ni el aislamiento frente al administrador de la base compartida. Ver los pasos de comprobación de EMPEZAR_AQUI.md.

---

# Verificación 1.1.0 — Vercel y Supabase

**Resultado: 72 pruebas aprobadas, 0 fallidas, 0 omitidas.** Se revisó la sintaxis de 29 archivos JavaScript y del configurador HTML.

## Qué se ejecutó

- Se conservaron y repitieron las 52 pruebas previas de lógica, seguridad, persistencia local y arranque.
- Se agregaron 17 pruebas PostgreSQL/Vercel y 3 del configurador local.
- El motor de prueba fue **PostgreSQL embebido mediante PGlite**, con un servidor TCP de PGlite Socket. La aplicación se conectó usando el cliente **Postgres.js real**, sin sustituir las consultas SQL por respuestas inventadas.
- Se aplicó el mismo `supabase/01_esquema.sql` incluido en el paquete y se volvió a ejecutar para comprobar que conserve registros y otras tablas.
- Se ensayaron login, roles, escuelas, DNI duplicado, autorización, CSRF, origen y JSON inválido; tamizaje, consulta, receta, preparación, entrega y seguimiento; rollback, ediciones y eventos simultáneos; cifrado, auditoría y exportación.
- Se comprobó que otra instancia de la aplicación conserve la sesión y el límite de ingreso. También se cerró el cliente PostgreSQL y se abrió otro conservando usuarios, sesiones y registros, rechazando una clave de cifrado equivocada.
- Se ejecutó el manejador de Vercel mediante HTTP local, incluyendo la reescritura de rutas, cuerpo JSON ya procesado y respuesta 503 controlada por falta de configuración.
- Se verificaron TLS obligatorio con validación del certificado, pool de una conexión y prepared statements desactivados en la configuración de producción. El socket de prueba usa sólo loopback, sin TLS.
- El configurador comprueba URL del pooler, codificación de símbolos de la contraseña y conservación de DATA_SECRET al actualizar. Su código y el script dentro del HTML pasan la revisión sintáctica.

## Límites

No se conectó a la cuenta del usuario ni a una base remota de Supabase, y no se publicó un deployment en Vercel. Por eso **la autenticación y el certificado reales de Supabase, el dominio y el enrutamiento alojado se comprueban después de configurar las cuentas**. PGlite es PostgreSQL de prueba con un solo motor y no reemplaza una prueba de carga sobre múltiples servidores. No se realizó una auditoría clínica o de seguridad independiente.

Las revisiones visuales y el simulacro de navegador de la entrega 1.0 se conservan abajo como antecedentes. La revisión nueva es automatizada; no se presenta como un nuevo simulacro visual alojado en Vercel.

## Repetir

```bash
npm ci
npm run check
npm test
```

Las dependencias de prueba no se usan en la función de producción. El archivo `tests/browser.mjs` sigue siendo una comprobación opcional de interfaz y requiere Playwright instalado por separado.

---

# Historial de verificaciones anteriores

# Actualización 1.0.1 — publicación y arranque

- **52 pruebas automáticas aprobadas**, 0 fallidas, 0 omitidas; **21 archivos JavaScript** con sintaxis válida.
- Se repitieron las 44 pruebas de la versión 1.0 y se agregaron 8 verificaciones para la publicación.
- Todos los módulos del navegador, incluido `/shared/domain.js`, se encuentran dentro de `public/` y responden con el tipo JavaScript correcto.
- Se simularon módulo faltante, inicialización fallida, espera agotada y arranque exitoso. El indicador de carga tiene manejo de errores.
- Se verificó detección de URL de Render, secreto estable, configuración inválida, creación atómica del administrador e imposibilidad de restablecer su contraseña por reinicio.
- Simulacro HTTP en configuración de producción: crear administrador, iniciar sesión con cookie Secure, agregar escuela, cerrar, abrir la misma base e ingresar de nuevo conservando los registros.
- También se ejecutó `node server/index.js` como proceso independiente dos veces con variables equivalentes a Render. Respondieron salud y módulos, y el login funcionó tras reiniciar. Se comprobó que los logs no contuvieran la contraseña ni el secreto.
- No se contrató ni publicó un servicio en Render ni se realizó validación clínica. Las comprobaciones nuevas son automatizadas y locales; la revisión visual de la versión 1.0 se conserva a continuación.

---

# Informe de verificación de la versión 1.0

**Cierre de comprobaciones: 13 de septiembre de 2026.**

## Resultado

- **44 pruebas automáticas aprobadas, 0 fallidas, 0 omitidas.**
- **16 archivos JavaScript** revisados con el comprobador de sintaxis de Node.
- Ejecución en **Node.js 24.19.0**.
- Simulacro de interfaz completado en Chrome con datos ficticios.
- Revisión responsive a anchos de marco de **390 y 320 píxeles**; el contenido disponible, descontando barras del navegador, fue 375 y 305 píxeles. No se observó desbordamiento horizontal de la página.
- PDF de la propuesta: **8 páginas A4**, renderizadas y revisadas.

Las comprobaciones corresponden al código y al entorno de prueba. No son una garantía de ausencia absoluta de errores en cualquier dispositivo o alojamiento.

## Pruebas automatizadas ejecutadas

| Área | Comprobación |
| --- | --- |
| Identidad | Sesión obligatoria, cookie HttpOnly, contraseñas con scrypt y revocación de acceso |
| Roles | Docente limitado a escuelas asignadas; diagnóstico y receta sólo registrables por profesional; datos mínimos para taller |
| Solicitudes | Rechazo de origen ajeno, ausencia de CSRF, JSON inválido y solicitudes no autorizadas |
| Registro escolar | Formatos, DNI duplicado, autorización y referencias documentales |
| Concurrencia | Dos ediciones simultáneas no se sobreescriben; reenvío de un evento no lo duplica |
| Tamizaje | Umbrales por edad, cumpleaños, asimetría, observaciones, alarma y prueba no evaluable |
| Separación clínica | Resultado binocular no sustituye monoculares; semáforo manipulado por cliente no altera el cálculo del servidor |
| Fechas | Fechas inválidas/futuras; calendario argentino al cambiar de día en UTC; registro retrospectivo no sustituye el último resultado |
| Receta | Rangos numéricos, fecha de seguimiento y restricciones del rol |
| Anteojos | Preparación antes de entrega, receptor, una entrega por orden y vínculo con la receta vigente |
| Recorrido | Alta → tamizaje → consulta → receta → preparación → entrega → seguimiento |
| Persistencia | Reapertura y restauración de copia consistente de SQLite conservan datos cifrados y cuentas |
| Separación de entornos | Base demo no reutilizable como real; acceso demo ausente en modo real; registro bloqueado antes de habilitación |
| Exportación | Totales por escuela sin nombres/DNI y protección contra fórmulas CSV |
| Imagen | Firma PNG, integridad de fragmentos, final de archivo y descompresión de todos los píxeles de Lupi |

## Simulacro de interfaz completado

Se utilizó la ficha **Sol Simulacro**, con adulto y contacto ficticios, dentro de la base de vista previa. Esa base no se incluye en el ZIP.

1. Alta del alumno, autorización y referencia. Búsqueda por nombre y apertura de ficha.
2. Tamizaje guiado: cartilla Sloan, distancia registrada, condiciones confirmadas, OD 20/50 y OI 20/20. Resultado explicado como “Requiere evaluación”.
3. Cambio al perfil profesional, consulta ficticia y receta: OD esfera -1, cilindro -0,5, eje 90°; OI 0/0/0°.
4. Aparición de la orden en la cola de anteojos.
5. Perfil taller: preparación del armazón ficticio, posterior entrega y adulto receptor. Estado final: entregado.
6. Perfil docente: registro de seguimiento de uso. Fecha visible en el listado.
7. Móvil: menú, listado de alumnos, apertura de formulario, ayuda de Lupi y respuesta interactiva a una dirección.

Se revisó el diseño de escritorio y el de móvil. El formulario móvil comprobado tuvo 320 píxeles de ancho de contenido y 320 de desplazamiento interno, sin exceso horizontal. No se observaron errores de JavaScript atribuibles a la aplicación en la consulta de consola realizada; la herramienta del navegador generó avisos propios de su extensión, ajenos al código del proyecto.

## Correcciones realizadas durante la revisión

- La fecha clínica usa Argentina para no adelantar el día después de las 21:00 locales.
- Los registros antiguos se ordenan por fecha de actividad, conservando el resultado vigente.
- El DNI de tipo numérico o con formato inválido se rechaza con un mensaje controlado.
- JSON nulo o en forma de lista no provoca un fallo interno.
- Se repuso una copia incompleta de la mascota y se agregó una prueba de integridad PNG.
- La portada móvil da más espacio al texto; Lupi conserva su botón de ayuda interactiva.
- El acceso “Ir al contenido” mantiene la pantalla actual.

## Repetir comprobaciones

Sin instalar dependencias:

```bash
npm run check
npm test
```

GitHub Actions ejecuta ambas comprobaciones en cada push y pull request cuando el flujo incluido está presente y habilitado en el repositorio.

### Prueba adicional de navegador en tu computadora

El archivo `tests/browser.mjs` permite repetir un recorrido breve con Playwright. Es opcional y no se ejecuta con `npm test`. Se incluye como herramienta de reproducción; el simulacro de interfaz informado arriba se realizó mediante control de Chrome, no ejecutando ese archivo.

```bash
npm install --no-save playwright
npx playwright install chromium
npm run test:e2e
```

El script levanta una base ficticia en memoria, comprueba alta, tamizaje, escritorio, móvil y actividad de Lupi, y deja capturas en `test-results/`. No utiliza una base institucional. La descarga del navegador requiere acceso a sus servidores; si la red la bloquea, el comando no puede completar esa prueba.

## Límites de esta verificación

No se contrató ni desplegó un servidor externo, no se probó el contenedor en Render, no se evaluó en dispositivos físicos iOS/Android ni se hicieron pruebas de carga masiva. No se realizó validación clínica prospectiva ni auditoría legal o certificación de seguridad. La institución debe cerrar esas verificaciones según el uso previsto. Para un piloto real siguen siendo necesarios dirección sanitaria, protocolo aprobado, autorizaciones, alojamiento con HTTPS, cuentas, copias y ensayos de recuperación.
