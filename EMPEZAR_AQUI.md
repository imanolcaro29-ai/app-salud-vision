# App Salud Visión + VinTracker — instalación 1.2.0

Este ZIP contiene **App Salud Visión / Haciendo la Vista Gorda**, preparada para usar GitHub, Vercel y **el mismo proyecto de Supabase que VinTracker y VinTracker Aventura**. Conserva la paleta y Lupi, añade el menú «Aplicaciones VinTracker» y usa PostgreSQL para guardar registros.

## Qué se comparte

| Programa | Cómo queda |
| --- | --- |
| Supabase | El proyecto que ya usás. Salud Visión guarda sus tablas en el esquema `hv`. |
| Vercel | Tu equipo VinTracker, con un proyecto web `app-salud-vision` y dominio propios. |
| GitHub | Tu cuenta habitual. Podés usar un repositorio propio o una carpeta dentro del repositorio común: pasos debajo. |
| Aplicaciones | Salud Visión incluye un menú para abrir VinTracker y VinTracker Aventura. Cada una conserva sus usuarios y su sesión. |

**Compartir Supabase no unifica los inicios de sesión ni sincroniza pacientes.** No se dispone del código de VinTracker y Aventura para modificar esas funciones o sus menús. Este paquete contiene sólo Salud Visión; permite incorporarla a la infraestructura existente. Un único proyecto Vercel que sirva las tres aplicaciones requeriría integrar también sus códigos y rutas.

## 1. En tu computadora

Descargá el ZIP actualizado y elegí **Extraer todo**. Abrí la carpeta que contiene `package.json`, `vercel.json`, `ABRIR_CONFIGURADOR.html`, `public`, `api`, `server`, `scripts`, `shared`, `supabase`, `tests` y `docs`. Conservá todas las carpetas.

## 2. En Supabase: usar el proyecto actual

