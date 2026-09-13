import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
test('El PNG de Lupi está completo y contiene todos sus píxeles',()=>{
  const file=readFileSync(new URL('../public/assets/lupi.png',import.meta.url));
  assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  let offset=8,ended=false,width=0,height=0;const compressed=[];
  while(offset+12<=file.length){
    const length=file.readUInt32BE(offset),type=file.toString('ascii',offset+4,offset+8);
    assert(offset+length+12<=file.length,'Hay un fragmento PNG incompleto');
    const data=file.subarray(offset+8,offset+8+length);
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.equal(data[9],2);assert.equal(data[12],0);}
    if(type==='IDAT')compressed.push(data);
    offset+=length+12;
    if(type==='IEND'){ended=true;break;}
  }
  assert(ended,'Falta el final del archivo PNG');
  assert.equal(inflateSync(Buffer.concat(compressed)).length,height*(width*3+1));
});
