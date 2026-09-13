import {readdirSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {Script} from 'node:vm';
const files=[];
function walk(folder){for(const item of readdirSync(folder,{withFileTypes:true})){const path=join(folder,item.name);if(item.isDirectory())walk(path);else if(/\.(js|mjs)$/.test(path))files.push(path);}}
for(const dir of ['public','shared','server','scripts','tests','api'])walk(dir);
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status)process.exit(r.status);}
const pkg=JSON.parse(readFileSync('package.json','utf8'));
if(!pkg.dependencies?.postgres)throw Error('Falta el cliente PostgreSQL.');
const vercel=JSON.parse(readFileSync('vercel.json','utf8'));
if(vercel.outputDirectory!=='public')throw Error('La salida de Vercel debe ser public.');
for(const file of ['public/shared/domain.js','public/boot.js','api/index.js','supabase/01_esquema.sql'])readFileSync(file);
const helper=readFileSync('ABRIR_CONFIGURADOR.html','utf8');
for(const match of helper.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))new Script(match[1]);
console.log(`${files.length} archivos JavaScript y configurador HTML con sintaxis válida. Configuración de Vercel y recursos presentes.`);
