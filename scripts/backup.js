import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
if(process.env.DATABASE_URL){console.error('Supabase requiere una copia PostgreSQL: consultá docs/OPERACION.md.');process.exit(1);}
const path=process.env.DB_PATH||'./data/salud-visual.sqlite';
mkdirSync('backups',{recursive:true,mode:0o700});
const out=`backups/salud-visual-${new Date().toISOString().replaceAll(':','-')}.sqlite`;
const db=new DatabaseSync(path,{readOnly:true});
try{await backup(db,out);chmodSync(out,0o600);console.log('Copia consistente creada: '+out);console.log('Conservá DATA_KEY o DATA_SECRET por separado. Protegé y trasladá la copia fuera del servidor.');}finally{db.close();}
