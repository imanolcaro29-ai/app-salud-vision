> Actualización técnica 1.2.0: el despliegue en línea utiliza Vercel y PostgreSQL en Supabase. Consultá EMPEZAR_AQUI.md y ARQUITECTURA.md. El diseño clínico y operativo de esta propuesta se conserva.

# Haciendo la Vista Gorda
## Sistema de registro, tamizaje y seguimiento de salud visual escolar

Versión 1.0 · 12 de septiembre de 2026 · Proyecto académico de estudiantes de Medicina.

Esta propuesta toma como antecedente el documento “App de Tamizado Visual & Historia Clínica Digital Infantil” y la identidad gráfica aportada por el equipo. Se plantea como herramienta de apoyo para escuelas y operativos de salud visual. No declara afiliación, aprobación ni integración oficial con el programa “Ver para Ser Libres”. La participación institucional debe acordarse con sus responsables.

### 1. Propósito y población
Organizar el recorrido desde la identificación escolar de una posible dificultad visual hasta la consulta, entrega de anteojos y seguimiento. El alcance del protocolo de tamizaje incluido es de 3 a 17 años, con procedimientos adaptados a la comprensión del niño. La institución podrá delimitar un subconjunto de edades. Los casos fuera del alcance se registran como no evaluables por este protocolo y se remiten al equipo sanitario.

La plataforma funciona conectada a un servidor. No incluye evaluación autónoma mediante cámara ni funcionamiento sin conexión. La pantalla no se utiliza como cartilla clínica: el docente registra resultados de una cartilla física estandarizada. Una actividad digital de familiarización con la orientación de la E se encuentra separada de las evaluaciones y no produce resultados clínicos.

### 2. Responsabilidades
La coordinación administra escuelas, cuentas y permisos. El docente capacitado registra alumnos de sus escuelas, autorización, observaciones y tamizajes. El profesional habilitado registra la evaluación clínica, impresión diagnóstica, conducta y receta dentro de su incumbencia. El taller consulta las órdenes de anteojos y registra preparación y entrega. La dirección sanitaria define y aprueba el protocolo, capacita, supervisa, organiza derivaciones y evalúa resultados.

El registro escolar y los asientos clínicos se distinguen por tipo de entrada, autor y fecha. El software no sustituye una historia clínica institucional certificada ni aporta una firma digital legal: conserva atribución de autoría mediante cuenta autenticada y asientos sucesivos. Su incorporación a una historia clínica oficial requiere revisión institucional.

### 3. Recorrido operativo
1. Dar de alta la escuela y asignar sus docentes. Registrar datos mínimos del alumno, contacto responsable y referencia de la autorización resguardada por la institución.
2. Explicar la actividad en lenguaje adecuado. Verificar comprensión, condiciones ambientales, cartilla, distancia indicada por su fabricante y oclusión sin presión.
3. Evaluar cada ojo por separado y registrar uso de anteojos. El resultado binocular es opcional y solamente se carga si se midió de forma independiente.
4. Registrar la última línea superada según el protocolo de la cartilla; evitar inventar resultados cuando no se puede completar. Los signos de alarma se comunican al equipo sanitario sin esperar al operativo.
5. Obtener una clasificación explicada y revisable por el equipo. Registrar consulta, receta o derivación con fecha de seguimiento.
6. Cuando hay indicación de anteojos, registrar armazón, material, preparación, entrega y adulto receptor. Realizar seguimiento de uso, molestias y continuidad de la derivación.

### 4. Protocolo de tamizaje HV-1.0
Se utilizan cartillas estandarizadas apropiadas para edad y capacidad: Sloan, HOTV, LEA o, cuando el protocolo local lo admita, E direccional o C de Landolt. La “E de Landolt” no es una denominación correcta. No se sustituyen los optotipos por figuras arbitrarias. El tamaño físico, contraste, iluminación, distancia y método de oclusión corresponden al protocolo de la cartilla; la app registra la comprobación del evaluador.

Las recomendaciones de AAPOS contemplan identificar la mayoría de optotipos de la línea 20/50 entre 36 y 47 meses, 20/40 entre 48 y 59 meses y 20/32 desde los 5 años. Estos umbrales se usan como referencia explícita para el registro asistido; no equivalen a diagnóstico ni sustituyen un protocolo local aprobado. La regla adicional de asimetría cercana a 0,2 logMAR y la derivación por observaciones constituyen decisiones operativas del proyecto y deben validarse por la dirección sanitaria.

Estados de salida:
- **Cumple criterio (verde):** ambos ojos alcanzan el umbral etario, prueba válida y sin observaciones registradas. No descarta toda patología ocular. El intervalo de control lo establece la institución; AAPOS propone repetir cada 1 a 2 años después de los 5 años.
- **Requiere evaluación (amarillo):** falla del umbral en algún ojo, asimetría relevante u observaciones escolares. La app explica el motivo. El equipo determina prioridad y fecha de atención; este estado no etiqueta gravedad clínica.
- **Alerta comunicada (rojo):** registro de un signo de alarma (pérdida visual brusca, dolor intenso, lesión/exposición química o reflejo pupilar blanco observado). Se consigna contacto sanitario e indicación recibida. La urgencia concreta se determina clínicamente; no se espera al camión para solicitar orientación.
- **No evaluable (gris):** falta de comprensión, prueba incompleta, condiciones inadecuadas o edad fuera del alcance. Organizar repetición supervisada o evaluación profesional; no interpretarlo como visión conservada.

### 5. Datos, permisos y confidencialidad
Se registran nombre, fecha de nacimiento, escuela, grado, adulto responsable y contacto. El DNI es opcional y se utiliza para evitar duplicados cuando se dispone de él. La autorización queda referenciada con fecha; marcar una casilla no reemplaza el documento ni el proceso de información y asentimiento que correspondan.

