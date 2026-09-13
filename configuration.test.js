import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
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
