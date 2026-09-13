import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createCipheriv,createDecipheriv,createHmac,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

export const id = () => randomUUID();
export const hash = text => createHash('sha256').update(text).digest('hex');
export function passwordHash(password) {const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function passwordMatches(password,stored) {
  try {const [salt,h]=stored.split(':');const a=Buffer.from(h,'hex'), b=scryptSync(password,salt,64);return a.length===b.length&&timingSafeEqual(a,b);} catch{return false;}
}
export function createStore(path, keyHex) {
  if(!/^[a-f\d]{64}$/i.test(keyHex||'')) throw Error('DATA_KEY debe ser una clave hexadecimal de 32 bytes. Ejecutá npm run setup.');
  if(path!==':memory:') mkdirSync(dirname(path),{recursive:true,mode:0o700});
  const db=new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL,schools TEXT NOT NULL,password TEXT NOT NULL,license TEXT NOT NULL DEFAULT '',active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY,name TEXT NOT NULL,cue TEXT NOT NULL UNIQUE,location TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY,schoolId TEXT NOT NULL REFERENCES schools(id),documentHash TEXT UNIQUE,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY,studentId TEXT NOT NULL REFERENCES students(id),type TEXT NOT NULL,data TEXT NOT NULL,authorId TEXT NOT NULL REFERENCES users(id),createdAt TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS event_student ON events(studentId,createdAt);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY,authorId TEXT,action TEXT NOT NULL,subject TEXT NOT NULL,createdAt TEXT NOT NULL,data TEXT NOT NULL);
  `);
  const key=Buffer.from(keyHex,'hex');
  function encrypt(data){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const out=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);return [iv.toString('base64'),cipher.getAuthTag().toString('base64'),out.toString('base64')].join('.');}
  function decrypt(data){const [iv,tag,out]=data.split('.').map(x=>Buffer.from(x,'base64'));const decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);return JSON.parse(Buffer.concat([decipher.update(out),decipher.final()]).toString('utf8'));}
  const marker=db.prepare('SELECT value FROM meta WHERE key=?').get('key_check');
  if(marker) {try{if(decrypt(marker.value)!=='HV-1')throw Error();}catch{db.close();throw Error('DATA_KEY no corresponde a esta base. Recuperá la clave original; no generes otra.');}}
  else db.prepare('INSERT INTO meta VALUES (?,?)').run('key_check',encrypt('HV-1'));
  const docHash=doc=>doc?createHmac('sha256',key).update(doc).digest('hex'):null;
  function audit(authorId,action,subject,data={}) {db.prepare('INSERT INTO audit VALUES (?,?,?,?,?,?)').run(id(),authorId||null,action,subject,new Date().toISOString(),encrypt(data));}
  function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const out=fn();db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}
  function getStudent(studentId){const s=db.prepare('SELECT * FROM students WHERE id=?').get(studentId);return s?{...decrypt(s.data),id:s.id,schoolId:s.schoolId,version:s.version}:null;}
  function getEvents(studentId){return db.prepare('SELECT e.*,u.name AS author,u.license FROM events e JOIN users u ON u.id=e.authorId WHERE studentId=? ORDER BY createdAt DESC,e.rowid DESC').all(studentId).map(e=>({id:e.id,type:e.type,...decrypt(e.data),author:e.author,authorId:e.authorId,license:e.license,createdAt:e.createdAt})).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.createdAt.localeCompare(a.createdAt));}
  function addUser({email,name,role,schools=[],password,license=''}){const uid=id();db.prepare('INSERT INTO users (id,email,name,role,schools,password,license) VALUES (?,?,?,?,?,?,?)').run(uid,email.toLowerCase(),name,role,JSON.stringify(schools),passwordHash(password),license);return uid;}
  return {db,encrypt,decrypt,docHash,audit,transaction,getStudent,getEvents,addUser};
}
