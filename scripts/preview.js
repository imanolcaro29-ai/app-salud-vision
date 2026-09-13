// Vista previa de desarrollo. Sólo datos ficticios, en una base separada.
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {createApp} from '../server/app.js';
mkdirSync('./data',{recursive:true,mode:0o700});
const keyFile='./data/preview.key';
if(!existsSync(keyFile))writeFileSync(keyFile,randomBytes(32).toString('hex'),{mode:0o600});
const args=process.argv.slice(2),port=Number(args[args.indexOf('--port')+1])||Number(process.env.PORT)||4173;
const app=createApp({demo:true,dbPath:'./data/preview.sqlite',key:readFileSync(keyFile,'utf8').trim()});
app.server.listen(port,'0.0.0.0',()=>console.log(`Vista previa de datos ficticios en puerto ${port}`));
const stop=()=>app.close().then(()=>process.exit(0));process.on('SIGTERM',stop);process.on('SIGINT',stop);
