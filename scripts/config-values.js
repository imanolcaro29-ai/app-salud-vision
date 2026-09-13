// Compartido por el configurador local y sus pruebas. No realiza solicitudes de red.
(function(scope){
  function values({connection,password,name,email,adminPassword,secret},random=()=>{
    return Array.from(scope.crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  }){
    const text=String(connection||'').trim();
    if(!text)throw Error('Pegá la conexión de Supabase: Connect → Transaction pooler.');
    if(text.includes('[YOUR-PASSWORD]')&&!password)throw Error('Completá la contraseña de la base de Supabase.');
    let url;try{url=new URL(text.replace('[YOUR-PASSWORD]','pendiente'));}catch{throw Error('La conexión debe empezar con postgresql://. Copiala desde Connect.');}
    if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||!url.username||url.port!=='6543')throw Error('Elegí Transaction pooler, con puerto 6543, en Supabase.');
    if(password)url.password=encodeURIComponent(password);
    if(!url.password)throw Error('Falta la contraseña de la base.');
    try{decodeURIComponent(url.password);}catch{throw Error('La contraseña de la URL no está bien codificada. Pegala en el campo Contraseña de la base.');}
    name=String(name||'').trim();email=String(email||'').trim().toLowerCase();
    if(name.length<3||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>150)throw Error('Completá tu nombre y correo de acceso.');
    if(typeof adminPassword!=='string'||adminPassword.length<12||adminPassword.length>128)throw Error('Tu contraseña para la app debe tener entre 12 y 128 caracteres.');
    if(secret&&secret.length<32)throw Error('Conservá el DATA_SECRET completo, de al menos 32 caracteres.');
    return {DATABASE_URL:url.href,DATA_SECRET:secret||random(),BOOTSTRAP_ADMIN_NAME:name,BOOTSTRAP_ADMIN_EMAIL:email,BOOTSTRAP_ADMIN_PASSWORD:adminPassword,CLINICAL_ENABLED:'false'};
  }
  scope.HVConfiguration={values};
})(globalThis);
