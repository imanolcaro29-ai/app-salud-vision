# Arquitectura de publicación 1.2.0

En el ecosistema VinTracker se reutiliza el mismo proyecto Supabase y se aloja Salud Visual en `hv`. Compartir proyecto comparte recursos y administración; no constituye aislamiento frente al propietario de la base. La conexión PostgreSQL del servidor puede tener permisos amplios. El código de esta app consulta sólo `hv`, y el instalador sólo cambia objetos de ese esquema. Las cuentas se almacenan en `hv.users` y son independientes de Supabase Auth y las otras apps.

- Navegador: archivos de `public/`, con API del mismo origen y Lupi.
- Vercel: `api/index.js` recibe las rutas `/api/*` por reescritura. El manejador no abre un puerto ni escribe una base temporal.
- Supabase: PostgreSQL, esquema privado `hv`. RLS habilitado y permisos revocados a roles de navegador. Se mantiene la autenticación propia de la app; no se utiliza Supabase Auth.
- Conexión: Postgres.js, una conexión por instancia caliente, consultas parametrizadas, prepared statements desactivados y TLS con validación del certificado. Transacciones con conexión reservada mediante AsyncLocalStorage. No se usa estado de sesión del pooler.
- Persistencia: usuarios, sesiones, registros cifrados, auditoría y límites de ingreso en PostgreSQL. Las sesiones y el límite de intentos sobreviven a instancias nuevas del servidor.
- Los listados se leen en lote para evitar dos viajes a Supabase por cada alumno. Se conserva el filtrado por escuela y rol.
- Inicialización: bloqueo transaccional de PostgreSQL, comprobación de clave y creación única del administrador. No hay contraseñas predeterminadas en producción.
- SQLite: disponible para demo local y servidores permanentes. Las solicitudes se serializan en ese modo para no intercalar transacciones asíncronas.

Los apartados originales siguientes describen los permisos y reglas de la aplicación. Las referencias a almacenamiento SQLite corresponden a la modalidad local; para Vercel rige la arquitectura anterior.

---

# Arquitectura y reglas de negocio

## Componentes

| Componente | Implementación |
| --- | --- |
| Interfaz | HTML, CSS y módulos JavaScript, sin compilación |
| Servidor | Node.js 24 LTS, módulo HTTP nativo |
| Persistencia | SQLite (`node:sqlite`), WAL, claves foráneas y transacciones |
| Cifrado | AES-256-GCM por contenido, IV aleatorio por escritura |
| Contraseñas | scrypt con sal individual; comparación de tiempo constante |
| Sesiones | Token aleatorio de 256 bits; sólo su hash en la base; vencimiento 8 h |
| Solicitudes | Cookie HttpOnly, SameSite=Strict, Secure en producción; origen exacto y token CSRF |
| Auditoría | Alta, modificación de datos escolares, accesos, exportación, registros y cuentas |
| Pruebas | `node:test`, solicitudes HTTP reales y simulación de navegador |

No hay telemetría, bibliotecas desde CDN, fuentes externas, carga de fotos de niños ni uso de cámara. Los datos de la ficha no se guardan en localStorage o IndexedDB. La sesión está en una cookie HttpOnly; las fichas sólo existen en la memoria de la pestaña mientras se usan.

## Modelo

`users` guarda cuentas, roles, matrículas, escuelas asignadas y hash de contraseña. `schools` guarda escuelas y CUE. `students` contiene ID, escuela, hash HMAC del DNI opcional, contenido cifrado y versión de concurrencia. `events` contiene asientos sucesivos de tipo `screen`, `consult`, `order` o `followup`, con autor y sello de tiempo. `sessions` contiene sesiones revocables y `audit` registra actividades y cambios. `meta` identifica modo de base y verifica la clave.

Datos personales y clínicos se cifran en `students.data`, `events.data` y `audit.data`. Los nombres/correos de las cuentas del equipo y metadatos estructurales de operación no están cifrados a nivel de campo. El cifrado del volumen y las políticas del alojamiento completan el resguardo. El cifrado en servidor no protege de un administrador del servidor que ya dispone de la clave: la gestión de accesos institucional sigue siendo necesaria.

Los resultados vigentes se ordenan por **fecha de actividad**, luego por fecha/hora de carga. Registrar un antecedente antiguo no reemplaza un resultado más reciente. Los eventos con igual fecha y hora mantienen el orden de inserción. Las fechas de actividad usan el calendario de Argentina (America/Argentina/Buenos_Aires); los sellos técnicos se conservan en UTC. La versión del alumno se incrementa con cada cambio o nuevo evento; una solicitud con versión obsoleta obtiene 409 y debe recargar.

## Matriz de permisos

| Función | Administración | Docente | Profesional | Taller |
| --- | --- | --- | --- | --- |
| Gestionar cuentas y escuelas | Sí | No | No | No |
| Datos escolares | Todas las escuelas | Sólo asignadas | Todas las escuelas | Sólo nombre, escuela y grado de órdenes |
| Registrar tamizaje | Sí, con capacitación | Sí, con capacitación | Sí | No |
| Diagnóstico y receta | Lectura | Sin acceso | Lectura y registro, con matrícula | Sólo receta de orden vigente |
| Preparar / entregar anteojos | Sí | No | Sí | Sí |
| Registrar seguimiento | Sí | Sólo asignadas | Sí | No |
| Exportar totales por escuela | Sí | No | Sí | No |
| Consultar auditoría | Sí | No | No | No |

La API aplica los permisos independientemente de lo que se muestre en la interfaz. El rol de coordinación tiene lectura clínica amplia: la institución debe asignarlo sólo a personal habilitado para ese acceso. Una cuenta puramente estadística con datos disociados no está implementada en esta versión.

