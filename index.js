import {createApp} from './app.js';
import {runtimeConfig,bootstrapAdmin,bootstrapPostgresAdmin} from './runtime.js';
try{
  const config=runtimeConfig();
  if(config.databaseUrl){const {createPostgresStore}=await import('./postgres-store.js');config.store=await createPostgresStore({url:config.databaseUrl,key:config.key,ca:config.ca});await bootstrapPostgresAdmin(config.store);}
  const app=createApp(config);
  if(!config.demo&&!config.store&&bootstrapAdmin(app.store))console.log('Primera cuenta administrativa creada. Ingresá con las credenciales configuradas en el alojamiento.');
  app.server.listen(config.port,config.host,()=>console.log(`Salud visual disponible en ${config.origin||'http://localhost:'+config.port} (${config.demo?'DEMO: datos ficticios':'registro institucional'})`));
  const stop=()=>app.close().then(()=>process.exit(0));process.on('SIGINT',stop);process.on('SIGTERM',stop);
}catch(e){console.error(e.message);process.exit(1);}
