import {createApp} from './app.js';
import {runtimeConfig,bootstrapPostgresAdmin} from './runtime.js';
import {createPostgresStore} from './postgres-store.js';

export function cloudHandler({env=process.env,openStore=createPostgresStore}={}){
  let pending;
  async function initialize(){
    const config=runtimeConfig({...env,NODE_ENV:'production',VERCEL:'1'});
    const store=await openStore({url:config.databaseUrl,key:config.key,ca:config.ca});
    try{await bootstrapPostgresAdmin(store,env);return createApp({...config,store});}
    catch(e){await store.db.close();throw e;}
  }
  return async(req,res)=>{
    try{
      // Vercel reescribe todas las rutas API a una única función.
      const url=new URL(req.url,'https://local.invalid');
      if(url.pathname==='/api/index'){
        const route=url.searchParams.get('hv_route')||req.query?.hv_route;
        if(typeof route!=='string'||!route||!/^[-\w/]+$/.test(route)){
          res.writeHead(404,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Ruta no disponible.'}));return;
        }
        req.url='/api/'+route;
      }
      if(!pending)pending=initialize().catch(e=>{pending=undefined;throw e;});
      const app=await pending;
      await app.handler(req,res);
    }catch(e){
      console.error('Inicialización de salud visual:',e.code||e.name);
      if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(JSON.stringify({error:'El espacio de salud visual todavía no está disponible. El equipo coordinador debe revisar la configuración de conexión.',code:'CONFIGURACION_PENDIENTE'}));
    }
  };
}
