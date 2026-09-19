import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import ExcelJS from 'exceljs';
import {createApp} from '../server/app.js';
import {createStore} from '../server/store.js';
import {createPostgresStore} from '../server/postgres-store.js';
import {postgresFixture} from './helpers/postgres.js';
import {DEFAULT_UI} from '../public/shared/preferences.js';
import {preferencesStore} from '../server/preferences.js';
import {excelReport} from '../server/excel-report.js';
for(const kind of ['sqlite','postgres'])test(kind+': configuración, cuenta y eliminación',async t=>{
 const key=randomBytes(32).toString('hex'),password='CuentaDePrueba123!';let fixture,app,store;
 if(kind==='postgres'){fixture=await postgresFixture();store=await createPostgresStore({key,client:fixture.client()});app=createApp({store,clinical:false});}
 else {app=createApp({dbPath:':memory:',key,clinical:false});store=app.store;}
 const admin=await store.addUser({name:'Admin Principal',email:'admin@test.example',role:'admin',password}),teacher=await store.addUser({name:'Docente Prueba',email:'teacher@test.example',role:'teacher',password});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,sessions={};
 async function req(path,{role='admin',method='GET',body,session}={}){const h={Origin:base,'X-HV-Request':'1',...(session||sessions[role]||{})};if(body!==undefined)h['Content-Type']='application/json';const r=await fetch(base+'/api'+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});const bytes=Buffer.from(await r.arrayBuffer());let data;try{data=JSON.parse(bytes);}catch{}return {status:r.status,data,bytes,headers:r.headers};}
 async function login(role,email=role+'@test.example'){const r=await req('/login',{method:'POST',body:{email,password}});assert.equal(r.status,200,JSON.stringify(r.data));sessions[role]={Cookie:r.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':r.data.csrf};return r;}
 try{
 await login('admin');await login('teacher');
 await t.test('habilitación explicada, privada y persistente',async()=>{
  assert.equal((await req('/students',{method:'POST',body:{}})).status,403);
  assert.equal((await req('/settings',{role:'teacher'})).status,403);
  assert.equal((await req('/settings',{role:'teacher',method:'PUT',body:{section:'clinical',version:0,enabled:true,protocolConfirmed:true,consentConfirmed:true}})).status,403);
  assert.equal((await req('/settings',{method:'PUT',body:{section:'clinical',version:0,enabled:true}})).status,400);
  const out=await req('/settings',{method:'PUT',body:{section:'clinical',version:0,enabled:true,protocolConfirmed:true,consentConfirmed:true}});assert.equal(out.status,200,JSON.stringify(out.data));assert.equal(out.data.version,1);
  assert.equal((await req('/students',{method:'POST',body:{}})).status,400,'llega a validar los datos tras habilitar');
  assert.equal((await preferencesStore(store,false).read()).clinical.enabled,true);
  const publicConfig=(await req('/config')).data;assert.equal(publicConfig.clinical,true);assert.equal(publicConfig.authorId,undefined);assert(!JSON.stringify(publicConfig).includes(admin));
 });
 await t.test('apariencia validada, cifrada y con conflicto de revisión',async()=>{
  const ui={...DEFAULT_UI,brandName:'Escuela de Prueba',loginTitle:'Hola, comunidad',alumnosTitle:'Nuestros estudiantes'};
  assert.equal((await req('/settings',{method:'PUT',body:{section:'ui',version:1,ui:{...ui,theme:'javascript:alert(1)'}}})).status,400);
  const changes=await Promise.all(['A','B'].map(x=>req('/settings',{method:'PUT',body:{section:'ui',version:1,ui:{...ui,teamText:x}}})));assert.deepEqual(changes.map(r=>r.status).sort(),[200,409]);
  const persisted=await preferencesStore(store,false).read();assert.equal(persisted.ui.loginTitle,'Hola, comunidad');assert.equal(persisted.ui.alumnosTitle,'Nuestros estudiantes');
  const row=await store.db.prepare('SELECT value FROM meta WHERE key=?').get('app_preferences');assert(!row.value.includes('Hola, comunidad'));
 });
 await t.test('mi cuenta exige contraseña y revoca sesiones anteriores',async()=>{
  const old={...sessions.teacher};const profile={name:'Nombre Actualizado',email:'nuevo@test.example',current:'incorrecta'};
  assert.equal((await req('/profile',{role:'teacher',method:'PUT',body:profile})).status,400);
  assert.equal((await req('/profile',{role:'teacher',method:'PUT',body:{...profile,email:'admin@test.example',current:password}})).status,409);
  const r=await req('/profile',{role:'teacher',method:'PUT',body:{...profile,current:password}});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.user.name,profile.name);assert.equal(r.data.user.id,teacher);
  assert.equal((await req('/overview',{session:old})).status,401);await login('teacher','nuevo@test.example');
 });
 await t.test('eliminar admin conserva auditoría y revoca acceso',async()=>{
  const created=await req('/users',{method:'POST',body:{name:'Admin Temporal',email:'temp@test.example',role:'admin',password,schools:[],license:''}});assert.equal(created.status,201);const uid=created.data.id;
  await login('temp');await store.audit(uid,'login',uid);
  assert.equal((await req('/users/'+uid,{role:'teacher',method:'DELETE',body:{confirm:'temp@test.example'}})).status,403);
  assert.equal((await req('/users/'+uid,{method:'DELETE',body:{confirm:'mal'}})).status,400);
  assert.equal((await req('/users/'+uid,{method:'DELETE',body:{confirm:'temp@test.example'}})).status,200);
  assert.equal((await req('/overview',{role:'temp'})).status,401);
  assert(!(await req('/admin')).data.users.some(u=>u.id===uid));
  assert.equal((await store.db.prepare('SELECT active FROM users WHERE id=?').get(uid)).active,0);
  assert((await store.db.prepare('SELECT id FROM audit WHERE authorId=?').all(uid)).length);
  assert.equal((await req('/users/'+uid,{method:'PATCH',body:{active:true}})).status,404);
  assert.equal((await req('/users/'+admin,{method:'DELETE',body:{confirm:'admin@test.example'}})).status,400);
 });
 await t.test('administradores concurrentes no pueden dejar el equipo sin acceso',async()=>{
  const c=await req('/users',{method:'POST',body:{name:'Otro Administrador',email:'other@test.example',role:'admin',password,schools:[],license:''}});assert.equal(c.status,201);await login('other');
  const out=await Promise.all([req('/users/'+c.data.id,{method:'DELETE',body:{confirm:'other@test.example'}}),req('/users/'+admin,{role:'other',method:'DELETE',body:{confirm:'admin@test.example'}})]);
  assert.equal(out.filter(r=>r.status===200).length,1,JSON.stringify(out));
  assert.equal(Number((await store.db.prepare("SELECT COUNT(*) AS n FROM users WHERE active=1 AND role='admin'").get()).n),1);
  if(out[0].status!==200)sessions.admin=sessions.other;
 });
 await t.test('Excel descargable con permisos y tres hojas',async()=>{
  assert.equal((await req('/export.xlsx',{role:'teacher'})).status,403);
  const r=await req('/export.xlsx');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/spreadsheetml/);
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(r.bytes);assert.deepEqual(wb.worksheets.map(s=>s.name),['Resumen','Escuelas','Guía']);
 });
 }finally{await app.close();if(fixture)await fixture.close();}
});
test('Excel: totales, cobertura, formato y nombres que no se ejecutan como fórmulas',async()=>{
 const rows=[['=HYPERLINK("https://example.test")',10,8,5,1,1,1,2,1],['Escuela B',0,0,0,0,0,0,0,0]];
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(await excelReport(rows));const s=wb.getWorksheet('Escuelas');assert.equal(s.getCell('A7').type,ExcelJS.ValueType.String);assert.equal(s.getCell('J7').result,.8);assert.equal(s.getCell('B10').result,10);assert.equal(s.getCell('J10').result,.8);assert.equal(wb.getWorksheet('Resumen').getCell('F12').result,8);assert.equal(s.getCell('J7').numFmt,'0.0%');assert.equal(s.views[0].ySplit,6);assert(s.getColumn(1).width>=30);assert(s.autoFilter);
 for(const rows of [[],[['Vacía',0,0,0,0,0,0,0,0]]]){await wb.xlsx.load(await excelReport(rows));assert.match(wb.getWorksheet('Resumen').getCell('F21').formula,/IF\(Escuelas!B/);assert(!JSON.stringify(wb.model).includes('#DIV/0!'));}
});
