// Prueba opcional para repetir en un entorno local con Playwright instalado.
// No forma parte de npm test: requiere instalar el navegador indicado en VERIFICACION.md.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {createApp} from '../server/app.js';
let chromium;
try{({chromium}=await import('playwright'));}catch{console.error('Esta prueba opcional necesita Playwright. Ver docs/VERIFICACION.md.');process.exit(1);}
const app=createApp({demo:true,dbPath:':memory:',key:randomBytes(32).toString('hex')});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.getByRole('button',{name:'Administración',exact:true}).click();
  await page.getByRole('heading',{name:'Una mirada a tu comunidad',exact:true}).waitFor();
  await page.getByRole('button',{name:'Nuevo alumno',exact:true}).click();
  await page.getByLabel('Nombre y apellido',{exact:true}).fill('Alumna Prueba Navegador');
  await page.getByLabel('Fecha de nacimiento',{exact:true}).fill('2017-02-20');
  await page.getByLabel('Escuela',{exact:true}).selectOption('esc-demo-1');
  await page.getByLabel('Grado y sección',{exact:true}).fill('4° A');
  await page.getByLabel('Adulto responsable',{exact:true}).fill('Adulto de prueba');
  await page.getByLabel('Contacto del adulto',{exact:true}).fill('Contacto ficticio');
  await page.getByRole('checkbox',{name:'La institución tiene autorización documentada para esta actividad y registro.',exact:true}).check();
  await page.getByLabel('Referencia del documento resguardado',{exact:true}).fill('AUT-PRUEBA');
  await page.getByRole('button',{name:'Guardar alumno',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('link',{name:'Alumnos',exact:true}).click();
  await page.getByRole('searchbox').fill('Alumna Prueba Navegador');
  await page.getByRole('button',{name:'Abrir ficha de Alumna Prueba Navegador',exact:true}).click();
  await page.getByRole('button',{name:'Nuevo tamizaje',exact:true}).click();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByRole('checkbox',{name:'Verifiqué distancia física, iluminación, cartilla, comprensión y oclusión sin presión. Los ojos se evalúan por separado.',exact:true}).check();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByLabel('Ojo derecho (OD)',{exact:true}).selectOption('50');
  await page.getByLabel('Ojo izquierdo (OI)',{exact:true}).selectOption('20');
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByRole('button',{name:'Guardar tamizaje',exact:true}).click();
  await page.getByRole('heading',{name:'Tamizaje guardado',exact:true}).waitFor();
  assert.match(await page.getByRole('dialog').innerText(),/Requiere evaluación/);
  await page.getByRole('button',{name:'Cerrar ventana',exact:true}).click();
  await page.getByRole('link',{name:'Inicio',exact:true}).click();
  mkdirSync('test-results',{recursive:true});
  await page.screenshot({path:'test-results/escritorio.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert(await page.getByRole('button',{name:'Abrir menú',exact:true}).isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.getByRole('button',{name:'Abrir ayuda de Lupi',exact:true}).click();
  await page.getByRole('button',{name:'Practicar',exact:true}).click();
  assert(await page.getByRole('heading',{name:'Practicamos con Lupi',exact:true}).isVisible());
  await page.screenshot({path:'test-results/movil.png'});
  assert.deepEqual(errors,[]);
  console.log('Prueba de navegador aprobada: alta, tamizaje, escritorio, móvil y mascota.');
}finally{await browser?.close();await app.close();}
