# Operación en Vercel + Supabase (1.2.0)

Conservá `DATABASE_URL` y `DATA_SECRET` como secretos en Vercel. Restringí el acceso al proyecto de Supabase a los responsables designados. Para ver las tablas en Studio, seleccioná el esquema `hv`; su contenido personal y clínico está cifrado por la app.

## Copias y recuperación de PostgreSQL

Acordá una política de copias con el operador de la institución. Usá las herramientas de respaldo de Supabase o `pg_dump` para el esquema `hv`, según el plan y los permisos disponibles. La conexión para dump/restauración debe ser la que Supabase indica para sesiones o conexión directa; no se debe usar el pooler de transacciones para esa tarea. Conservá el secreto de cifrado por separado y probá la restauración en un proyecto independiente.

`npm run backup` corresponde a SQLite y rechaza la modalidad PostgreSQL. El CSV de indicadores de la app no sustituye una copia de seguridad de las historias.

No se configuró una copia programada ni se realizó una restauración remota de Supabase. La verificación incluida comprueba persistencia y reconexión sobre PostgreSQL de prueba. Para una base real, el responsable debe cerrar el ensayo de respaldo y recuperación en su alojamiento.

Referencia: https://supabase.com/docs/guides/platform/backups

## Modalidad SQLite local

Las instrucciones originales siguientes se aplican sólo al servidor con archivo SQLite local.

---

# Operación y continuidad

## Antes de cada jornada

Comprobar conectividad, inicio de sesión, escuelas asignadas, cartillas y condiciones físicas. Confirmar quién atiende consultas, cómo se comunican alarmas y cuál es el circuito de derivación. Las cuentas son personales; cerrar sesión al terminar y bloquear los dispositivos compartidos.

Si falla la red, el formulario muestra un error y no informa un guardado exitoso. Los datos escritos permanecen en la pestaña mientras no se recargue ni se cierre. La plataforma no ofrece modo offline ni cola de sincronización. Si se confirma un guardado pero la respuesta se pierde, recargar la ficha antes de reintentar: la versión evita duplicar el mismo evento.

## Respaldo consistente

Con las variables del servidor disponibles:

```bash
npm run backup
```

El comando utiliza la API de backup de SQLite, compatible con WAL, y genera una copia consistente en `backups/`. No copies únicamente el archivo principal de una base que está en uso. La copia conserva el cifrado de campos, pero debe protegerse íntegramente porque incluye cuentas y metadatos.

Definí con la institución frecuencia, retención y ubicación externa. Conservá la `DATA_KEY` original o, si usás el Blueprint nuevo, `DATA_SECRET`, en un lugar seguro separado; sin el secreto original no se puede recuperar el contenido cifrado. No envíes copias por canales personales ni las subas a GitHub. El paquete no configura una tarea periódica ni un proveedor de respaldo.

## Restauración

1. En un entorno separado, detené el servidor destinado a la restauración.
2. Conservá la base anterior y sus archivos asociados; no sobrescribas una instancia que sigue en uso.
3. Colocá la copia consistente en una ruta nueva y vacía. Configurá `DB_PATH` hacia esa copia.
4. Configurá la `DATA_KEY` original (o `DATA_SECRET` si así se creó la base), el modo correcto y una URL propia de ese entorno.
5. Iniciá la app, verificá conteos y algunas fichas con personal autorizado.
6. Antes de reabrir el servicio, eliminá las sesiones restauradas mediante la instrucción del operador `DELETE FROM sessions;` con el servidor detenido y una copia previa. Así todos deben ingresar nuevamente.

La prueba automatizada de persistencia incluida verifica reapertura y lectura de una copia de una base ficticia. No sustituye una prueba de recuperación en el alojamiento elegido.

## Cuentas y autorizaciones

Administración puede crear cuentas, desactivarlas y restablecer contraseñas. Desactivar o restablecer revoca sesiones existentes. Cada usuario puede cambiar su propia contraseña. No se implementa recuperación automática por correo, segundo factor ni validación de matrícula contra un registro externo: esas verificaciones corresponden a la coordinación.

La referencia de autorización se actualiza desde Editar datos escolares. Si se revoca, la ficha conserva sus asientos y se bloquean nuevas cargas clínicas. La institución debe resolver el tratamiento, conservación y ejercicio de derechos que corresponda; el sistema no aplica borrado automático de historias.

## Errores comunes

| Mensaje | Acción |
| --- | --- |
| DATA_KEY no corresponde | Recuperar la clave original. No generar otra sobre esa base. |
| Ficha cambió / 409 | Recargar, revisar el último asiento y repetir sólo si falta el registro. |
| Sin conexión | Conservar la pestaña y reintentar cuando vuelva la red. |
| Origen no permitido | Verificar que APP_ORIGIN coincida exactamente con el dominio HTTPS utilizado. |
| Registro pendiente de habilitación | Completar acuerdos institucionales y configuración. |
| Puerto en uso | Cerrar otra instancia o elegir un puerto libre. |
| Edad fuera del alcance | Organizar evaluación sanitaria con otro protocolo; no forzar el resultado. |

## Criterios pendientes antes del uso asistencial

Asignar responsables; aprobar protocolo y cartillas; definir circuito de alarmas y plazos; capacitar; revisar confidencialidad y datos de menores; verificar autorizaciones; configurar HTTPS, disco, cuentas y copias; realizar piloto con comparación profesional. La revisión de código y los simulacros demuestran comportamiento de software, no exactitud diagnóstica del tamizaje ni cumplimiento normativo completo.
