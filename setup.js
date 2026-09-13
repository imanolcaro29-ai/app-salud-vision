import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {createStore} from '../server/store.js';
import {dataKey} from '../server/runtime.js';
const rl=createInterface({input:stdin,output:stdout});
try{
  if(existsSync('.env')){process.loadEnvFile('.env');}
  if(process.env.DATABASE_URL)throw Error('En modo Supabase configurá las variables BOOTSTRAP_ADMIN y ejecutá npm start. No se crea una base SQLite.');
  let key=(process.env.DATA_KEY||process.env.DATA_SECRET)?dataKey():undefined;
  if(!key){
    if(existsSync('.env'))throw Error('.env ya existe pero no tiene DATA_KEY. No se sobrescribió. Si hay una base anterior, recuperá su clave.');
    key=randomBytes(32).toString('hex');
    writeFileSync('.env',`PORT=3000\nHOST=127.0.0.1\nNODE_ENV=development\nAPP_ORIGIN=http://localhost:3000\nDB_PATH=./data/salud-visual.sqlite\nDATA_KEY=${key}\nDEMO_MODE=false\nCLINICAL_ENABLED=false\n`,{mode:0o600});
  }
  const store=createStore(process.env.DB_PATH||'./data/salud-visual.sqlite',key);
  try{
    if(store.db.prepare('SELECT COUNT(*) n FROM users').get().n){console.log('La base ya tiene cuentas. Gestioná usuarios desde Administración.');}
    else {
      console.log('Creación del administrador. Realizá este paso en un equipo privado.');
      const name=(await rl.question('Nombre y apellido: ')).trim();
      const email=(await rl.question('Correo de acceso: ')).trim().toLowerCase();
      // Una clave generada evita captura visible de la contraseña en el prompt.
      const password=randomBytes(18).toString('base64url')+'aA1!';
      if(name.length<3||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>150)throw Error('Nombre o correo inválido. Volvé a ejecutar npm run setup.');
      const uid=store.addUser({name,email,role:'admin',password});store.audit(uid,'user_created',uid);
      console.log('\nCuenta creada. Guardá esta contraseña en un gestor; se muestra una sola vez:\n'+password+'\n');
      console.log('Podés cambiarla después de ingresar. La clave DATA_KEY está en .env: guardá una copia segura.');
    }
  }finally{store.db.close();}
  console.log('Iniciá con npm start. El registro real requiere habilitación institucional: ver docs/INSTALACION.md.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{rl.close();}
