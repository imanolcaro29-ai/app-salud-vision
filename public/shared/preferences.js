export const UI_FIELDS={
 brandName:['Nombre de la aplicación','Haciendo la Vista Gorda',70],brandSubtitle:['Descripción bajo el nombre','Salud visual escolar',90],
 footerText:['Frase del menú','Ver bien también es aprender mejor.',120],teamText:['Firma del equipo','Un proyecto de estudiantes de Medicina · UNCAus',140],
 loginTitle:['Título del ingreso','Bienvenido a tu espacio.',100],loginIntro:['Texto del ingreso','Ingresá para acompañar cada mirada.',220],loginStory:['Título de la portada','Pequeñas miradas. Grandes futuros.',100],loginCaption:['Descripción de la portada','Acompañamos la salud visual de la escuela a la consulta, y de la consulta a cada nuevo día.',260],loginButton:['Botón de ingreso','Ingresar',35],loginFooter:['Ayuda para conseguir una cuenta','Acceso reservado al equipo autorizado. Si necesitás una cuenta, contactá a la coordinación de tu institución.',260],
 homeTitle:['Título principal del inicio','Una mirada a tu comunidad',100],homeIntro:['Descripción del inicio','Todo lo necesario para acompañar la salud visual escolar.',220],heroTitle:['Título de bienvenida del panel','Pequeñas miradas. Grandes futuros.',100],heroText:['Texto de bienvenida del panel','Detectar a tiempo es el primer paso. Acompañar el recorrido hace la diferencia.',260],heroButton:['Botón principal del panel','Iniciar un tamizaje',40],
 alumnosTitle:['Título de Alumnos','Cada alumno, una historia',100],alumnosIntro:['Descripción de Alumnos','Registro escolar y continuidad del cuidado.',220],tamizajeTitle:['Título de Tamizaje','Tamizaje guiado',100],tamizajeIntro:['Descripción de Tamizaje','Un recorrido claro, ojo por ojo.',220],consultasTitle:['Título de Consultas','Consultas y derivaciones',100],consultasIntro:['Descripción de Consultas','El equipo profesional define el diagnóstico y el próximo paso.',220],anteojosTitle:['Título de Anteojos','Anteojos que llegan a destino',100],anteojosIntro:['Descripción de Anteojos','De la indicación profesional a la entrega registrada.',220],seguimientoTitle:['Título de Seguimiento','Acompañar después del control',100],seguimientoIntro:['Descripción de Seguimiento','Uso de anteojos, derivaciones y nuevas evaluaciones.',220],recursosTitle:['Título de Recursos','Herramientas para acompañar',100],recursosIntro:['Descripción de Recursos','Guías para el equipo, las familias y el uso de la app.',220],adminTitle:['Título de Administración','Organizar el equipo',100],adminIntro:['Descripción de Administración','Escuelas, cuentas, apariencia y habilitación del registro.',220],
 configuracionTitle:['Título de Configuración','Configuración',100],configuracionIntro:['Descripción de Configuración','Personalizá las pantallas y organizá el inicio del registro.',220],navConfiguracion:['Menú: Configuración','Configuración',28],
 navInicio:['Menú: Inicio','Inicio',28],navAlumnos:['Menú: Alumnos','Alumnos',28],navTamizaje:['Menú: Tamizaje','Tamizaje',28],navConsultas:['Menú: Consultas','Consultas',28],navAnteojos:['Menú: Anteojos','Anteojos',28],navSeguimiento:['Menú: Seguimiento','Seguimiento',28],navRecursos:['Menú: Recursos','Recursos',28],navAdmin:['Menú: Administración','Administración',28]
};
export const UI_OPTIONS={theme:['calida','celeste','salvia'],density:['normal','compacta'],logo:['ojo','lupi']};
export const DEFAULT_UI={...Object.fromEntries(Object.entries(UI_FIELDS).map(([key,[,value]])=>[key,value])),theme:'calida',density:'normal',logo:'ojo',showMascot:true,showHero:true};
export function validateUI(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Revisá los campos de apariencia.');
 const out={};
 for(const [key,[label,,max]] of Object.entries(UI_FIELDS)){
  if(typeof input[key]!=='string'||input[key].trim().length<1||input[key].length>max)throw Error(label+': completá entre 1 y '+max+' caracteres.');
  out[key]=input[key].trim();
 }
 for(const [key,options] of Object.entries(UI_OPTIONS)){if(!options.includes(input[key]))throw Error('Elegí una opción de apariencia válida.');out[key]=input[key];}
 for(const key of ['showMascot','showHero']){if(typeof input[key]!=='boolean')throw Error('Revisá las opciones de visibilidad.');out[key]=input[key];}
 return out;
}
