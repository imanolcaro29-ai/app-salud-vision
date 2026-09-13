import postgres from 'postgres';
import {AsyncLocalStorage} from 'node:async_hooks';
import {encryption,id,passwordHash} from './security.js';

// Sólo recibe consultas constantes del servidor. Los datos viajan como parámetros.
export function postgresQuery(query){
  let n=0;
  const camel=new Set(['schoolId','documentHash','studentId','authorId','createdAt','userId']);
  return query.replace(/'(?:''|[^'])*'|\b[A-Za-z_]\w*\b|\?/g,token=>token==='?'?'$'+(++n):camel.has(token)?'"'+token+'"':token)
    .replace(/\b(FROM|JOIN|INTO|UPDATE)\s+(meta|users|schools|students|events|sessions|audit|login_attempts)\b/gi,'$1 hv.$2');
}
export function postgresOptions(url,ca){
  let parsed;try{parsed=new URL(url);}catch{throw Error('DATABASE_URL no es una conexión PostgreSQL válida.');}
  if(!['postgres:','postgresql:'].includes(parsed.protocol)||!parsed.username||!parsed.password||!parsed.hostname)throw Error('Completá la conexión PostgreSQL de Supabase.');
  if(url.includes('[YOUR-PASSWORD]')||url.includes('[PROJECT-REF]'))throw Error('Reemplazá los marcadores de DATABASE_URL por los datos de tu proyecto.');
  // Los parámetros de la URL no pueden desactivar TLS.
  parsed.searchParams.delete('sslmode');parsed.searchParams.delete('ssl');parsed.searchParams.delete('pgbouncer');
  return {url:parsed.href,options:{max:1,prepare:false,connect_timeout:8,idle_timeout:20,max_lifetime:300,
    ssl:{rejectUnauthorized:true,...(ca?{ca}: {})},connection:{application_name:'salud-visual'},onnotice:()=>{}}};
}
export async function createPostgresStore({url,key,client,ca}){
  const crypto=encryption(key);
  const settings=client?null:postgresOptions(url,ca);
  const sql=client||postgres(settings.url,settings.options);
  const context=new AsyncLocalStorage();
  const execute=(query,args=[])=>(context.getStore()||sql).unsafe(postgresQuery(query),args);
  const db={prepare(query){return {
    get:async(...args)=>(await execute(query,args))[0],
    all:async(...args)=>Array.from(await execute(query,args)),
    run:async(...args)=>({changes:Number((await execute(query,args)).count||0)})
  };},close:()=>sql.end({timeout:5})};
  const transaction=fn=>context.getStore()?fn():sql.begin(async tx=>{await tx.unsafe("SET LOCAL statement_timeout = '10s'");return context.run(tx,fn);});
  async function audit(authorId,action,subject,data={}){await db.prepare('INSERT INTO audit (id,authorId,action,subject,createdAt,data) VALUES (?,?,?,?,?,?)').run(id(),authorId||null,action,subject,new Date().toISOString(),crypto.encrypt(data));}
  async function getStudent(studentId){const s=await db.prepare('SELECT * FROM students WHERE id=?').get(studentId);return s?{...crypto.decrypt(s.data),id:s.id,schoolId:s.schoolId,version:s.version}:null;}
  async function snapshot(schoolIds){
    if(schoolIds&&schoolIds.length===0)return [];
    const where=schoolIds?' WHERE schoolId IN ('+schoolIds.map(()=>'?').join(',')+')':'';
    const students=await db.prepare('SELECT * FROM students'+where).all(...(schoolIds||[]));
    if(!students.length)return [];
    const ids=students.map(s=>s.id);
    const events=await db.prepare('SELECT e.*,u.name AS author,u.license FROM events e JOIN users u ON u.id=e.authorId WHERE studentId IN ('+ids.map(()=>'?').join(',')+') ORDER BY createdAt DESC,e.rowid DESC').all(...ids);
    const grouped=new Map(ids.map(id=>[id,[]]));
    for(const e of events)grouped.get(e.studentId).push({id:e.id,type:e.type,...crypto.decrypt(e.data),author:e.author,authorId:e.authorId,license:e.license,createdAt:e.createdAt});
    return students.map(s=>({student:{...crypto.decrypt(s.data),id:s.id,schoolId:s.schoolId,version:s.version},events:grouped.get(s.id).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.createdAt.localeCompare(a.createdAt))}));
  }
  async function getEvents(studentId){return (await db.prepare('SELECT e.*,u.name AS author,u.license FROM events e JOIN users u ON u.id=e.authorId WHERE studentId=? ORDER BY createdAt DESC,e.rowid DESC').all(studentId)).map(e=>({id:e.id,type:e.type,...crypto.decrypt(e.data),author:e.author,authorId:e.authorId,license:e.license,createdAt:e.createdAt})).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.createdAt.localeCompare(a.createdAt));}
  async function addUser({email,name,role,schools=[],password,license=''}){const uid=id();await db.prepare('INSERT INTO users (id,email,name,role,schools,password,license) VALUES (?,?,?,?,?,?,?)').run(uid,email.toLowerCase(),name,role,JSON.stringify(schools),passwordHash(password),license);return uid;}
  async function startupLock(fn){return transaction(async()=>{await execute('SELECT pg_advisory_xact_lock(74821001)');return fn();});}
  async function consumeLoginAttempt(rateKey){
    const now=Date.now(),until=now+15*60000;
    await execute('DELETE FROM login_attempts WHERE expires<?',[now]);
    const rows=await execute('INSERT INTO login_attempts (key,n,expires) VALUES (?,1,?) ON CONFLICT (key) DO UPDATE SET n=hv.login_attempts.n+1 RETURNING n',[rateKey,until]);
    return Number(rows[0].n)<=10;
  }
  try{
    await startupLock(async()=>{
      const version=await db.prepare('SELECT value FROM meta WHERE key=?').get('schema_version');
      if(version?.value!=='1')throw Error('Ejecutá primero supabase/01_esquema.sql en SQL Editor.');
      const marker=await db.prepare('SELECT value FROM meta WHERE key=?').get('key_check');
      if(marker){try{if(crypto.decrypt(marker.value)!=='HV-1')throw Error();}catch{throw Error('La clave no corresponde a esta base. Conservá DATA_SECRET o DATA_KEY original.');}}
      else await db.prepare('INSERT INTO meta VALUES (?,?)').run('key_check',crypto.encrypt('HV-1'));
      const mode=await db.prepare('SELECT value FROM meta WHERE key=?').get('mode');
      if(mode&&mode.value!=='real')throw Error('La base de nube debe ser independiente de la demostración.');
      if(!mode)await db.prepare('INSERT INTO meta VALUES (?,?)').run('mode','real');
    });
  }catch(e){await db.close();throw e;}
  return {kind:'postgres',db,...crypto,transaction,startupLock,audit,getStudent,getEvents,snapshot,addUser,consumeLoginAttempt,
    resetLoginAttempts:key=>execute('DELETE FROM login_attempts WHERE key=?',[key])};
}