1. Entrá a [Supabase](https://supabase.com/dashboard) y abrí **el proyecto que usa VinTracker**. No hace falta crear otro.
2. Abrí **SQL Editor → New query**.
3. En tu computadora, abrí `supabase/01_esquema.sql` con Bloc de notas y copiá todo.
4. Pegalo en SQL Editor y presioná **Run**.
5. **Success. No rows returned** significa que terminó correctamente. En **Table Editor**, cambiá el selector de esquema de `public` a **hv**: verás `users`, `schools`, `students`, `events`, `sessions`, `audit`, `meta` y `login_attempts`.
6. Presioná **Connect → Transaction pooler** y copiá la conexión `postgresql://…` del puerto **6543**. Puede contener `[YOUR-PASSWORD]`.

El SQL sólo crea o configura `hv`. No altera las tablas, políticas ni usuarios de `public`, `auth`, `storage` u otros esquemas. Si ya existe un esquema `hv` que no pertenece a esta app, el script se detiene antes de modificarlo. No borres ese esquema para forzar la instalación.

No cambies la contraseña actual de la base para estos pasos: las otras apps podrían depender de ella. Usá la contraseña que ya tenés. Si no la conocés, revisá su registro protegido o la conexión del servidor existente sin publicarla. Un restablecimiento requiere actualizar todos los servicios que usen esa contraseña.

No agregues `hv` a «Exposed schemas». Esta app usa una conexión del servidor a PostgreSQL; no necesita claves `anon`, `publishable` ni `service_role`. Sus cuentas se crean dentro de Salud Visión, no en Supabase Authentication. Los recursos, las copias y la administración de Supabase son compartidos; el dueño de la base conserva acceso administrativo a los esquemas.

## 3. En tu computadora: preparar las seis variables

1. Hacé doble clic en **ABRIR_CONFIGURADOR.html**, dentro de la carpeta extraída completa.
2. Pegá la conexión del pooler de ese mismo proyecto Supabase.
3. Escribí la contraseña actual de la base en el campo correspondiente.
4. Elegí tu nombre, correo y una contraseña propia de 12 a 128 caracteres para ingresar a **Salud Visión**.
5. Presioná **Preparar valores** y dejá la página abierta para copiar los resultados.

El configurador funciona en tu computadora, codifica los símbolos de la contraseña y genera `DATA_SECRET`. No envía ni guarda los valores. Guardá el secreto en tu gestor de contraseñas: se necesita para leer los registros cifrados. **Si Salud Visión ya tenía datos en `hv`, desplegá «Ya configuré esta base anteriormente» y cargá su DATA_SECRET original.** No uses el secreto de VinTracker para una instalación nueva de Salud Visión.

## 4. En GitHub: cargar el código

### Si las otras apps tienen repositorios separados

1. En tu cuenta habitual, creá el repositorio **app-salud-vision**.
2. Elegí **Add file → Upload files**.
3. Arrastrá **el contenido de la carpeta extraída**, con sus subcarpetas, y confirmá **Commit changes**. No subas el ZIP cerrado.
4. Comprobá: `package.json` y `vercel.json` en la raíz; `api/index.js`, `public/shared/domain.js` y `supabase/01_esquema.sql` dentro de sus carpetas.

### Si querés usar el mismo repositorio de VinTracker

1. Dentro de tu copia local de ese repositorio, creá una carpeta **app-salud-vision** y copiá allí el contenido del ZIP. Esa carpeta debe contener su propio `package.json`, `api`, `public`, etc.
2. Subí esa carpeta al repositorio común mediante **Add file → Upload files**, o con tu cliente Git. No reemplaces los archivos de VinTracker que están en la raíz.
3. En Vercel, importá ese repositorio común para el nuevo proyecto y elegí **Root Directory: `app-salud-vision`**.
4. Conservá las configuraciones de los proyectos existentes. Este paquete no cambia los scripts ni las dependencias raíz de tu repositorio. Si ya tiene workspaces o reglas de CI particulares, hay que revisarlas con su código antes de confirmar una integración completa del repositorio.

Las credenciales se cargan en Vercel; no subas `.env`, `data`, bases ni contraseñas. Si ya hay un repositorio `app-salud-visual` en uso, podés actualizarlo con Git o crear `app-salud-vision` para instalar la versión completa sin arrastrar archivos antiguos. El nombre de la app visible sigue siendo Haciendo la Vista Gorda.

## 5. En Vercel: agregarla al equipo VinTracker

1. Entrá a [Vercel](https://vercel.com/dashboard). En el selector superior elegí **el mismo equipo donde ves VinTracker y VinTracker Aventura**.
2. Elegí **Add New → Project** e importá el repositorio del paso 4.
3. **Project Name:** `app-salud-vision` (si ya existe, entrá a ese proyecto y revisá Settings).
4. Aplicá esta configuración:

| Campo | Valor |
| --- | --- |
| Framework Preset | `Other` |
| Root Directory — repositorio propio | raíz, vacío o `./` |
| Root Directory — repositorio común | `app-salud-vision` |
| Install Command | `npm ci` |
| Build Command | `npm run check` |
| Output Directory | `public` |
| Node.js | `24.x` |

**Root Directory nunca es `public`**. `public` es sólo Output Directory. El `vercel.json` incluido define instalación, comprobación, salida, rutas y función del servidor.

5. En **Environment Variables**, copiá las seis variables del configurador al entorno **Production**, sólo en el proyecto Salud Visión:

| Nombre | Qué copiar |
| --- | --- |
| `DATABASE_URL` | La conexión preparada, al mismo Supabase de VinTracker |
| `DATA_SECRET` | Secreto propio de Salud Visión |
| `BOOTSTRAP_ADMIN_NAME` | Tu nombre |
| `BOOTSTRAP_ADMIN_EMAIL` | Tu correo de acceso a Salud Visión |
| `BOOTSTRAP_ADMIN_PASSWORD` | Tu contraseña de acceso a Salud Visión |
| `CLINICAL_ENABLED` | `false` inicialmente |

6. Presioná **Deploy**. Si ya habías desplegado, guardá las variables en **Settings → Environment Variables** y hacé **Deployments → Redeploy**.
7. Abrí el dominio **Production** que te muestre Vercel. La URL exacta depende del nombre disponible. No uses una Preview para comprobar variables que cargaste sólo en Production.
8. Ingresá con el correo y contraseña elegidos. El primer administrador se crea automáticamente en `hv.users`. No se cambia la cuenta de VinTracker.

Los cambios de variables requieren un nuevo despliegue. Si usás un dominio personalizado o aparece «Origen no permitido», configurá `APP_ORIGIN` con la URL exacta, por ejemplo `https://app-salud-vision.vercel.app`, sin barra final, y hacé Redeploy.

## 6. Navegar entre las apps

En Salud Visión aparece **Aplicaciones VinTracker**, tanto en el ingreso como en el menú lateral. Abre `/ecosistema.html`, con tres accesos:

- Salud Visión: vuelve a esta misma app.
- VinTracker: `https://vintracker.vercel.app/`.
- VinTracker Aventura: `https://vintracker-aventura.vercel.app/`.

Las dos direcciones externas provienen del trabajo previo; verificá que sean tus dominios actuales. Si cambiaron, editá sus enlaces en `public/ecosistema.html` y subí el cambio. Los enlaces abren otra pestaña sin pasar fichas ni credenciales.

Para volver desde VinTracker o Aventura, usá sus pestañas. Agregar dentro de ellas un botón hacia Salud Visión requiere editar sus propios menús. El enlace a incorporar será el dominio Production de Salud Visión seguido de `/ecosistema.html`; no se modificó el código de esas dos aplicaciones en esta entrega.

## 7. Comprobación después de publicar

1. Abrí `https://TU-DOMINIO/api/health`: debe devolver `{"ok":true,"version":"1.2.0"}`. Comprueba también conexión con la base.
2. Abrí `https://TU-DOMINIO/shared/domain.js`: debe mostrar JavaScript, sin 404.
3. Ingresá, creá una escuela ficticia y cerrá la sesión. Volvé a ingresar y comprobá que siga allí.
4. Abrí **Aplicaciones VinTracker** y verificá cada destino.
5. Abrí VinTracker y Aventura y comprobá sus ingresos habituales. El instalador se probó con tablas ajenas simuladas; esta comprobación verifica tus aplicaciones reales.
6. Creá las escuelas y cuentas del equipo desde Administración. Docentes: escuela asignada. Profesionales: matrícula.

`CLINICAL_ENABLED=false` bloquea la carga de alumnos y registros clínicos hasta la habilitación institucional. Cuando corresponda, cambiala a `true` en este proyecto Vercel y hacé Redeploy. Para simular todo el circuito sin datos reales, instalá Node 24 y ejecutá `npm ci` y `npm run demo` en tu computadora: usa una base ficticia separada.

Tras confirmar el acceso podés retirar `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` de Vercel y hacer Redeploy. El administrador existente se conserva; los reinicios no restablecen su contraseña. Mantené `DATABASE_URL` y el secreto original.

## Solución de errores

| Mensaje | Acción |
| --- | --- |
| 404 `/shared/domain.js` | Comprobar `public/shared/domain.js`, carpetas completas y Root Directory correcto. |
| 404 `/api/config` | Comprobar `api/index.js` y `vercel.json` en la raíz elegida, y Framework Other. |
| Configuración pendiente / 503 | Ejecutar el SQL, cargar variables Production y hacer Redeploy. |
| `28P01` en Logs | Revisar usuario y contraseña actuales del pooler; preparar DATABASE_URL de nuevo. |
| `42P01` en Logs | El esquema no está en la base a la que conecta DATABASE_URL. Revisar proyecto y SQL. |
| Esquema `hv` desconocido | El instalador detectó una colisión. Conservarlo y revisar a qué aplicación pertenece. |
| Clave no corresponde a esta base | Recuperar el DATA_SECRET original de Salud Visión; no borrar registros. |
| Certificado TLS rechazado | Revisar host desde Connect. Si requiere certificado CA, poner el PEM oficial en `DATABASE_CA`; no desactivar validación. |
| Origen no permitido | Abrir Production o configurar APP_ORIGIN y volver a desplegar. |
| Registro pendiente de habilitación | Ver paso 7; no es un error de conexión. |

No se migran automáticamente registros SQLite anteriores, ni se conectan las cuentas de las otras apps. No se publicaron cambios en tus cuentas desde esta entrega. Los costos y límites son los de tus planes y el consumo conjunto.

Fuentes: [Supabase: conexión PostgreSQL y pooler](https://supabase.com/docs/guides/database/connecting-to-postgres), [Vercel: varios proyectos desde un mismo repositorio](https://vercel.com/docs/monorepos).
