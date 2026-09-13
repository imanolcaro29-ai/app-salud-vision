import {createHash} from 'node:crypto';

export function dataKey(env=process.env) {
  if(env.DATA_KEY) {
    if(!/^[a-f\d]{64}$/i.test(env.DATA_KEY))throw Error('DATA_KEY debe contener 64 caracteres hexadecimales.');
    return env.DATA_KEY;
  }
  if(typeof env.DATA_SECRET==='string'&&env.DATA_SECRET.length>=32) {
    return createHash('sha256').update('HV-DATA-KEY-v1\0').update(env.DATA_SECRET).digest('hex');
  }
  throw Error('Falta DATA_KEY o DATA_SECRET. Completá la configuración indicada en EMPEZAR_AQUI.md.');
}

export function runtimeConfig(env=process.env) {
  const production=env.NODE_ENV==='production',demo=env.DEMO_MODE==='true';
  let origin=env.APP_ORIGIN||(env.VERCEL&&env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+env.VERCEL_PROJECT_PRODUCTION_URL:'')||(env.RENDER==='true'?env.RENDER_EXTERNAL_URL:'');
  if(origin) {
    let parsed;try{parsed=new URL(origin);}catch{throw Error('APP_ORIGIN no es una URL válida.');}
    if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)throw Error('APP_ORIGIN debe ser una URL sin ruta ni credenciales.');
    origin=parsed.origin;
  }
  if(production&&(!origin?.startsWith('https://')||demo))throw Error('Producción requiere una URL HTTPS y DEMO_MODE=false.');
  const port=Number(env.PORT||3000);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT debe ser un puerto entre 1 y 65535.');
  if(env.VERCEL&&!env.DATABASE_URL)throw Error('Completá DATABASE_URL con la conexión PostgreSQL de Supabase.');
  if(env.DATABASE_URL&&demo)throw Error('El modo demo utiliza exclusivamente la base local.');
  return {production,demo,clinical:env.CLINICAL_ENABLED==='true',origin:origin||undefined,
    port,host:env.HOST||(production?'0.0.0.0':'127.0.0.1'),
    dbPath:env.DB_PATH||'./data/salud-visual.sqlite',databaseUrl:env.DATABASE_URL,ca:env.DATABASE_CA,key:dataKey(env)};
}

export async function bootstrapPostgresAdmin(store,env=process.env){
  return store.startupLock(async()=>{
    if(Number((await store.db.prepare('SELECT COUNT(*) n FROM users').get()).n))return false;
    const name=env.BOOTSTRAP_ADMIN_NAME?.trim(),email=env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase(),password=env.BOOTSTRAP_ADMIN_PASSWORD;
    if(!name||name.length<3||name.length>100||!email||!/^\S+@\S+\.\S+$/.test(email)||email.length>150||typeof password!=='string'||password.length<12||password.length>128)throw Error('Completá nombre, correo y contraseña inicial de administración en Vercel.');
    const uid=await store.addUser({name,email,password,role:'admin'});
    await store.audit(uid,'user_created',uid);
    return true;
  });
}

export function bootstrapAdmin(store,env=process.env) {
  return store.transaction(()=>{
    // Idempotente: una actualización nunca cambia contraseñas ni reabre cuentas.
    if(store.db.prepare('SELECT COUNT(*) n FROM users').get().n)return false;
    const name=env.BOOTSTRAP_ADMIN_NAME?.trim(),email=env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase(),password=env.BOOTSTRAP_ADMIN_PASSWORD;
    if(!name||name.length<3||name.length>100||!email||!/^\S+@\S+\.\S+$/.test(email)||email.length>150||typeof password!=='string'||password.length<12||password.length>128) {
      throw Error('Primera instalación: completá BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD (12 a 128 caracteres), o ejecutá npm run setup.');
    }
    const uid=store.addUser({name,email,password,role:'admin'});
    store.audit(uid,'user_created',uid);
    return true;
  });
}
