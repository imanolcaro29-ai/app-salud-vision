import {DEFAULT_UI} from '../public/shared/preferences.js';
export function preferencesStore(store,defaultClinical){
 async function read(){const row=await store.db.prepare('SELECT value FROM meta WHERE key=?').get('app_preferences');const saved=row?store.decrypt(row.value):{};return {version:saved.version||0,ui:{...DEFAULT_UI,...saved.ui},clinical:saved.clinical??{enabled:defaultClinical,configured:false}};}
 async function write(next){await store.db.prepare('INSERT INTO meta (key,value) VALUES (?,?) ON CONFLICT (key) DO UPDATE SET value=excluded.value').run('app_preferences',store.encrypt(next));return next;}
 return {read,write};
}
