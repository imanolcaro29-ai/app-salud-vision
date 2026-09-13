import {id} from './store.js';
import {classify,today} from '../shared/domain.js';
export function seedDemo(s) {
  if(s.db.prepare('SELECT COUNT(*) n FROM users').get().n) return;
  const school1='esc-demo-1',school2='esc-demo-2';
  s.db.prepare('INSERT INTO schools VALUES (?,?,?,?)').run(school1,'Escuela del Lapacho · DEMO','DEMO001','Sáenz Peña, Chaco');
  s.db.prepare('INSERT INTO schools VALUES (?,?,?,?)').run(school2,'Escuela Los Girasoles · DEMO','DEMO002','Zona rural, Chaco');
  const ids={};
  for(const [role,name] of Object.entries({admin:'Equipo coordinador',teacher:'Docente de prueba',clinician:'Profesional de prueba',workshop:'Taller de prueba'})) ids[role]=s.addUser({email:role+'@demo.local',name,role,schools:role==='teacher'?[school1]:[],password:'Solo-demostracion-2026!',license:role==='clinician'?'Matrícula ficticia DEMO':''});
  const names=['Alma Ejemplo','Benjamín Ejemplo','Catalina Ejemplo','Dante Ejemplo','Elena Ejemplo','Felipe Ejemplo','Guadalupe Ejemplo','Hugo Ejemplo','Inés Ejemplo','Joaquín Ejemplo','Lola Ejemplo','Mateo Ejemplo'];
  names.forEach((name,i)=>{
    const uid=id(),schoolId=i<8?school1:school2;
    const p={name,dob:`${new Date().getFullYear()-7-i%6}-02-15`,document:'',grade:`${i%6+1}° A`,guardian:'Adulto ficticio '+(i+1),contact:'Contacto de demostración',consent:true,consentDate:today(),consentRef:'AUT-DEMO-'+(i+1)};
    s.db.prepare('INSERT INTO students (id,schoolId,documentHash,data) VALUES (?,?,?,?)').run(uid,schoolId,null,s.encrypt(p));
    if(i<9){const screen={date:today(),od:i%3===0?50:20,oi:20,binocular:null,unable:i===7,conditions:true,distance:3,chart:'Sloan',correction:'no usa anteojos',symptoms:[],alerts:[],alertContact:'',notes:i===7?'No comprendió la consigna en el ensayo.':''};Object.assign(screen,classify(screen,p.dob));
      s.db.prepare('INSERT INTO events VALUES (?,?,?,?,?,?)').run(id(),uid,'screen',s.encrypt(screen),ids.teacher,new Date(Date.now()-86400000).toISOString());
    }
    if(i===0||i===3){const consultId=id();const c={date:today(),diagnosis:'Evaluación ficticia: defecto refractivo',notes:'Caso de demostración, sin valor asistencial.',plan:'anteojos',rx:{od:{sphere:-1,cylinder:-0.5,axis:90},oi:{sphere:-0.75,cylinder:0,axis:0}},nextDate:today(),referral:''};s.db.prepare('INSERT INTO events VALUES (?,?,?,?,?,?)').run(consultId,uid,'consult',s.encrypt(c),ids.clinician,new Date().toISOString());}
  });
}
