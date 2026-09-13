import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createPostgresStore,postgresQuery,postgresOptions} from '../server/postgres-store.js';
import {createApp} from '../server/app.js';
import {bootstrapPostgresAdmin,runtimeConfig} from '../server/runtime.js';
import {cloudHandler} from '../server/cloud.js';
import {today} from '../shared/domain.js';
import {postgresFixture} from './helpers/postgres.js';
let fixture,store,app,base,schoolA,schoolB;
const key=randomBytes(32).toString('hex'),password=randomBytes(24).toString('hex'),sessions={};
const origin='https://salud-prueba.vercel.app';
const env={BOOTSTRAP_ADMIN_NAME:'Coordinación ficticia',BOOTSTRAP_ADMIN_EMAIL:'admin@example.test',BOOTSTRAP_ADMIN_PASSWORD:password};
async function request(path,{method='GET',body,role='admin',headers={},anonymous=false}={}){
 const h={Origin:origin,'X-HV-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{}),...(!anonymous&&sessions[role]?sessions[role]:{}),...headers};
 const r=await fetch(base+'/api'+path,{method,headers:h,body:body!==undefined?JSON.stringify(body):undefined});
 let data;try{data=await r.json();}catch{}
 return {status:r.status,data,headers:r.headers};
}
async function login(role='admin'){
 const r=await request('/login',{method:'POST',anonymous:true,body:{email:role+'@example.test',password}});assert.equal(r.status,200,JSON.stringify(r.data));
 sessions[role]={Cookie:r.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':r.data.csrf};return r;
}
const pupil=(extra={})=>({name:'Alumno de Prueba PG',dob:'2017-02-20',document:'',schoolId:schoolA,grade:'4 A',guardian:'Adulto ficticio',contact:'Contacto ficticio',consent:true,consentDate:today(),consentRef:'AUT-PG-01',...extra});
async function student(extra={}){const r=await request('/students',{method:'POST',body:pupil(extra)});assert.equal(r.status,201,JSON.stringify(r.data));return r.data.id;}
async function event(id,type,data,role='admin',version){const v=version??(await request('/students/'+id)).data.student.version;return request('/students/'+id+'/events',{method:'POST',role,body:{type,data,expectedVersion:v}});}
const screen=()=>({date:today(),od:50,oi:20,binocular:null,unable:false,conditions:true,distance:3,chart:'Sloan',correction:'no usa anteojos',symptoms:[],alerts:[],notes:'Simulación PostgreSQL'});
before(async()=>{
 fixture=await postgresFixture();store=await createPostgresStore({key,client:fixture.client()});await bootstrapPostgresAdmin(store,env);
 app=createApp({store,production:true,origin,clinical:true});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;
 await login();
 for(const [name,cue] of [['Escuela ficticia A','PG-A'],['Escuela ficticia B','PG-B']]){const r=await request('/schools',{method:'POST',body:{name,cue,location:'Localidad ficticia'}});assert.equal(r.status,201,JSON.stringify(r.data));if(!schoolA)schoolA=r.data.id;else schoolB=r.data.id;}
 for(const role of ['teacher','clinician','workshop']){
  const r=await request('/users',{method:'POST',body:{name:'Usuario ficticio '+role,email:role+'@example.test',password,role,schools:role==='teacher'?[schoolA]:[],license:role==='clinician'?'FICTICIA-PG':''}});assert.equal(r.status,201,JSON.stringify(r.data));await login(role);
 }
});
after(async()=>{if(app)await app.close();if(fixture)await fixture.close();});

test('PostgreSQL: SQL parametrizado preserva literales e identificadores',()=>{
 assert.equal(postgresQuery("SELECT 'schoolId ?' AS literal,schoolId FROM students WHERE id=?"),"SELECT 'schoolId ?' AS literal,\"schoolId\" FROM hv.students WHERE id=$1");
});
test('Supabase: pool único, sin prepared statements y TLS con verificación',()=>{
 const r=postgresOptions('postgresql://postgres.proyecto:password@aws.example.test:6543/postgres?sslmode=disable');
 assert.equal(r.options.max,1);assert.equal(r.options.prepare,false);assert.equal(r.options.ssl.rejectUnauthorized,true);assert(!r.url.includes('sslmode'));
 assert.throws(()=>postgresOptions('https://example.test'));assert.throws(()=>postgresOptions('postgresql://u:[YOUR-PASSWORD]@db.example.test/postgres'));
 const config=runtimeConfig({NODE_ENV:'production',VERCEL:'1',VERCEL_PROJECT_PRODUCTION_URL:'salud-prueba.vercel.app',DATABASE_URL:r.url,DATA_KEY:key});assert.equal(config.origin,origin);
});
test('PostgreSQL: inicio, sesión Secure y configuración sin secretos',async()=>{
 const r=await login();assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);assert.match(r.headers.get('set-cookie'),/Secure/);
 assert.equal((await request('/overview',{anonymous:true})).status,401);
 const config=(await request('/config',{anonymous:true})).data;assert.equal(config.demo,false);assert(!JSON.stringify(config).includes(key));
});
test('PostgreSQL: permisos por escuela y rechazo de DNI duplicado',async()=>{
 const id=await student({schoolId:schoolB,document:'99111222'});
 assert.equal((await request('/students/'+id,{role:'teacher'})).status,403);
 assert.equal((await request('/students',{method:'POST',role:'teacher',body:pupil({schoolId:schoolB})})).status,403);
 assert.equal((await request('/students',{method:'POST',body:pupil({document:'99111222'})})).status,409);
 const list=(await request('/overview',{role:'teacher'})).data.students;assert(list.every(p=>p.schoolId===schoolA));
});
test('PostgreSQL: origen, CSRF y JSON nulo rechazados',async()=>{
 assert.equal((await request('/students',{method:'POST',body:pupil(),headers:{Origin:'https://otro.test'}})).status,403);
 assert.equal((await request('/students',{method:'POST',body:pupil(),headers:{'X-CSRF-Token':'incorrecto'}})).status,403);
 assert.equal((await request('/students',{method:'POST',body:null})).status,400);
});
test('PostgreSQL: autorización y algoritmo no dependen del color enviado',async()=>{
 const no=await student({consent:false});assert.equal((await event(no,'screen',screen())).status,400);
 const id=await student();const r=await event(id,'screen',{...screen(),status:'green'});assert.equal(r.status,201);assert.equal(r.data.status,'yellow');
});
test('PostgreSQL: edición concurrente produce un éxito y un conflicto',async()=>{
 const id=await student();const p=(await request('/students/'+id)).data.student;
 const results=await Promise.all(['Uno','Dos'].map(name=>request('/students/'+id,{method:'PUT',body:{...p,name:'Cambio '+name}})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
});
test('PostgreSQL: evento concurrente se guarda sólo una vez',async()=>{
 const id=await student();const results=await Promise.all([event(id,'screen',screen(),'teacher',1),event(id,'screen',screen(),'teacher',1)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal((await store.getEvents(id)).length,1);
});
test('PostgreSQL: circuito completo y datos mínimos para docente y taller',async()=>{
 const id=await student();assert.equal((await event(id,'screen',screen(),'teacher')).status,201);
 const c={date:today(),diagnosis:'Hallazgo ficticio',notes:'Simulación',plan:'anteojos',nextDate:today(),rx:{od:{sphere:-1,cylinder:-.5,axis:90},oi:{sphere:0,cylinder:0,axis:0}}};
 assert.equal((await event(id,'consult',c,'teacher')).status,403);
 const consult=await event(id,'consult',c,'clinician');assert.equal(consult.status,201,JSON.stringify(consult.data));
 const o={consultId:consult.data.id,date:today(),frame:'PG-ARMAZON-1',material:'Policarbonato',recipient:'Adulto ficticio'};
 assert.equal((await event(id,'order',{...o,state:'entregado'},'workshop')).status,400);
 assert.equal((await event(id,'order',{...o,state:'preparado'},'workshop')).status,201);
 assert.equal((await event(id,'order',{...o,state:'entregado'},'workshop')).status,201);
 assert.equal((await event(id,'order',{...o,state:'entregado'},'workshop')).status,400);
 assert.equal((await event(id,'followup',{date:today(),outcome:'usa',notes:'Uso confirmado en simulacro'},'teacher')).status,201);
 const t=(await request('/students/'+id,{role:'teacher'})).data;assert(!JSON.stringify(t).includes('sphere'));assert(!t.events.some(e=>e.type==='consult'));
 const w=(await request('/students/'+id,{role:'workshop'})).data;assert(w.student.rx);assert.equal(w.student.guardian,undefined);assert.equal(w.student.orderStatus,'entregado');
 assert.equal((await request('/overview',{role:'workshop'})).data.students.find(p=>p.id===id).orderStatus,'entregado');
});
test('PostgreSQL: transacción fallida revierte todos los cambios',async()=>{
 await assert.rejects(store.transaction(async()=>{await store.db.prepare('INSERT INTO schools VALUES (?,?,?,?)').run('rollback-id','Escuela rollback','ROLLBACK','Ficticia');throw Error('Fallo simulado');}));
 assert.equal(await store.db.prepare('SELECT * FROM schools WHERE id=?').get('rollback-id'),undefined);
});
test('PostgreSQL: cifrado, auditoría y exportación sin datos identificatorios',async()=>{
 const rows=await store.db.prepare('SELECT data FROM students').all();assert(rows.length);assert(rows.every(r=>!r.data.includes('Alumno')&&r.data.split('.').length===3));
 const response=await fetch(base+'/api/export',{headers:sessions.admin});const csv=await response.text();assert.equal(response.status,200);assert(!csv.includes('99111222'));assert(!csv.includes('Adulto ficticio'));
 assert(Number((await store.db.prepare('SELECT COUNT(*) n FROM audit').get()).n)>0);
});
test('PostgreSQL: límite de acceso sobrevive a otra instancia de aplicación',async()=>{
 for(let i=0;i<10;i++)assert.equal((await request('/login',{method:'POST',anonymous:true,body:{email:'inexistente@example.test',password:'equivocada'}})).status,401);
 const second=createApp({store,production:true,origin,clinical:true});const server=http.createServer(second.handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/login',{method:'POST',headers:{Origin:origin,'X-HV-Request':'1','Content-Type':'application/json'},body:JSON.stringify({email:'inexistente@example.test',password:'equivocada'})});assert.equal(r.status,429);}
 finally{await new Promise(r=>server.close(r));}
});
test('PostgreSQL: instalar esquema otra vez conserva registros y revoca acceso público',async()=>{
 const before=Number((await store.db.prepare('SELECT COUNT(*) n FROM students').get()).n);
 await fixture.engine.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
 CREATE TABLE public.otro_proyecto (id INT); INSERT INTO public.otro_proyecto VALUES (42);
 CREATE SCHEMA vintracker; CREATE SCHEMA vintracker_aventura; CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE TABLE vintracker.registros (id INT PRIMARY KEY, data TEXT); INSERT INTO vintracker.registros VALUES (1,'VinTracker ficticio');
 ALTER TABLE vintracker.registros ENABLE ROW LEVEL SECURITY;
 CREATE POLICY lectura_vintracker ON vintracker.registros FOR SELECT TO authenticated USING (true);
 GRANT USAGE ON SCHEMA vintracker TO authenticated; GRANT SELECT ON vintracker.registros TO authenticated;
 CREATE TABLE vintracker_aventura.progreso (id INT); INSERT INTO vintracker_aventura.progreso VALUES (73);
 CREATE TABLE auth.users (id INT, email TEXT); INSERT INTO auth.users VALUES (9,'cuenta-ajena@example.test');
 CREATE TABLE storage.objects (id INT, name TEXT); INSERT INTO storage.objects VALUES (8,'archivo-ajeno');`);
 const policies=await fixture.engine.query("SELECT * FROM pg_policies WHERE schemaname='vintracker'");
 await fixture.engine.exec(readFileSync(new URL('../supabase/01_esquema.sql',import.meta.url),'utf8'));
 assert.equal(Number((await store.db.prepare('SELECT COUNT(*) n FROM students').get()).n),before);
 assert.equal((await fixture.engine.query('SELECT id FROM public.otro_proyecto')).rows[0].id,42);
 assert.deepEqual(await fixture.engine.query("SELECT * FROM pg_policies WHERE schemaname='vintracker'"),policies);
 assert.equal((await fixture.engine.query('SELECT id FROM vintracker_aventura.progreso')).rows[0].id,73);
 assert.equal((await fixture.engine.query('SELECT email FROM auth.users')).rows[0].email,'cuenta-ajena@example.test');
 assert.equal((await fixture.engine.query('SELECT name FROM storage.objects')).rows[0].name,'archivo-ajeno');
 await fixture.engine.exec('SET ROLE authenticated');
 try{assert.equal((await fixture.engine.query('SELECT data FROM vintracker.registros')).rows[0].data,'VinTracker ficticio');await assert.rejects(fixture.engine.query('SELECT * FROM hv.users'),/permission denied/);}
 finally{await fixture.engine.exec('RESET ROLE');}
 const security=await fixture.engine.query("SELECT relrowsecurity FROM pg_class WHERE relnamespace='hv'::regnamespace AND relkind='r'");assert(security.rows.length>=8);assert(security.rows.every(r=>r.relrowsecurity));
 await fixture.engine.exec('SET ROLE anon');try{await assert.rejects(fixture.engine.query('SELECT * FROM hv.students'),/permission denied/);}finally{await fixture.engine.exec('RESET ROLE');}
});
test('PostgreSQL: reinicialización no cambia cuentas ni contraseña y conserva sesión',async()=>{
 const before=await store.db.prepare('SELECT password FROM users WHERE email=?').get(env.BOOTSTRAP_ADMIN_EMAIL);
 assert.equal(await bootstrapPostgresAdmin(store,{...env,BOOTSTRAP_ADMIN_PASSWORD:'Otra-clave-que-no-se-aplica'}),false);
 assert.deepEqual(await store.db.prepare('SELECT password FROM users WHERE email=?').get(env.BOOTSTRAP_ADMIN_EMAIL),before);
 const second=createApp({store,production:true,origin,clinical:true});const server=http.createServer(second.handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/overview',{headers:sessions.admin});assert.equal(r.status,200);assert((await r.json()).students.length>0);}finally{await new Promise(r=>server.close(r));}
});
test('Vercel: reescritura a función, body procesado y sesión funcional',async()=>{
 const cloud=cloudHandler({env:{...env,APP_ORIGIN:origin,DATABASE_URL:'postgresql://u:p@local.test/postgres',DATA_KEY:key,CLINICAL_ENABLED:'true'},openStore:async()=>store});
 const server=http.createServer(async(req,res)=>{if(req.method==='POST'){let raw='';for await(const chunk of req)raw+=chunk;req.body=JSON.parse(raw);}return cloud(req,res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(url+'/api/index?hv_route=config')).status,200);
  const r=await fetch(url+'/api/index?hv_route=login',{method:'POST',headers:{Origin:origin,'X-HV-Request':'1','Content-Type':'application/json'},body:JSON.stringify({email:env.BOOTSTRAP_ADMIN_EMAIL,password})});assert.equal(r.status,200);
  const cookie=r.headers.get('set-cookie').split(';')[0];assert.equal((await fetch(url+'/api/index?hv_route=overview',{headers:{Cookie:cookie}})).status,200);
  assert.equal((await fetch(url+'/api/index?hv_route=../server')).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
test('Vercel: configuración incompleta devuelve 503 sin filtrar secretos',async()=>{
 const handler=cloudHandler({env:{}});const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/config');assert.equal(r.status,503);const result=await r.json();assert.equal(result.code,'CONFIGURACION_PENDIENTE');assert(!JSON.stringify(result).includes('DATABASE_URL'));}
 finally{await new Promise(r=>server.close(r));}
});
test('PostgreSQL: cerrar el cliente y reconectar conserva registros, claves y sesiones',async()=>{
 const count=Number((await store.db.prepare('SELECT COUNT(*) n FROM students').get()).n);
 await app.close();app=null;
 await assert.rejects(createPostgresStore({key:randomBytes(32).toString('hex'),client:fixture.client()}),/clave no corresponde/);
 store=await createPostgresStore({key,client:fixture.client()});
 assert.equal(Number((await store.db.prepare('SELECT COUNT(*) n FROM students').get()).n),count);
 assert.equal(await bootstrapPostgresAdmin(store,{}),false);
 app=createApp({store,production:true,origin,clinical:true});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;
 assert.equal((await request('/overview')).status,200);await login();
});
