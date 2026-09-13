import http from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createStore} from './store.js';
import {id,hash,passwordMatches,passwordHash} from './security.js';
import {seedDemo} from './demo-seed.js';
import {ROLES,PROTOCOL,classify,validateStudent,validateScreen,validateConsult,validDate,today,csvCell} from '../shared/domain.js';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(code,message)=>{throw new HttpError(code,message);};
const safeUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role,schools:JSON.parse(u.schools),license:u.license,active:!!u.active});
const permit=(u,roles)=>{if(!roles.includes(u.role))fail(403,'Tu perfil no tiene permiso para realizar esta acción.');};
export function createApp(config={}) {
  const demo=config.demo===true,clinical=demo||config.clinical===true;
  const store=config.store||createStore(config.dbPath||'./data/salud-visual.sqlite',config.key);
  if(config.store&&demo)throw Error('La demostración utiliza una base local independiente.');
  const {db,encrypt,decrypt,audit,getStudent,getEvents}=store;
  const transaction=store.kind==='postgres'?store.transaction:async fn=>{db.exec('BEGIN IMMEDIATE');try{const result=await fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
  if(!config.store){
  const mode=db.prepare('SELECT value FROM meta WHERE key=?').get('mode');
  if(mode && mode.value!==(demo?'demo':'real')){db.close();throw Error('No se permite abrir la misma base en modos real y demo. Usá bases distintas.');}
  if(!mode)db.prepare('INSERT INTO meta VALUES (?,?)').run('mode',demo?'demo':'real');
  if(demo)seedDemo(store);
  }
  const limiter=new Map();
  function scoped(u,p){if(!p)fail(404,'No encontramos esa ficha.');if(u.role==='teacher'&&!JSON.parse(u.schools).includes(p.schoolId))fail(403,'Esa escuela no está asignada a tu cuenta.');}
  function ready(){if(!clinical)fail(503,'El registro está pendiente de habilitación institucional. El administrador debe completar la configuración.');}
  async function auditView(u,action,subject){(await audit(u.id,action,subject));}
  function studentView(u,p,events){
    const screen=events.find(e=>e.type==='screen'),consult=events.find(e=>e.type==='consult'),order=events.find(e=>e.type==='order'&&e.consultId===consult?.id),followup=events.find(e=>e.type==='followup');
    const base={...p,status:screen?.status||'pending',screenDate:screen?.date||null,screenReason:screen?.reason||'',nextDate:consult?.nextDate||null,plan:consult?.plan||null,orderStatus:consult?.plan==='anteojos'?(order?.state||'pendiente'):null,orderConsultId:consult?.plan==='anteojos'?consult.id:null,followupDate:followup?.date||null};
    if(u.role==='workshop')return {id:p.id,name:p.name,schoolId:p.schoolId,grade:p.grade,version:p.version,orderStatus:base.orderStatus,orderConsultId:base.orderConsultId,rx:consult?.plan==='anteojos'?consult.rx:null};
    return base;
  }
  async function list(u){
    if(store.snapshot){const rows=await store.snapshot(u.role==='teacher'?JSON.parse(u.schools):undefined);return rows.map(({student,events})=>studentView(u,student,events)).filter(p=>u.role!=='workshop'||p.orderConsultId).sort((a,b)=>a.name.localeCompare(b.name,'es'));}
    const result=[];
    for(const row of (await db.prepare('SELECT id FROM students').all())){
      const p=(await getStudent(row.id));
      if(u.role==='teacher'&&!JSON.parse(u.schools).includes(p.schoolId))continue;
      const view=studentView(u,p,(await getEvents(p.id)));
      if(u.role!=='workshop'||view.orderConsultId)result.push(view);
    }
    return result.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  }
  async function session(res,u){const token=randomBytes(32).toString('base64url'),csrf=randomBytes(24).toString('base64url');(await db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now()));(await db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(hash(token),u.id,csrf,Date.now()+8*3600000));res.setHeader('Set-Cookie',`hv_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${config.production?'; Secure':''}`);return {user:safeUser(u),csrf};}
  async function authenticate(req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('hv_session='))?.slice(11);if(!token)fail(401,'Ingresá para continuar.');const sess=(await db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hash(token),Date.now()));if(!sess)fail(401,'Tu sesión terminó. Volvé a ingresar.');const u=(await db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(sess.userId));if(!u)fail(401,'Cuenta no disponible.');return {u,sess};}
  async function body(req){
    if(!(req.headers['content-type']||'').startsWith('application/json'))fail(415,'La solicitud debe ser JSON.');
    let parsed;
    try{parsed=req.body;}catch{fail(400,'La solicitud no es válida.');}
    if(parsed!==undefined){if(Buffer.byteLength(JSON.stringify(parsed)||'')>32768)fail(413,'La solicitud supera el tamaño permitido.');}
    else{let s='';for await(const chunk of req){s+=chunk;if(Buffer.byteLength(s)>32768)fail(413,'La solicitud supera el tamaño permitido.');}try{parsed=JSON.parse(s||'{}');}catch{fail(400,'La solicitud no es válida.');}}
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))fail(400,'Se esperaba un objeto JSON.');return parsed;
  }
  function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
  async function route(req,res){
    const url=new URL(req.url,'http://localhost'),path=url.pathname,method=req.method;
    const origin=config.origin||`http://${req.headers.host}`;
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options',demo?'SAMEORIGIN':'DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors ${demo?"'self'":"'none'"}; base-uri 'self'; form-action 'self'`);
    if(config.production)res.setHeader('Strict-Transport-Security','max-age=31536000');
    res.setHeader('Cache-Control','no-store');
    if(method==='GET'&&path==='/health'){(await db.prepare('SELECT 1').get());return json(res,{ok:true,version:'1.2.1'});}
    if(!path.startsWith('/api/')){
      if(method!=='GET'&&method!=='HEAD')fail(405,'Método no permitido.');
      const folder=resolve(root,'public');
      let decoded;try{decoded=decodeURIComponent(path);}catch{fail(400,'Ruta inválida.');}
      const file=resolve(folder,'.'+(path==='/'?'/index.html':decoded));
      if(!file.startsWith(folder+'/'))fail(404,'Archivo no disponible.');
      let bytes;try{if(!statSync(file).isFile())fail(404,'Archivo no disponible.');bytes=readFileSync(file);}catch{fail(404,'Archivo no disponible.');}
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime});return res.end(method==='HEAD'?undefined:bytes);
    }
    if(method==='GET'&&path==='/api/config')return json(res,{demo,clinical,protocol:PROTOCOL});
    if(!['GET','HEAD'].includes(method)){
      if(req.headers.origin!==origin||req.headers['x-hv-request']!=='1')fail(403,'Origen de solicitud no permitido.');
    }
    if(method==='POST'&&(path==='/api/login'||path==='/api/demo')){
      const b=await body(req);
      if(path==='/api/demo') {if(!demo)fail(404,'Demostración no disponible.');if(!Object.hasOwn(ROLES,b.role))fail(400,'Perfil inválido.');return json(res,(await session(res,(await db.prepare('SELECT * FROM users WHERE email=?').get(b.role+'@demo.local')))));}
      const rateKey=store.consumeLoginAttempt?hash(String(b.email||'').trim().toLowerCase()):String(req.socket.remoteAddress);
      let attempt;
      if(store.consumeLoginAttempt){if(!await store.consumeLoginAttempt(rateKey))fail(429,'Demasiados intentos. Esperá 15 minutos.');}
      else{attempt=limiter.get(rateKey);if(!attempt||attempt.until<Date.now()){attempt={n:0,until:Date.now()+15*60000};if(limiter.size>10000)limiter.clear();limiter.set(rateKey,attempt);}if(attempt.n>=10)fail(429,'Demasiados intentos. Esperá 15 minutos.');}
      if(typeof b.email!=='string'||typeof b.password!=='string'||b.password.length>256)fail(400,'Revisá tus credenciales.');
      const u=(await db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(b.email.trim().toLowerCase()));
      const valid=passwordMatches(b.password,u?.password||'0000000000000000:'+('0'.repeat(128)));
      if(!u||!valid){if(attempt)attempt.n++;(await audit(null,'login_failed','account'));fail(401,'Correo o contraseña incorrectos.');}
      if(attempt)attempt.n=0;if(store.resetLoginAttempts)await store.resetLoginAttempts(rateKey);(await audit(u.id,'login','account'));return json(res,(await session(res,u)));
    }
    const {u,sess}=(await authenticate(req));
    if(!['GET','HEAD'].includes(method)&&req.headers['x-csrf-token']!==sess.csrf)fail(403,'La sesión necesita actualizarse. Recargá la página.');
    if(method==='GET'&&path==='/api/me')return json(res,{user:safeUser(u),csrf:sess.csrf});
    if(method==='POST'&&path==='/api/logout'){(await db.prepare('DELETE FROM sessions WHERE token=?').run(sess.token));res.setHeader('Set-Cookie',`hv_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${config.production?'; Secure':''}`);return json(res,{ok:true});}
    if(method==='POST'&&path==='/api/password'){
      const b=await body(req);if(typeof b.current!=='string'||!passwordMatches(b.current,u.password))fail(400,'La contraseña actual no coincide.');if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)fail(400,'Usá entre 12 y 128 caracteres.');await transaction(async()=>{(await db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(b.password),u.id));(await db.prepare('DELETE FROM sessions WHERE userId=?').run(u.id));(await audit(u.id,'password_changed',u.id));});return json(res,(await session(res,u)));
    }
    if(method==='GET'&&path==='/api/overview'){(await auditView(u,'list_view','students'));return json(res,{students:(await list(u)),schools:(await db.prepare('SELECT * FROM schools ORDER BY name').all()).filter(s=>u.role!=='teacher'||JSON.parse(u.schools).includes(s.id))});}
    if(method==='GET'&&path==='/api/export'){
      permit(u,['admin','clinician']);(await auditView(u,'aggregate_export','schools'));const students=(await list(u));const lines=[['Escuela','Registrados','Evaluados','Cumple criterio','Requiere evaluacion','Alerta comunicada','No evaluable','Anteojos pendientes','Anteojos entregados']];
      for(const school of (await db.prepare('SELECT * FROM schools ORDER BY name').all())){const a=students.filter(p=>p.schoolId===school.id);lines.push([school.name,a.length,a.filter(p=>p.status!=='pending').length,...['green','yellow','red','gray'].map(v=>a.filter(p=>p.status===v).length),a.filter(p=>p.orderStatus&&p.orderStatus!=='entregado').length,a.filter(p=>p.orderStatus==='entregado').length]);}
      res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="indicadores-salud-visual.csv"'});return res.end('\ufeff'+lines.map(r=>r.map(csvCell).join(';')).join('\r\n'));
    }
    if(method==='POST'&&path==='/api/students'){
      ready();permit(u,['admin','teacher','clinician']);const b=await body(req),errors=validateStudent(b);if(errors.length)fail(400,errors.join(' '));scoped(u,b);if(!(await db.prepare('SELECT id FROM schools WHERE id=?').get(b.schoolId)))fail(400,'Escuela inválida.');const uid=id();const data=pickStudent(b);
      await transaction(async()=>{(await db.prepare('INSERT INTO students (id,schoolId,documentHash,data) VALUES (?,?,?,?)').run(uid,b.schoolId,store.docHash(b.document),encrypt(data)));(await audit(u.id,'student_created',uid));});return json(res,{id:uid},201);
    }
    const sm=path.match(/^\/api\/students\/([\w-]+)$/),em=path.match(/^\/api\/students\/([\w-]+)\/events$/);
    if(sm){const p=(await getStudent(sm[1]));scoped(u,p);
      if(method==='GET'){const ev=(await getEvents(p.id));const v=studentView(u,p,ev);if(u.role==='workshop'&&!v.orderConsultId)fail(403,'No hay una orden disponible para el taller.');(await auditView(u,'student_view',p.id));let events=ev;if(u.role==='teacher')events=ev.filter(e=>['screen','followup'].includes(e.type));if(u.role==='workshop')events=ev.filter(e=>e.type==='order');return json(res,{student:v,events});}
      if(method==='PUT'){ready();permit(u,['admin','teacher','clinician']);const b=await body(req),errors=validateStudent(b);if(errors.length)fail(400,errors.join(' '));scoped(u,b);if(!(await db.prepare('SELECT id FROM schools WHERE id=?').get(b.schoolId)))fail(400,'Escuela inválida.');await transaction(async()=>{const r=(await db.prepare('UPDATE students SET schoolId=?,documentHash=?,data=?,version=version+1 WHERE id=? AND version=?').run(b.schoolId,store.docHash(b.document),encrypt(pickStudent(b)),p.id,b.version));if(!r.changes)fail(409,'Otra persona modificó la ficha. Recargá antes de guardar.');(await audit(u.id,'student_updated',p.id,{before:p,after:pickStudent(b)}));});return json(res,{ok:true});}
    }
    if(em&&method==='POST'){
      ready();const p=(await getStudent(em[1]));scoped(u,p);const b=await body(req);if(!p.consent)fail(400,'La ficha no tiene autorización documentada vigente.');if(b.expectedVersion!==p.version)fail(409,'La ficha cambió. Recargá para evitar duplicar registros.');
      let data;const type=b.type;
      if(type==='screen'){permit(u,['teacher','clinician','admin']);data=pickScreen(b.data||{});const errors=validateScreen(data);if(data.date<p.dob)errors.push('El tamizaje no puede ser anterior al nacimiento.');if(errors.length)fail(400,errors.join(' '));Object.assign(data,classify(data,p.dob));}
      else if(type==='consult'){permit(u,['clinician']);data=pickConsult(b.data||{});const errors=validateConsult(data);if(data.date<p.dob)errors.push('La consulta no puede ser anterior al nacimiento.');if(!u.license)errors.push('El perfil profesional necesita matrícula.');if(errors.length)fail(400,errors.join(' '));}
      else if(type==='order'){
        permit(u,['workshop','clinician','admin']);const d=b.data||{};const consultation=(await getEvents(p.id)).find(e=>e.type==='consult');if(consultation?.plan!=='anteojos'||d.consultId!==consultation.id)fail(409,'La orden no corresponde a la receta vigente. Actualizá la ficha.');
        const last=(await getEvents(p.id)).find(e=>e.type==='order'&&e.consultId===consultation.id);if(!['preparado','entregado'].includes(d.state)||last?.state==='entregado'||(d.state==='entregado'&&last?.state!=='preparado')||(d.state==='preparado'&&last))fail(400,'Primero registrá preparación y después entrega, una sola vez por orden.');
        if(!validDate(d.date)||d.date>today()||d.date<consultation.date||(last&&d.date<last.date))fail(400,'Revisá la fecha de la orden.');
        if(typeof d.frame!=='string'||d.frame.trim().length<2||d.frame.length>100||!['Policarbonato','Orgánico','Otro indicado por profesional'].includes(d.material))fail(400,'Indicá código del armazón y material.');
        if(d.state==='entregado'&&(!d.recipient||d.recipient.trim().length<3||d.recipient.length>100))fail(400,'Registrá quién recibió los anteojos.');
        data={consultId:d.consultId,state:d.state,date:d.date,frame:d.frame.trim(),material:d.material,recipient:d.state==='entregado'?d.recipient.trim():''};
      }
      else if(type==='followup'){
        permit(u,['teacher','clinician','admin']);const d=b.data||{};if(!validDate(d.date)||d.date>today()||d.date<p.dob||!['usa','irregular','no_usa','pendiente','derivacion_atendida','derivacion_pendiente'].includes(d.outcome)||typeof d.notes!=='string'||d.notes.trim().length<5||d.notes.length>1500)fail(400,'Revisá fecha, resultado y observaciones de seguimiento.');data={date:d.date,outcome:d.outcome,notes:d.notes.trim()};
      }else fail(400,'Tipo de registro no válido.');
      const eid=id();await transaction(async()=>{const r=(await db.prepare('UPDATE students SET version=version+1 WHERE id=? AND version=?').run(p.id,b.expectedVersion));if(!r.changes)fail(409,'La ficha cambió. Recargá para continuar.');(await db.prepare('INSERT INTO events (id,studentId,type,data,authorId,createdAt) VALUES (?,?,?,?,?,?)').run(eid,p.id,type,encrypt(data),u.id,new Date().toISOString()));(await audit(u.id,type+'_created',p.id,{eventId:eid}));});return json(res,{id:eid,...data},201);
    }
    if(method==='GET'&&path==='/api/admin'){permit(u,['admin']);return json(res,{users:(await db.prepare('SELECT * FROM users ORDER BY name').all()).map(safeUser),schools:(await db.prepare('SELECT * FROM schools ORDER BY name').all()),audit:(await db.prepare('SELECT a.id,a.action,a.subject,a.createdAt,u.name AS author FROM audit a LEFT JOIN users u ON u.id=a.authorId ORDER BY a.rowid DESC LIMIT 100').all())});}
    if(method==='POST'&&path==='/api/schools'){permit(u,['admin']);const b=await body(req);if(typeof b.name!=='string'||b.name.trim().length<3||b.name.length>100||typeof b.cue!=='string'||b.cue.length<3||b.cue.length>30||typeof b.location!=='string'||b.location.length<3||b.location.length>100)fail(400,'Completá nombre, CUE y localidad.');const sid=id();await transaction(async()=>{(await db.prepare('INSERT INTO schools VALUES (?,?,?,?)').run(sid,b.name.trim(),b.cue.trim(),b.location.trim()));(await audit(u.id,'school_created',sid));});return json(res,{id:sid},201);}
    if(method==='POST'&&path==='/api/users'){
      permit(u,['admin']);const b=await body(req);if(typeof b.email!=='string'||!/^\S+@\S+\.\S+$/.test(b.email)||b.email.length>150||typeof b.name!=='string'||b.name.trim().length<3||b.name.length>100||!Object.hasOwn(ROLES,b.role)||typeof b.password!=='string'||b.password.length<12||b.password.length>128||!Array.isArray(b.schools))fail(400,'Revisá nombre, correo, perfil y contraseña (12 a 128 caracteres).');
      if(b.role==='clinician'&&(typeof b.license!=='string'||b.license.trim().length<3||b.license.length>80))fail(400,'El profesional debe tener matrícula registrada.');
      if(b.role==='teacher'){if(!b.schools.length)fail(400,'Asigná al menos una escuela válida al docente.');for(const s of b.schools)if(typeof s!=='string'||!(await db.prepare('SELECT id FROM schools WHERE id=?').get(s)))fail(400,'Asigná al menos una escuela válida al docente.');}
      let uid;await transaction(async()=>{uid=(await store.addUser({...b,email:b.email.trim(),name:b.name.trim(),license:b.role==='clinician'?b.license.trim():'',schools:b.role==='teacher'?b.schools:[]}));(await audit(u.id,'user_created',uid));});return json(res,{id:uid},201);
    }
    const um=path.match(/^\/api\/users\/([\w-]+)$/);
    if(um&&method==='PATCH'){
      permit(u,['admin']);const target=(await db.prepare('SELECT * FROM users WHERE id=?').get(um[1]));if(!target)fail(404,'Cuenta no encontrada.');const b=await body(req);if(target.id===u.id)fail(400,'Para tu propia cuenta usá Cambiar contraseña.');
      if(typeof b.active!=='boolean'&&typeof b.password!=='string')fail(400,'Indicá una modificación válida.');if(b.password&&(b.password.length<12||b.password.length>128))fail(400,'Usá entre 12 y 128 caracteres.');
      await transaction(async()=>{if(typeof b.active==='boolean')(await db.prepare('UPDATE users SET active=? WHERE id=?').run(b.active?1:0,target.id));if(b.password)(await db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(b.password),target.id));(await db.prepare('DELETE FROM sessions WHERE userId=?').run(target.id));(await audit(u.id,'user_updated',target.id,{active:b.active,passwordReset:!!b.password}));});return json(res,{ok:true});
    }
    fail(404,'La acción solicitada no existe.');
  }
  const run=(req,res)=>route(req,res).catch(e=>{if(res.headersSent){res.end();return;}let status=e.status||500;let message=e.status?e.message:'No pudimos completar la operación. Intentá de nuevo.';if(e.code==='23505'||String(e.message).includes('UNIQUE constraint failed')){status=409;message='Ya existe un registro con ese DNI, correo o CUE.';}if(['40001','40P01'].includes(e.code)){status=409;message='Hubo una modificación simultánea. Recargá antes de guardar.';}if(e.code==='23503'){status=400;message='El registro relacionado ya no está disponible.';}if(status===500)console.error('Error interno:',e.code||e.name);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:message}));});
  // SQLite local: serializar solicitudes para no intercalar transacciones asíncronas.
  let pending=Promise.resolve();
  const handler=store.kind==='postgres'?run:(req,res)=>{const task=pending.then(()=>run(req,res));pending=task.catch(()=>{});return task;};
  const server=http.createServer(handler);
  server.requestTimeout=15000;server.headersTimeout=10000;
  return {server,store,handler,close:async()=>{if(server.listening)await new Promise((done,reject)=>{server.close(e=>e?reject(e):done());server.closeIdleConnections();});await db.close();}};
}
function pickStudent(b){return {name:b.name.trim(),dob:b.dob,document:b.document||'',grade:b.grade.trim(),guardian:b.guardian.trim(),contact:b.contact.trim(),consent:b.consent,consentDate:b.consent?b.consentDate:'',consentRef:b.consent?b.consentRef.trim():''};}
function pickScreen(d){return {date:d.date,od:d.unable?null:d.od,oi:d.unable?null:d.oi,binocular:d.binocular??null,unable:d.unable,conditions:d.conditions,chart:d.chart,distance:d.distance,correction:d.correction,symptoms:d.symptoms,alerts:d.alerts,alertContact:d.alertContact||'',notes:d.notes??''};}
function pickConsult(d){return {date:d.date,diagnosis:d.diagnosis,notes:d.notes||'',plan:d.plan,nextDate:d.nextDate,referral:d.plan==='derivacion'?d.referral:'',rx:d.plan==='anteojos'?{od:d.rx?.od,oi:d.rx?.oi}:null};}
