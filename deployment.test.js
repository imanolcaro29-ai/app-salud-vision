import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createApp} from '../server/app.js';
import {createStore,passwordMatches,passwordHash} from '../server/store.js';
import {dataKey,runtimeConfig,bootstrapAdmin} from '../server/runtime.js';
import {start} from '../public/startup.js';

const credentials=()=>({BOOTSTRAP_ADMIN_NAME:'Coordinador ficticio',BOOTSTRAP_ADMIN_EMAIL:'coordinador@example.test',BOOTSTRAP_ADMIN_PASSWORD:randomBytes(24).toString('hex')});
test('El arranque informa un módulo 404 y abandona el indicador de carga',async()=>{
  let shown=0;
  assert.equal(await start(()=>Promise.reject(Error('404 /shared/domain.js')),{showError:()=>shown++}),false);
  assert.equal(shown,1);
});
test('El arranque limita la espera y captura fallos de inicialización',async()=>{
  let shown=0;
  assert.equal(await start(()=>new Promise(()=>{}),{timeoutMs:10,showError:()=>shown++}),false);
  assert.equal(await start(()=>({ready:Promise.reject(Error('init_failed'))}),{showError:()=>shown++}),false);
  assert.equal(shown,2);
});
test('El arranque espera la aplicación y no muestra un error al completar',async()=>{
  let completed=false;
  const ok=await start(()=>({ready:Promise.resolve().then(()=>{completed=true;})}),{showError:()=>assert.fail('No debe aparecer error')});
  assert.equal(ok,true);assert.equal(completed,true);
});
test('Render detecta URL y puerto, conserva origen exacto y clave estable',()=>{
  const env={NODE_ENV:'production',RENDER:'true',RENDER_EXTERNAL_URL:'https://salud.example.test/',PORT:'10000',DATA_SECRET:randomBytes(32).toString('hex'),DB_PATH:'/var/data/salud.sqlite'};
  const config=runtimeConfig(env);
  assert.equal(config.origin,'https://salud.example.test');assert.equal(config.port,10000);assert.equal(config.host,'0.0.0.0');
  assert.equal(config.key,dataKey(env));assert.match(config.key,/^[a-f0-9]{64}$/);
  assert.equal(config.clinical,false);assert.equal(config.demo,false);
  assert.notEqual(config.key,dataKey({DATA_SECRET:env.DATA_SECRET+'a'}));
});
test('Producción rechaza origen inseguro, clave ausente y modo demo',()=>{
  const env={NODE_ENV:'production',APP_ORIGIN:'https://salud.example.test',DATA_KEY:randomBytes(32).toString('hex')};
  for(const extra of [{APP_ORIGIN:'http://salud.example.test'},{APP_ORIGIN:'https://x.test/ruta'},{APP_ORIGIN:'https://u:p@x.test'},{DEMO_MODE:'true'},{PORT:'abc'},{DATA_KEY:''},{VERCEL:'1'}])assert.throws(()=>runtimeConfig({...env,...extra}));
  assert.equal(dataKey(env),env.DATA_KEY);
});
test('Creación inicial es atómica y nunca restablece una contraseña modificada',()=>{
  const store=createStore(':memory:',randomBytes(32).toString('hex'));
  try {
    assert.throws(()=>bootstrapAdmin(store,{}));
    assert.equal(store.db.prepare('SELECT COUNT(*) n FROM users').get().n,0);
    const env=credentials();assert.equal(bootstrapAdmin(store,env),true);
    const u=store.db.prepare('SELECT * FROM users').get();assert.equal(u.role,'admin');assert(passwordMatches(env.BOOTSTRAP_ADMIN_PASSWORD,u.password));
    const changed=randomBytes(24).toString('hex');store.db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(changed),u.id);
    assert.equal(bootstrapAdmin(store,env),false);assert.equal(bootstrapAdmin(store,{}),false);
    assert(passwordMatches(changed,store.db.prepare('SELECT password FROM users').get().password));
    assert.equal(store.db.prepare('SELECT COUNT(*) n FROM users').get().n,1);
  }finally{store.db.close();}
});
test('Publicación: todos los módulos de navegador existen en public y se sirven con MIME JavaScript',async()=>{
  const app=createApp({dbPath:':memory:',key:randomBytes(32).toString('hex')});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
  try {
    const index=await (await fetch(base+'/')).text();assert(index.includes('src="/boot.js"'));
    for(const path of ['/boot.js','/startup.js','/app.js','/shared/domain.js']) {
      const r=await fetch(base+path);assert.equal(r.status,200,path);assert.match(r.headers.get('content-type'),/javascript/);
      assert.equal(await r.text(),readFileSync(new URL('../public'+path,import.meta.url),'utf8'));
    }
    assert(!readFileSync(new URL('../public/shared/domain.js',import.meta.url),'utf8').includes("from '../public/"));
    assert.equal((await fetch(base+'/server/runtime.js')).status,404);
  }finally{await app.close();}
});
test('Simulacro de producción: login, escuela, reinicio y persistencia con el mismo secreto',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'hv-deployment-'));
  const env={...credentials(),DATA_SECRET:randomBytes(32).toString('hex')};
  const config={production:true,origin:'https://salud.example.test',dbPath:join(dir,'salud.sqlite'),key:dataKey(env)};
  let app;
  async function launch(){app=createApp(config);bootstrapAdmin(app.store,env);await new Promise(r=>app.server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+app.server.address().port;}
  async function login(base){const r=await fetch(base+'/api/login',{method:'POST',headers:{Origin:config.origin,'X-HV-Request':'1','Content-Type':'application/json'},body:JSON.stringify({email:env.BOOTSTRAP_ADMIN_EMAIL,password:env.BOOTSTRAP_ADMIN_PASSWORD})});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Secure/);const data=await r.json();return {Cookie:r.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':data.csrf,Origin:config.origin,'X-HV-Request':'1','Content-Type':'application/json'};}
  try {
    let base=await launch();let headers=await login(base);
    assert.equal((await fetch(base+'/health')).status,200);
    assert.equal((await (await fetch(base+'/api/config')).json()).demo,false);
    assert.equal((await fetch(base+'/api/schools',{method:'POST',headers,body:JSON.stringify({name:'Escuela de simulacro',cue:'SIM-001',location:'Localidad ficticia'})})).status,201);
    await app.close();app=null;
    base=await launch();headers=await login(base);
    const overview=await (await fetch(base+'/api/overview',{headers})).json();assert.equal(overview.schools.length,1);assert.equal(overview.schools[0].cue,'SIM-001');
    assert.equal(app.store.db.prepare('SELECT COUNT(*) n FROM users').get().n,1);
  }finally{if(app)await app.close();rmSync(dir,{recursive:true,force:true});}
});
