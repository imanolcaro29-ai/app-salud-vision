export const PROTOCOL = 'HV-1.0';
export const ACUITIES = [10, 12.5, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 400];
export const ROLES = {admin:'Administración',teacher:'Docente',clinician:'Profesional',workshop:'Óptica / taller'};
export const STATUS = {
  pending:{label:'Sin tamizaje',tone:'gray'},
  green:{label:'Cumple criterio',tone:'green'},
  yellow:{label:'Requiere evaluación',tone:'yellow'},
  red:{label:'Alerta comunicada',tone:'red'},
  gray:{label:'No evaluable',tone:'gray'}
};
export const SYMPTOMS = {board:'Dificultad para ver el pizarrón',near:'Se acerca mucho al cuaderno',headache:'Cefalea frecuente',squint:'Entrecierra los ojos',family:'Antecedente familiar ocular',alignment:'Desviación ocular observada'};
export const ALERTS = {sudden:'Disminución brusca de la visión',pain:'Dolor ocular intenso',injury:'Traumatismo o exposición química',white:'Reflejo blanco observado en la pupila'};
export const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';
export const today = (now=new Date()) => {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:APP_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const value=type=>parts.find(p=>p.type===type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};
export function validDate(value) {
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value+'T12:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
}
export function ageMonths(dob, date=today()) {
  if(!validDate(dob)||!validDate(date)) return NaN;
  const [y,m,d]=dob.split('-').map(Number), [yy,mm,dd]=date.split('-').map(Number);
  return (yy-y)*12+mm-m-(dd<d?1:0);
}
export function classify(screen, dob) {
  if(screen.alerts?.length) return {status:'red',reason:'Signo de alarma registrado. Contactar al equipo sanitario sin esperar el operativo.',threshold:null,protocol:PROTOCOL};
  const age=ageMonths(dob, screen.date);
  if(!Number.isFinite(age)||age<36||age>=216) return {status:'gray',reason:'Edad fuera del alcance de este protocolo (3 a 17 años). Evaluación por el equipo sanitario.',threshold:null,protocol:PROTOCOL};
  if(screen.unable || !screen.conditions || !ACUITIES.includes(screen.od)||!ACUITIES.includes(screen.oi)) return {status:'gray',reason:'Prueba incompleta o condiciones no verificadas. Organizar repetición supervisada o evaluación profesional.',threshold:null,protocol:PROTOCOL};
  const threshold=age<48?50:age<60?40:32;
  const reasons=[];
  if(screen.od>threshold||screen.oi>threshold) reasons.push(`No alcanza 20/${threshold} en uno o ambos ojos`);
  // Diferencia de 0,2 logMAR: regla operativa explícita que requiere aprobación local.
  if(Math.abs(Math.log10(screen.od/screen.oi))>=0.19) reasons.push('Diferencia entre ojos cercana a dos líneas logMAR o mayor');
  if(screen.symptoms?.length) reasons.push('Observaciones que requieren valoración profesional');
  return {status:reasons.length?'yellow':'green',reason:reasons.length?reasons.join('. ')+'.':'Alcanza el umbral en ambos ojos y no se registraron observaciones. Este resultado no descarta toda enfermedad ocular.',threshold,protocol:PROTOCOL};
}
export function validateStudent(s) {
  const errors=[];
  if(typeof s.name!=='string'||s.name.trim().length<3||s.name.length>100) errors.push('Ingresá nombre y apellido (3 a 100 caracteres).');
  if(!validDate(s.dob)||s.dob>today()||ageMonths(s.dob)>240) errors.push('Revisá la fecha de nacimiento.');
  if(s.document && (typeof s.document!=='string'||!/^\d{7,9}$/.test(s.document))) errors.push('El DNI debe tener entre 7 y 9 dígitos, sin puntos.');
  if(typeof s.schoolId!=='string'||!s.schoolId||s.schoolId.length>100) errors.push('Seleccioná una escuela.');
  if(typeof s.grade!=='string'||!s.grade.trim()||s.grade.length>40) errors.push('Indicá grado y sección.');
  if(typeof s.guardian!=='string'||s.guardian.trim().length<3||s.guardian.length>100) errors.push('Ingresá el nombre del adulto responsable.');
  if(typeof s.contact!=='string'||s.contact.length<6||s.contact.length>80) errors.push('Ingresá un contacto del adulto responsable.');
  if(typeof s.consent!=='boolean') errors.push('Indicá el estado de autorización.');
  if(s.consent && (!validDate(s.consentDate)||s.consentDate>today()||typeof s.consentRef!=='string'||s.consentRef.trim().length<3||s.consentRef.length>120)) errors.push('La autorización necesita fecha y referencia del documento resguardado.');
  return errors;
}
export function validateScreen(s) {
  const errors=[];
  if(!validDate(s.date)||s.date>today()) errors.push('La fecha del tamizaje no puede ser futura.');
  if(!Array.isArray(s.symptoms)||s.symptoms.some(x=>!Object.hasOwn(SYMPTOMS,x))) errors.push('Observaciones inválidas.');
  if(!Array.isArray(s.alerts)||s.alerts.some(x=>!Object.hasOwn(ALERTS,x))) errors.push('Alertas inválidas.');
  if(typeof s.unable!=='boolean'||typeof s.conditions!=='boolean') errors.push('Confirmá las condiciones de evaluación.');
  if(!s.unable && (!ACUITIES.includes(s.od)||!ACUITIES.includes(s.oi))) errors.push('Registrá la agudeza visual de cada ojo.');
  if(s.binocular!==null && s.binocular!==undefined && !ACUITIES.includes(s.binocular)) errors.push('Resultado binocular inválido.');
  if(!['Sloan','HOTV','LEA','E direccional','C de Landolt'].includes(s.chart)) errors.push('Seleccioná la cartilla utilizada.');
  if(typeof s.distance!=='number'||s.distance<1||s.distance>6) errors.push('La distancia debe estar entre 1 y 6 metros, según la cartilla.');
  if(!['con corrección habitual','sin corrección','no usa anteojos'].includes(s.correction)) errors.push('Registrá el uso de corrección.');
  if(typeof s.notes!=='string'||s.notes.length>1500) errors.push('Las notas admiten hasta 1500 caracteres.');
  if(s.unable && s.notes.trim().length<5) errors.push('Explicá por qué no pudo evaluarse.');
  if(s.alerts?.length && (!s.alertContact||s.alertContact.length<5||s.alertContact.length>200)) errors.push('Registrá a quién se comunicó la alerta y la indicación recibida.');
  return errors;
}
export function validateConsult(c) {
  const errors=[];
  if(!validDate(c.date)||c.date>today()) errors.push('Fecha de consulta inválida.');
  if(typeof c.diagnosis!=='string'||c.diagnosis.trim().length<3||c.diagnosis.length>800) errors.push('Registrá la impresión diagnóstica profesional.');
  if(typeof c.notes!=='string'||c.notes.length>2500) errors.push('Notas demasiado extensas.');
  if(!['control','anteojos','derivacion'].includes(c.plan)) errors.push('Seleccioná una conducta.');
  if(!validDate(c.nextDate)||c.nextDate<c.date) errors.push('Indicá una fecha de seguimiento igual o posterior a la consulta.');
  if(c.plan==='derivacion'&&(!c.referral||c.referral.trim().length<5||c.referral.length>500)) errors.push('Indicá destino y motivo de derivación.');
  if(c.plan==='anteojos') {
    for(const eye of ['od','oi']) {
      const p=c.rx?.[eye];
      if(!p||!Number.isFinite(p.sphere)||p.sphere< -30||p.sphere>30||!Number.isFinite(p.cylinder)||p.cylinder< -15||p.cylinder>15||!Number.isInteger(p.axis)||p.axis<0||p.axis>180) errors.push(`Receta ${eye.toUpperCase()}: esfera -30 a +30, cilindro -15 a +15 y eje 0 a 180.`);
    }
  }
  return errors;
}
export function csvCell(value) {const s=String(value??'');return '"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';}
