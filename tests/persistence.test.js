import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {backup} from 'node:sqlite';
import {createApp} from '../server/app.js';
import {createStore} from '../server/store.js';
test('Reinicio y restauración conservan datos cifrados y usuarios',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'hv-backup-')),key=randomBytes(32).toString('hex'),path=join(dir,'source.sqlite'),target=join(dir,'backup.sqlite');
  try{
    let app=createApp({demo:true,key,dbPath:path});
    const pupil=app.store.db.prepare('SELECT id FROM students LIMIT 1').get().id;
    const before=app.store.getStudent(pupil);
    await backup(app.store.db,target);
    app.store.db.close();
    app=createApp({demo:true,key,dbPath:path});
    assert.deepEqual(app.store.getStudent(pupil),before);app.store.db.close();
    const restored=createStore(target,key);assert.deepEqual(restored.getStudent(pupil),before);assert.equal(restored.db.prepare('SELECT COUNT(*) n FROM users').get().n,4);restored.db.close();
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('Base demo no puede convertirse accidentalmente en base real',()=>{
  const dir=mkdtempSync(join(tmpdir(),'hv-mode-')),key=randomBytes(32).toString('hex'),path=join(dir,'data.sqlite');
  try{const app=createApp({demo:true,key,dbPath:path});app.store.db.close();assert.throws(()=>createApp({demo:false,key,dbPath:path}),/modos real y demo/);}finally{rmSync(dir,{recursive:true,force:true});}
});
