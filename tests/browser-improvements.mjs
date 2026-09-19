import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {createApp} from '../server/app.js';
const app=createApp({dbPath:':memory:',key:randomBytes(32).toString('hex')});
const password='PruebaNavegador123!';app.store.addUser({name:'Coordinación Prueba',email:'admin@example.test',role:'admin',password});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:JSON.parse(process.env.CHROMIUM_ARGS||'[]')}:{})});
const p=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(12000);mkdirSync('test-results',{recursive:true});
try{
 await p.goto(base);await p.getByLabel('Correo electrónico',{exact:true}).fill('admin@example.test');await p.getByLabel('Contraseña',{exact:true}).fill(password);await p.getByRole('button',{name:'Ingresar',exact:true}).click();
 await p.getByRole('button',{name:'Empezar con Lupi',exact:true}).click();await p.locator('#lupi-tour').waitFor();
 const before=await p.locator('#tour-title').innerText();await p.getByRole('button',{name:'Siguiente',exact:true}).click();await p.waitForFunction(title=>document.querySelector('#tour-title')?.textContent!==title,before);
 await p.getByRole('button',{name:'Atrás',exact:true}).click();await p.getByRole('heading',{name:'¡Hola! Soy Lupi.',exact:true}).waitFor();
 for(let n=0;n<12&&await p.locator('#lupi-tour').count();n++){
  if(await p.locator('#tour-feedback').count()){
   await p.getByRole('button',{name:'Mi contraseña de ingreso',exact:true}).click();assert(await p.locator('#tour-next').isDisabled());
   await p.getByRole('button',{name:'Carpeta 2026, folio 15',exact:true}).click();assert(await p.locator('#tour-next').isEnabled());await p.screenshot({path:'test-results/lupi-tutorial.png'});
  }
  const title=await p.locator('#tour-title').innerText();await p.locator('#tour-next').click();await p.waitForFunction(old=>!document.querySelector('#tour-title')||document.querySelector('#tour-title').textContent!==old,title);
 }
 assert.equal(await p.locator('#lupi-tour').count(),0);
 await p.getByRole('link',{name:'Configuración',exact:true}).click();await p.getByRole('button',{name:'Configurar registro',exact:true}).click();await p.getByLabel('Estado del registro',{exact:true}).selectOption('true');
 await p.getByRole('button',{name:'Guardar estado',exact:false}).click();await p.getByRole('alert').filter({hasText:'Confirmá que el equipo'}).waitFor();
 await p.getByRole('checkbox',{name:'El equipo responsable aprobó el protocolo que vamos a usar.',exact:true}).check();await p.getByRole('checkbox',{name:'La institución definió cómo informar a las familias, obtener y guardar las autorizaciones.',exact:true}).check();await p.getByRole('button',{name:'Guardar estado',exact:false}).click();await p.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await p.locator('.registration-banner').count(),0);
 await p.getByRole('button',{name:'Personalizar interfaz',exact:true}).click();await p.getByLabel('Paleta de colores',{exact:true}).selectOption('celeste');await p.getByLabel('Frase del menú',{exact:true}).fill('Ver bien también es aprender mejor.');
 await p.locator('summary').filter({hasText:'Inicio de sesión'}).click();await p.getByLabel('Título del ingreso',{exact:true}).fill('Tu equipo de salud visual');await p.locator('summary').filter({hasText:'Entradas de la aplicación'}).click();await p.getByLabel('Título de Alumnos',{exact:true}).fill('Nuestros alumnos');
 await p.screenshot({path:'test-results/editor-apariencia.png'});await p.getByRole('button',{name:'Guardar apariencia',exact:false}).click();await p.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await p.locator('html').getAttribute('data-theme'),'celeste');await p.reload();await p.getByRole('heading',{name:'Configuración',exact:true}).waitFor();assert.equal(await p.locator('html').getAttribute('data-theme'),'celeste');await p.screenshot({path:'test-results/configuracion.png'});
 await p.getByRole('button',{name:'Mi cuenta: cambiar nombre, correo o contraseña',exact:true}).click();await p.getByLabel('Mi nombre visible',{exact:true}).fill('Imanol de Prueba');await p.getByLabel('Mi correo de ingreso',{exact:true}).fill('nuevo@example.test');await p.getByLabel('Contraseña actual para confirmar',{exact:true}).fill(password);await p.getByRole('button',{name:'Guardar mi cuenta',exact:false}).click();await p.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await p.locator('.user-name').innerText(),'Imanol de Prueba');
 await p.getByRole('link',{name:'Administración',exact:true}).click();await p.getByRole('button',{name:'Nueva cuenta',exact:true}).click();
 // Crear una segunda cuenta para probar la eliminación desde la interfaz.
 const f=p.locator('form[data-form="user"]');await f.locator('[name="name"]').fill('Admin Temporal');await f.locator('[name="email"]').fill('temporal@example.test');await f.locator('[name="password"]').fill(password);await f.locator('[name="role"]').selectOption('admin');await f.locator('[type="submit"]').click();await p.getByRole('dialog').waitFor({state:'hidden'});
 const row=p.getByRole('row').filter({hasText:'temporal@example.test'});await row.getByRole('button',{name:'Gestionar',exact:true}).click();await p.getByRole('button',{name:'Eliminar cuenta',exact:true}).click();await p.getByLabel('Escribí su correo para confirmar',{exact:true}).fill('temporal@example.test');await p.getByRole('button',{name:'Eliminar cuenta',exact:false}).click();await p.getByRole('dialog').waitFor({state:'hidden'});await row.waitFor({state:'hidden'});
 await p.getByRole('link',{name:'Alumnos',exact:true}).click();await p.getByRole('heading',{name:'Nuestros alumnos',exact:true}).waitFor();const download=p.waitForEvent('download');await p.getByRole('link',{name:/Indicadores Excel/}).click();assert((await download).suggestedFilename().endsWith('.xlsx'));
 await p.getByRole('link',{name:'Recursos',exact:true}).click();await p.getByRole('article').filter({hasText:'Autorizaciones sin palabras difíciles'}).getByRole('button',{name:'Leer guía',exact:true}).click();await p.getByRole('dialog').getByRole('heading',{name:'Autorizaciones sin palabras difíciles',exact:true}).waitFor();assert((await p.getByRole('dialog').innerText()).includes('Carpeta de 4.º A'));await p.getByRole('button',{name:'Cerrar ventana',exact:true}).click();
 await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);await p.evaluate(()=>scrollTo(0,0));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.waitForFunction(()=>!document.querySelector('#notice').textContent);await p.screenshot({path:'test-results/recursos-movil.png'});
 await p.getByRole('button',{name:'Empezar tutorial con Lupi',exact:true}).click();await p.locator('#lupi-tour').waitFor();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'test-results/lupi-movil.png'});await p.getByRole('button',{name:'Cerrar tutorial',exact:true}).click();
 await p.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await p.getByRole('heading',{name:'Tu equipo de salud visual',exact:true}).waitFor();await p.screenshot({path:'test-results/login-movil.png'});
 await p.getByLabel('Correo electrónico',{exact:true}).fill('nuevo@example.test');await p.getByLabel('Contraseña',{exact:true}).fill(password);await p.getByRole('button',{name:'Ingresar',exact:true}).click();await p.locator('.user-name').waitFor({state:'attached'});assert.equal(await p.locator('.user-name').textContent(),'Imanol de Prueba');
 assert.deepEqual(errors,[]);console.log('Configuración persistente, habilitación, perfil, eliminación, Excel y tutorial verificados en navegador; escritorio y móvil.');
}catch(e){await p.screenshot({path:'test-results/error-mejoras.png'});console.error((await p.locator('body').innerText()).slice(-1800));throw e;}finally{await browser.close();await app.close();}
