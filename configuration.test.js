import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const context=vm.createContext({URL});vm.runInContext(readFileSync(new URL('../scripts/config-values.js',import.meta.url),'utf8'),context);
const values=context.HVConfiguration.values;
const input={connection:'postgresql://postgres.demo:[YOUR-PASSWORD]@aws.example.test:6543/postgres',password:'a@b%#:/? c',name:'Usuario ficticio',email:'USUARIO@example.test',adminPassword:'Contraseña-ficticia-larga'};
test('Configurador: codifica símbolos de la contraseña y prepara los seis campos',()=>{
 const v=values(input,()=> 'a'.repeat(64));assert.equal(decodeURIComponent(new URL(v.DATABASE_URL).password),input.password);assert.equal(v.BOOTSTRAP_ADMIN_EMAIL,'usuario@example.test');assert.equal(Object.keys(v).length,6);assert.equal(v.CLINICAL_ENABLED,'false');
});
test('Configurador: preserva el secreto existente al actualizar',()=>{
 const v=values({...input,secret:'secreto-original-de-mas-de-32-caracteres'},()=>assert.fail('No regenerar'));assert.equal(v.DATA_SECRET,'secreto-original-de-mas-de-32-caracteres');
});
test('Configurador: rechaza URL HTTP, conexión directa y contraseña ausente',()=>{
 for(const extra of [{connection:'https://example.test'},{connection:'postgresql://u:p@db.example.test:5432/postgres'},{password:''},{adminPassword:'corta'}])assert.throws(()=>values({...input,...extra}));
});
test('Configurador HTML independiente: genera seis valores sin cargar archivos externos',()=>{
 const html=readFileSync(new URL('../ABRIR_CONFIGURADOR.html',import.meta.url),'utf8');
 assert(!/<script[^>]*\bsrc\s*=/i.test(html));
 const elements=new Map();
 function element(){return {value:'',children:[],listeners:{},hidden:true,addEventListener(type,fn){this.listeners[type]=fn;},replaceChildren(){this.children=[];},append(...items){this.children.push(...items);},scrollIntoView(){}};}
 const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element};
 const sandbox=vm.createContext({URL,crypto:webcrypto,Uint8Array,document,navigator:{}});
 for(const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))vm.runInContext(script[1],sandbox);
 const fields={connection:input.connection,'db-password':input.password,name:input.name,email:input.email,'admin-password':input.adminPassword};
 for(const [id,value] of Object.entries(fields))document.getElementById(id).value=value;
 const submit=()=>document.getElementById('config-form').listeners.submit({preventDefault(){}});
 submit();assert.equal(document.getElementById('error').textContent,'');assert.equal(document.getElementById('results').hidden,false);
 const rows=document.getElementById('rows').children;assert.equal(rows.length,6);
 const secret=rows.find(r=>r.children[0].textContent==='DATA_SECRET').children[1].value;
 assert.match(secret,/^[a-f0-9]{64}$/);
 assert.equal(decodeURIComponent(new URL(rows[0].children[1].value).password),input.password);
 submit();assert.equal(document.getElementById('rows').children.find(r=>r.children[0].textContent==='DATA_SECRET').children[1].value,secret);
});
