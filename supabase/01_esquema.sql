-- Salud visual 1.2.0. Ejecutar en SQL Editor del MISMO proyecto Supabase de VinTracker.
-- Crea un esquema separado. No elimina ni reemplaza tablas existentes.
BEGIN;
-- Se verifica la identidad antes de tocar permisos o tablas preexistentes.
DO $guard$
DECLARE known_version TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='hv') THEN
    IF to_regclass('hv.meta') IS NULL THEN
      RAISE EXCEPTION 'El esquema hv ya existe y no se reconoce como Salud Visual. No se modificó: revisá su uso antes de instalar.';
    END IF;
    EXECUTE 'SELECT value FROM hv.meta WHERE key=''schema_version''' INTO known_version;
    IF known_version IS DISTINCT FROM '1' THEN
      RAISE EXCEPTION 'El esquema hv tiene una versión desconocida. No se modificó: revisá la instalación existente.';
    END IF;
  END IF;
END $guard$;
CREATE SCHEMA IF NOT EXISTS hv;
REVOKE ALL ON SCHEMA hv FROM PUBLIC;
CREATE TABLE IF NOT EXISTS hv.meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS hv.users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','teacher','clinician','workshop')),
  schools TEXT NOT NULL, password TEXT NOT NULL, license TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);
CREATE TABLE IF NOT EXISTS hv.schools (id TEXT PRIMARY KEY, name TEXT NOT NULL, cue TEXT NOT NULL UNIQUE, location TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS hv.students (
  id TEXT PRIMARY KEY, "schoolId" TEXT NOT NULL REFERENCES hv.schools(id),
  "documentHash" TEXT UNIQUE, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1 CHECK (version>0)
);
CREATE TABLE IF NOT EXISTS hv.events (
  id TEXT PRIMARY KEY, "studentId" TEXT NOT NULL REFERENCES hv.students(id),
  type TEXT NOT NULL CHECK (type IN ('screen','consult','order','followup')),
  data TEXT NOT NULL, "authorId" TEXT NOT NULL REFERENCES hv.users(id), "createdAt" TEXT NOT NULL,
  rowid BIGSERIAL UNIQUE
);
CREATE INDEX IF NOT EXISTS hv_event_student ON hv.events ("studentId","createdAt");
CREATE TABLE IF NOT EXISTS hv.sessions (
  token TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES hv.users(id), csrf TEXT NOT NULL, expires BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS hv_session_expiry ON hv.sessions (expires);
CREATE TABLE IF NOT EXISTS hv.audit (
  id TEXT PRIMARY KEY, "authorId" TEXT, action TEXT NOT NULL, subject TEXT NOT NULL,
  "createdAt" TEXT NOT NULL, data TEXT NOT NULL, rowid BIGSERIAL UNIQUE
);
CREATE TABLE IF NOT EXISTS hv.login_attempts (key TEXT PRIMARY KEY, n INTEGER NOT NULL, expires BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS hv_attempt_expiry ON hv.login_attempts (expires);
-- Acceso exclusivo del servidor. Sin políticas de acceso público al navegador.
ALTER TABLE hv.meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE hv.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hv.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE hv.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE hv.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hv.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hv.audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE hv.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA hv FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA hv FROM PUBLIC;
DO $$
DECLARE r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA hv FROM %I',r);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA hv FROM %I',r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA hv FROM %I',r);
    END IF;
  END LOOP;
END $$;
INSERT INTO hv.meta (key,value) VALUES ('schema_version','1') ON CONFLICT (key) DO NOTHING;
COMMIT;