Las cuentas son individuales. El docente sólo accede a sus escuelas y no recibe diagnósticos ni recetas desde la API. El taller recibe únicamente la información operativa y la receta necesaria para la orden. El profesional y la coordinación tienen acceso según su función. Los registros clínicos son sucesivos, sin borrado o edición silenciosa desde la interfaz. Una nueva consulta puede aclarar o rectificar una anterior dejando constancia.

El servidor utiliza sesiones revocables, contraseñas con scrypt, protección de solicitudes, controles de rol y escuela, validación de entradas y auditoría. Los contenidos personales y clínicos se cifran en la base mediante AES-256-GCM. La clave se conserva fuera del repositorio. Esto no equivale a una certificación integral de seguridad: el alojamiento, los administradores, las copias, el cifrado del volumen y el procedimiento de acceso deben ser gestionados por la institución.

La revisión institucional debe considerar la Ley 25.326 y la Ley 26.529, determinar responsable de la base, finalidad, acceso del titular, rectificaciones, conservación, resguardo documental y tratamiento de datos de menores. No se afirma cumplimiento normativo automático por instalar el programa.

### 6. Implementación técnica
Aplicación web responsive en HTML, CSS y JavaScript modular; servidor Node.js 24 LTS con API HTTP; base SQLite local al servidor. No requiere claves de servicios externos ni dependencias de producción descargadas. Los navegadores no conservan fichas clínicas en almacenamiento local. Las preferencias de interfaz pueden guardarse en sesión.

Un servidor mantiene la única base de datos. Se usa una instancia con disco persistente: no se debe escalar a múltiples instancias con bases separadas. HTTPS termina en un proxy o plataforma de alojamiento. El servidor valida origen, cookie segura en producción y permisos en cada operación. Se incluye Dockerfile, configuración de Render como ejemplo, comprobación de sintaxis, pruebas unitarias y de API, simulacro de navegador y guía GitHub.

GitHub almacena el código; GitHub Pages no ejecuta este servidor ni mantiene la base. En la versión 1.2.0, Vercel ejecuta el servidor y Supabase conserva los registros en PostgreSQL; la alternativa local SQLite requiere un alojamiento Node/Docker con disco persistente. No se incluye publicación automática de datos de alumnos. El modo demo sólo contiene registros ficticios y usa una base independiente.

### 7. Interacción y accesibilidad
Paleta derivada de la referencia: crema, durazno, celeste y marrón oscuro. Estados comunicados con texto además del color. Navegación por teclado, etiquetas, enfoque visible, avisos de error y diseño para celular y escritorio. La mascota “Lupi” ofrece orientación breve y una actividad de familiarización; no interpreta resultados ni prescribe. Las animaciones respetan la preferencia de movimiento reducido.

### 8. Piloto y evaluación
Antes del uso asistencial, designar una dirección sanitaria; aprobar cartillas, criterios, adaptación por edad, plazos y derivaciones; capacitar a evaluadores; aprobar tratamiento de datos y alojamiento. La activación de registros reales exige configurar CLINICAL_ENABLED=true, una vez concluidos estos acuerdos. El modo de demostración no prueba eficacia clínica.

El piloto debe incluir alumnos con distintos resultados y comparaciones independientes con evaluación profesional. Medir completitud, tiempo total por alumno, repetibilidad entre evaluadores y concordancia de clasificación; cuando el diseño y el tamaño muestral lo permitan, estimar sensibilidad y especificidad con intervalos de confianza. También medir proporción evaluada sobre matrícula, derivaciones con atención confirmada, anteojos entregados sobre indicados, tiempos de espera y continuidad del uso.

Los tableros describen únicamente los registros y alumnos incluidos. No representan prevalencia regional ni causalidad entre visión y aprendizaje. Una estimación poblacional necesita denominadores, diseño y análisis específicos.

### 9. Recursos y sostenibilidad
Recursos: cartillas estandarizadas, oclusores adecuados, cinta métrica, espacios con iluminación y distancia controladas, dispositivos con navegador, servidor con disco persistente, copias cifradas y personal asignado. Los costos de cartillas, alojamiento, mantenimiento y tiempo de capacitación se presupuestan con proveedores y responsables locales; no se fijan importes sin cotización.

La coordinación supervisa cuentas y seguimiento; el referente técnico gestiona actualizaciones y restauración; el referente clínico revisa protocolo y eventos. Las copias se realizan con el procedimiento incluido, se guardan fuera del servidor junto con una custodia separada de la clave y se someten a ensayos de restauración.

### Referencias consultadas
- American Association for Pediatric Ophthalmology and Strabismus. Vision Screening Recommendations. https://aapos.org/members/vision-screening-guidelines (consulta: 12/09/2026).
- American Association for Pediatric Ophthalmology and Strabismus. Vision Screening. https://aapos.org/glossary/vision-screening-description
- University of Iowa, Department of Ophthalmology and Visual Sciences. Pediatric Visual Acuity Testing. https://eyerounds.org/atlas-video/pediatric-VA-testing.htm
- Argentina. Ley 25.326, Protección de los Datos Personales, texto actualizado. https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion
- Argentina. Ley 26.529, Derechos del Paciente, Historia Clínica y Consentimiento Informado, texto actualizado. https://www.argentina.gob.ar/normativa/nacional/ley-26529-160432/actualizacion

Antecedentes aportados por el usuario: propuesta_tamizado_visual_hcve.pdf y captura de @haciendolavistagorda. No se incorporan datos reales de niños.