## Lógica de clasificación

La función compartida `classify` aplica el protocolo HV-1.0. Se ejecuta en la interfaz para la revisión y nuevamente en el servidor para el guardado. Se ignora cualquier color enviado por el cliente. Orden de evaluación: signos de alarma; edad/condiciones/completitud; umbral etario, asimetría y observaciones. La agudeza binocular opcional nunca determina la monocular. El control de asimetría utiliza `abs(log10(OD/OI)) >= 0.19`, tolerancia de redondeo para aproximadamente 0,2 logMAR en la escala disponible.

La app no identifica patología ni calcula una prescripción. Se registran resultados de una prueba externa estandarizada. Los plazos de seguimiento y las derivaciones son definidos por el profesional. El listado de consultas ordena por estado, sin afirmar equivalencia entre color y gravedad clínica. Los indicadores reportan alumnos según su último resultado, no cantidad total de pruebas ni prevalencia poblacional.

## Órdenes y asientos clínicos

Una consulta con conducta `anteojos` habilita una orden vinculada a ese asiento. La preparación debe registrarse antes de la entrega. La entrega requiere receptor. No se permite entregar dos veces la misma orden. Una nueva consulta cambia la orden vigente; las órdenes anteriores conservan su historial. Si la nueva conducta es control o derivación, la orden anterior deja de figurar como pendiente vigente.

Los asientos no se editan ni borran desde la interfaz. La aclaración o rectificación se registra mediante una nueva consulta, referenciando en las notas el asiento al que corresponde. Esto es trazabilidad de aplicación, no firma digital legal ni almacenamiento inmutable frente al administrador de infraestructura.

## API

| Ruta | Uso |
| --- | --- |
| `GET /health` | Estado del servidor, sin datos personales |
| `GET /api/config` | Modo, protocolo, apariencia y estado público de habilitación |
| `POST /api/login`, `POST /api/logout` | Sesión |
| `POST /api/demo` | Sólo entorno demo, sin acceso en producción |
| `GET /api/me`, `POST /api/password` | Cuenta actual y cambio de contraseña |
| `GET /api/overview` | Listado adaptado al rol |
| `POST /api/students` | Alta escolar |
| `GET /api/students/:id`, `PUT /api/students/:id` | Lectura / cambio de datos escolares |
| `POST /api/students/:id/events` | Asiento tipado, validado y atribuido |
| `GET /api/export.xlsx` | Libro Excel de indicadores con tres hojas |
| `GET /api/export` | CSV anterior conservado por compatibilidad |
| `GET /api/settings`, `PUT /api/settings` | Configuración, exclusiva de administración, con control de revisión |
| `PUT /api/profile` | Nombre y correo propios, confirmados por contraseña |
| `DELETE /api/users/:id` | Baja lógica de otra cuenta, conserva autoría |
| `GET /api/admin` | Cuentas, escuelas y auditoría |
| `POST /api/schools`, `POST /api/users`, `PATCH /api/users/:id` | Administración |

Las escrituras requieren JSON, `Origin`, `X-HV-Request: 1` y, salvo inicio de sesión, `X-CSRF-Token`. Los eventos requieren `expectedVersion`. Las ediciones escolares requieren `version`. Errores comunes: 400 (datos), 401 (sesión), 403 (permisos/origen), 409 (duplicado o concurrencia), 503 (registro real pendiente de habilitación).

## Límites de despliegue

Una instancia y disco persistente. No es compatible con funciones sin disco permanente o con varias bases independientes detrás de un balanceador. SQLite y la carga de listados completos son adecuados para un piloto acotado; grandes volúmenes requerirían paginación, índices adicionales y evaluación de una base central de mayor escala. La app no incluye sincronización con sistemas ministeriales, interoperabilidad FHIR, prescripción electrónica certificada, notificaciones automáticas ni validación clínica prospectiva.


## Publicación 1.0.1

El módulo clínico canónico se publica en `public/shared/domain.js`. `shared/domain.js` lo reexporta para conservar los imports del servidor y las pruebas. `public/boot.js` maneja la carga dinámica del módulo principal mediante `startup.js`. `server/runtime.js` valida configuración, deriva la clave de `DATA_SECRET` cuando corresponde y crea el primer administrador de forma idempotente. Render ejecuta un proceso Node con disco persistente; no se utiliza almacenamiento temporal de funciones serverless.

## Incorporaciones 1.3

`server/preferences.js` guarda `app_preferences` cifrado en `meta`. El servidor valida los campos permitidos; la interfaz escapa los textos, sin aceptar HTML ni CSS personalizado. Las paletas, el espaciado y los símbolos de marca provienen de opciones cerradas.

Las mutaciones de administración usan transacciones y un bloqueo asesor en PostgreSQL; se revalida que el actor siga activo dentro del bloqueo. Las bajas crean una marca `deleted_user:ID` en `meta`, desactivan la cuenta y revocan sus sesiones. Las referencias de los registros anteriores se conservan.

El tutorial se adapta a las páginas de cada rol; no crea datos clínicos. Sólo guarda en este navegador que se mostró, asociado al ID de la cuenta. Puede repetirse desde Recursos. La lectura en voz alta es opcional y depende de las voces del navegador.

ExcelJS genera el libro en el servidor; sólo exporta agregados autorizados. La cobertura y los totales son fórmulas nativas con resultados iniciales calculados. Las definiciones se incluyen en Guía. No se agregó ninguna tabla ni columna: se reutiliza `meta` y se conserva el esquema `hv`.
