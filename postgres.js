import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import postgres from 'postgres';
import {createServer} from 'node:net';
import {readFileSync} from 'node:fs';
export async function postgresFixture(){
  const engine=await PGlite.create();
  await engine.exec(readFileSync(new URL('../../supabase/01_esquema.sql',import.meta.url),'utf8'));
  const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const socket=new PGLiteSocketServer({db:engine,port,host:'127.0.0.1'});await socket.start();
  const clients=[];
  function client(){const sql=postgres({host:'127.0.0.1',port,database:'postgres',username:'postgres',password:'test-only',max:1,prepare:false,ssl:false,idle_timeout:1,connect_timeout:5,onnotice:()=>{}});clients.push(sql);return sql;}
  return {engine,client,close:async()=>{await Promise.all(clients.map(sql=>sql.end({timeout:1})));await socket.stop();await engine.close();}};
}
