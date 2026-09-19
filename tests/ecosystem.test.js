import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('Supabase compartido: un esquema hv ajeno detiene la instalación antes de alterar objetos',async()=>{
 const db=await PGlite.create();
 try{
  await db.exec("CREATE SCHEMA hv; CREATE TABLE hv.datos_ajenos (id INT); INSERT INTO hv.datos_ajenos VALUES (17); GRANT USAGE ON SCHEMA hv TO PUBLIC;");
  const sql=readFileSync(new URL('../supabase/01_esquema.sql',import.meta.url),'utf8');
  await assert.rejects(db.exec(sql),/no se reconoce como Salud Visual/);
  await db.exec('ROLLBACK');
  assert.equal((await db.query('SELECT id FROM hv.datos_ajenos')).rows[0].id,17);
  assert.equal((await db.query("SELECT to_regclass('hv.users') AS table_name")).rows[0].table_name,null);
  assert.match((await db.query("SELECT nspacl::text AS acl FROM pg_namespace WHERE nspname='hv'")).rows[0].acl,/=U\//);
 }finally{await db.close();}
});

