import {randomBytes,randomUUID,createCipheriv,createDecipheriv,createHmac,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
export const id=()=>randomUUID();
export const hash=text=>createHash('sha256').update(text).digest('hex');
export function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function passwordMatches(password,stored){try{const [salt,h]=stored.split(':');const a=Buffer.from(h,'hex'),b=scryptSync(password,salt,64);return a.length===b.length&&timingSafeEqual(a,b);}catch{return false;}}
export function encryption(keyHex){
  if(!/^[a-f\d]{64}$/i.test(keyHex||''))throw Error('La clave de cifrado debe contener 64 caracteres hexadecimales.');
  const key=Buffer.from(keyHex,'hex');
  function encrypt(data){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const out=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);return [iv.toString('base64'),cipher.getAuthTag().toString('base64'),out.toString('base64')].join('.');}
  function decrypt(data){const [iv,tag,out]=data.split('.').map(x=>Buffer.from(x,'base64'));const decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);return JSON.parse(Buffer.concat([decipher.update(out),decipher.final()]).toString('utf8'));}
  return {encrypt,decrypt,docHash:doc=>doc?createHmac('sha256',key).update(doc).digest('hex'):null};
}
