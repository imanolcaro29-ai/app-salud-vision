# Instalación de la versión 1.2.0

La guía vigente de publicación está en [EMPEZAR_AQUI.md](../EMPEZAR_AQUI.md). Explica Supabase SQL Editor, el configurador local, GitHub y Vercel, con los seis campos de configuración.

## Demostración local

Instalá Node.js 24, extraé el ZIP y ejecutá `npm ci`, seguido de `npm run demo`. Abrí http://localhost:3000. Los alumnos son ficticios y la base es independiente de Supabase.

## Servidor local con Supabase

Definí `DATABASE_URL`, `DATA_SECRET`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` en un archivo `.env` privado. Configurá `APP_ORIGIN=http://localhost:3000` y `NODE_ENV=development`. Ejecutá `npm ci` y `npm start`. El esquema SQL debe haberse aplicado antes. Las mismas cuentas y registros se conservan en esa base de Supabase.

## Instalación institucional con SQLite

Si elegís un servidor Node permanente con disco persistente, dejá `DATABASE_URL` sin definir. Ejecutá `npm run setup` para crear `.env`, la clave y el administrador; después, `npm start`. Para producción, configurá origen HTTPS, host 0.0.0.0 y una ruta de base en disco persistente. Esta alternativa no es la que utiliza Vercel.

## Dependencias y verificación

`npm ci` usa `package-lock.json`. El cliente de PostgreSQL es `postgres`; PGlite y su adaptador de socket son exclusivamente dependencias de desarrollo para pruebas. `npm run check` revisa sintaxis y archivos de publicación. `npm test` ejecuta las pruebas SQLite y PostgreSQL.

## Actualizar

Conservá la misma base y el mismo secreto. Las actualizaciones del código no deben regenerar DATA_SECRET. Un cambio de contraseña del administrador se hace desde la aplicación y no restableciendo variables de instalación.
