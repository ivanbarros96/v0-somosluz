// Helpers de cumpleaños compartidos entre la intranet y los flujos de n8n.
//
// ⚠️ Si cambias los pools de saludo o la limpieza del teléfono, hay que
// reflejarlo también en el Code node del workflow de n8n
// ("🎂 Cumpleaños del día → Pastor"). La lógica de QUIÉN cumple y a QUIÉN se
// le escribe sí es única: vive en la función de Postgres `cumpleanos_proximos`.
//
// El saludo NO menciona la edad (queda mejor pensado para leerse en un grupo
// de WhatsApp, donde el pastor lo pega y la gente empieza a felicitar solo).
// Tampoco pide el saludo ("salúdenlo") — si el mensaje es cálido, nace solo.
//
// Tres pools con marcadores ({nombre}, o {apo}+{nino} para niños). El de niños
// se dirige al APODERADO, felicitando al niño. Se rota por (id + año), así la
// misma persona recibe una variante distinta cada año. El workflow de n8n
// añade además un pool "combinado" para cuando cumplen varios el mismo día;
// la intranet siempre trabaja 1 persona a la vez, así que no lo necesita.

export interface PersonaCumple {
  id: number;
  nombre: string;
  source_tipo: string;
  sexo: string | null;
  edad_que_cumple: number;
  contacto_telefono: string | null;
  contacto_nombre: string;
  contacto_es_apoderado: boolean;
}

/**
 * Deja el teléfono como lo necesita wa.me: solo dígitos, con código de país.
 * Los teléfonos se guardan como '+56 977787704' → '56977787704'.
 * Devuelve null si no queda un número plausible.
 */
export function telefonoParaWhatsApp(tel: string | null | undefined): string | null {
  if (!tel) return null;
  const digitos = tel.replace(/\D/g, '');
  // Un número chileno con código de país son 11 dígitos (56 + 9 dígitos).
  // Se acepta 8-15 para no descartar otros países (hay un +55 de Brasil).
  if (digitos.length < 8 || digitos.length > 15) return null;
  return digitos;
}

/** Primer nombre, para que el saludo no suene a carta de banco. */
export function primerNombre(nombreCompleto: string): string {
  return nombreCompleto.trim().split(/\s+/)[0] ?? nombreCompleto;
}

// Dirigidos a la persona. Marcador: {nombre}.
const ADULTOS: string[] = [
  "🎂 Hoy es el cumpleaños de {nombre}, y como familia Somos Luz queremos desearte un muy feliz cumpleaños. «Que el Señor te bendiga y te guarde» (Números 6:24). ¡Te queremos, felicidades! 🎉",
  "🎉 ¡Hoy celebramos la vida de {nombre}! Desde la familia Somos Luz te deseamos un año lleno de bendición. «El Señor te conceda conforme al deseo de tu corazón» (Salmo 20:4). ¡Feliz cumpleaños! 🎂",
  "🎂 Hoy está de cumpleaños {nombre}. Como familia Somos Luz te abrazamos y pedimos lo mejor de Dios para tu vida. «Planes para darte un futuro y una esperanza» (Jeremías 29:11). ¡Felicidades! 🎉",
  "🎈 ¡Feliz cumpleaños, {nombre}! Toda la familia Somos Luz se alegra contigo en este día tan especial. «Este es el día que hizo el Señor; gocémonos en él» (Salmo 118:24). ¡Te queremos! 🎉",
  "🎂 ¡Hoy {nombre} está de cumpleaños! Desde Somos Luz te bendecimos de todo corazón en tu nuevo año de vida. «Grandes son sus misericordias, nuevas cada mañana» (Lamentaciones 3:23). ¡Felicidades! 🎉",
  "🎉 Hoy celebramos a {nombre}. Como familia Somos Luz oramos por un año lleno de la presencia de Dios. «Los que esperan en el Señor tendrán nuevas fuerzas» (Isaías 40:31). ¡Feliz cumpleaños! 🎂",
  "🎂 ¡Hoy es el cumpleaños de {nombre}! Desde la familia Somos Luz te deseamos salud, paz y mucha bendición. «Amado, deseo que seas prosperado en todo y tengas salud» (3 Juan 1:2). ¡Felicidades! 🎉",
  "🎈 Hoy cumple años {nombre}, y como familia Somos Luz queremos celebrarte con mucho cariño. «El Señor te guardará de todo mal; Él guardará tu vida» (Salmo 121:7). ¡Feliz cumpleaños! 🎉",
  "🎂 ¡{nombre} está de cumpleaños! Toda la familia Somos Luz te desea un día hermoso y un año de bendición. «Mi Dios suplirá todo lo que te falte» (Filipenses 4:19). ¡Te queremos, felicidades! 🎉",
  "🎉 Hoy es el cumpleaños de {nombre}, alegría para toda la familia Somos Luz. Que el amor de Dios te acompañe siempre. «El Señor te bendiga todos los días de tu vida» (Salmo 128:5). ¡Felicidades! 🎂",
  "🎂 ¡Feliz cumpleaños, {nombre}! Como familia Somos Luz damos gracias a Dios por tu vida y te bendecimos hoy. «El Señor te saciará de larga vida» (Salmo 91:16). ¡Te queremos mucho, felicidades! 🎉",
  "🎉 Hoy es un día de fiesta: ¡{nombre} está de cumpleaños! Desde Somos Luz te deseamos lo mejor de Dios. «Deléitate en el Señor, y Él concederá los deseos de tu corazón» (Salmo 37:4). ¡Felicidades! 🎂",
  "🎂 ¡Hoy celebramos a {nombre}! Como familia Somos Luz oramos por bendición sobre todos tus proyectos. «Encomienda al Señor tus obras, y se afirmarán tus pensamientos» (Proverbios 16:3). ¡Feliz cumple! 🎉",
  "🎈 ¡Feliz cumpleaños, {nombre}! Toda la familia Somos Luz celebra tu vida hoy con mucho cariño. «El Señor cumplirá su propósito en ti» (Salmo 138:8). ¡Te deseamos un año maravilloso! 🎉",
  "🎂 Hoy está de cumpleaños {nombre}, y en Somos Luz nos gozamos contigo. Que nada te falte en este nuevo año. «El Señor es mi pastor, nada me faltará» (Salmo 23:1). ¡Feliz cumpleaños, felicidades! 🎉",
  "🎉 ¡Hoy es el cumpleaños de {nombre}! Como familia Somos Luz te deseamos un año lleno de gozo y paz. «El Dios de esperanza os llene de todo gozo y paz» (Romanos 15:13). ¡Te queremos, felicidades! 🎂",
  "🎂 ¡{nombre} está de cumpleaños! Desde la familia Somos Luz bendecimos tu vida en este día especial. «Tú coronas el año con tus bienes» (Salmo 65:11). ¡Feliz cumpleaños, felicidades! 🎉",
  "🎈 Hoy celebramos la vida de {nombre}. Como familia Somos Luz te deseamos un año lleno del favor de Dios. «Con tu favor nos rodeas como con un escudo» (Salmo 5:12). ¡Feliz cumpleaños, te queremos! 🎉",
  "🎂 ¡Feliz cumpleaños, {nombre}! Toda la familia Somos Luz ora por ti hoy. Que Dios haga más de lo que imaginas. «Poderoso para hacer todo mucho más abundantemente» (Efesios 3:20). ¡Felicidades! 🎉",
  "🎉 Hoy es el cumpleaños de {nombre}, y en Somos Luz lo celebramos con alegría. Que el gozo de Dios te acompañe. «En tu presencia hay plenitud de gozo» (Salmo 16:11). ¡Feliz cumpleaños, te queremos! 🎂",
  "🎂 ¡Hoy {nombre} está de cumpleaños! Como familia Somos Luz te deseamos un año de gracia y bendición. «Gracia y gloria dará el Señor» (Salmo 84:11). ¡Te queremos mucho, felicidades! 🎉",
  "🎈 ¡Feliz cumpleaños, {nombre}! Desde la familia Somos Luz celebramos tu vida y le damos gracias a Dios. «Bendice, alma mía, al Señor, y no olvides sus beneficios» (Salmo 103:2). ¡Felicidades! 🎉",
  "🎂 Hoy es el cumpleaños de {nombre}. Como familia Somos Luz te deseamos sabiduría y dirección de Dios. «Yo te enseñaré el camino en que debes andar» (Salmo 32:8). ¡Feliz cumpleaños, te queremos! 🎉",
  "🎉 ¡Hoy celebramos a {nombre}! Toda la familia Somos Luz se goza contigo. Que experimentes la bondad de Dios. «Gustad y ved que el Señor es bueno» (Salmo 34:8). ¡Feliz cumpleaños, felicidades! 🎂",
  "🎂 ¡{nombre} está de cumpleaños! Desde Somos Luz te bendecimos y confiamos junto a ti en el Señor. «Confía en el Señor de todo tu corazón» (Proverbios 3:5). ¡Feliz cumpleaños, te queremos! 🎉",
  "🎈 Hoy es el cumpleaños de {nombre}, y como familia Somos Luz te acompañamos con cariño y oración. «El Señor te bendiga y haga resplandecer su rostro sobre ti» (Números 6:25). ¡Felicidades! 🎉",
  "🎂 ¡Feliz cumpleaños, {nombre}! En Somos Luz celebramos un año más de tu vida con gratitud a Dios. «Para siempre es su misericordia» (Salmo 100:5). ¡Que Dios te llene de bendición, felicidades! 🎉",
  "🎉 Hoy está de cumpleaños {nombre}. Como familia Somos Luz oramos que Dios ensanche tu vida en bendición. «Ensancha mi territorio, y que tu mano esté conmigo» (1 Crónicas 4:10). ¡Feliz cumpleaños! 🎂",
];

// Dirigidos a la persona, tono más fresco. Marcador: {nombre}.
const JOVENES: string[] = [
  "🎉 ¡Hoy es el cumpleaños de {nombre}! Toda la familia Somos Luz celebra tu vida y te desea un año increíble. «El Señor te conceda conforme al deseo de tu corazón» (Salmo 20:4). ¡Feliz cumple! 🎂",
  "🎂 ¡Feliz cumpleaños, {nombre}! Desde la familia Somos Luz oramos por sueños grandes y un año lleno de Dios. «Planes para darte un futuro y una esperanza» (Jeremías 29:11). ¡Felicidades! 🎉",
  "🔥 Hoy celebramos a {nombre}. Como familia Somos Luz te deseamos un cumpleaños lleno de alegría y propósito. «Ninguno tenga en poco tu juventud» (1 Timoteo 4:12). ¡Feliz cumple, te queremos! 🎉",
  "🎈 ¡Hoy está de cumpleaños {nombre}! Toda la familia Somos Luz se goza contigo en este día. «Todo lo puedo en Cristo que me fortalece» (Filipenses 4:13). ¡Feliz cumpleaños, sigue brillando! 🎉",
  "🎂 ¡Hoy es el gran día de {nombre}! Desde Somos Luz te deseamos un año lleno de fe y aventuras con Dios. «Los que esperan en el Señor tendrán nuevas fuerzas» (Isaías 40:31). ¡Felicidades! 🎉",
  "🎉 Hoy celebramos la vida de {nombre}. Como familia Somos Luz te bendecimos en este nuevo año. «Alégrate, joven, en tu juventud» (Eclesiastés 11:9). ¡Feliz cumple, te queremos mucho! 🎂",
  "🎂 ¡Feliz cumpleaños, {nombre}! Toda la familia Somos Luz celebra contigo y ora por tus sueños. «Tú eres mi esperanza, oh Señor, desde mi juventud» (Salmo 71:5). ¡Te queremos mucho! 🎉",
  "🎈 ¡Hoy {nombre} está de cumpleaños! Desde Somos Luz te deseamos un año lleno de propósito. «Encomienda al Señor tus obras, y tus proyectos se afirmarán» (Proverbios 16:3). ¡Felicidades! 🎉",
  "🎉 Hoy es el cumpleaños de {nombre}, ¡y en Somos Luz lo celebramos con todo! Que Dios llene de vida tu nuevo año. «Esfuérzate y sé valiente» (Josué 1:9). ¡Feliz cumple, te queremos! 🎂",
];

// Dirigidos al APODERADO, felicitando al niño. Marcadores: {apo} y {nino}.
// Usa "le" (neutro) para no depender del género del niño.
const APODERADO: string[] = [
  "🎈 ¡Hola {apo}! Hoy {nino} está de cumpleaños y toda la familia Somos Luz le celebra contigo. Que Dios le llene de alegría. «El Señor le bendiga y le guarde» (Números 6:24). ¡Felicidades! 🎂",
  "🎂 {apo}, hoy es el cumpleaños de {nino} y en la familia Somos Luz le queremos mucho. Que Dios cuide cada uno de sus pasos. «El Señor le guardará de todo mal» (Salmo 121:7). ¡Feliz cumple! 🎉",
  "🌈 ¡Hola {apo}! Hoy celebramos a {nino} junto a toda la familia Somos Luz. Que Dios le llene de amor y sonrisas. «Maravillosas son tus obras» (Salmo 139:14). ¡Felicidades para {nino}! 🎈",
  "🎈 {apo}, hoy {nino} está de cumpleaños y en Somos Luz damos gracias a Dios por su vida. Es un regalo precioso. «Los hijos son herencia del Señor» (Salmo 127:3). ¡Feliz cumpleaños a {nino}! 🎂",
  "🎂 ¡Hola {apo}! Toda la familia Somos Luz saluda a {nino} en su cumpleaños con mucho cariño. Que Dios le bendiga siempre. «Dejen que los niños vengan a mí» (Marcos 10:14). ¡Felicidades! 🎉",
  "🌈 {apo}, hoy es el día especial de {nino} y en Somos Luz le celebramos con alegría. Que Jesús le acompañe siempre. «El Señor es su guardador» (Salmo 121:5). ¡Feliz cumpleaños a {nino}! 🎈",
  "🎈 ¡Hola {apo}! Hoy {nino} cumple años y la familia Somos Luz le abraza con amor. Que Dios le llene de salud y felicidad. «El Señor es su pastor, nada le faltará» (Salmo 23:1). ¡Felicidades! 🎂",
  "🎂 {apo}, hoy toda la familia Somos Luz celebra la vida de {nino}. Que Dios derrame su bendición sobre su vida. «El Señor le bendiga y haga resplandecer su rostro» (Números 6:25). ¡Feliz cumple! 🎉",
  "🎈 ¡Hola {apo}! En este día tan especial saludamos a {nino} desde toda la familia Somos Luz. Que Dios le cuide. «Tan grande es su amor» (Salmo 103:11). ¡Feliz cumpleaños a {nino}! 🌈",
  "🎂 {apo}, hoy {nino} está de cumpleaños y en Somos Luz le deseamos un día lleno de juegos y risas. Dios le ama muchísimo. «El Señor le bendiga y le guarde» (Números 6:24). ¡Felicidades! 🎉",
  "🌈 ¡Hola {apo}! Hoy celebramos a {nino} con todo el cariño de la familia Somos Luz. Que Dios llene su vida de bendición. «Este es el día que hizo el Señor» (Salmo 118:24). ¡Feliz cumple a {nino}! 🎈",
  "🎈 {apo}, toda la familia Somos Luz saluda hoy a {nino} en su cumpleaños. Que crezca en sabiduría y en gracia. «Jesús crecía en sabiduría y en gracia» (Lucas 2:52). ¡Felicidades a {nino}! 🎂",
];

/**
 * Mensaje de saludo listo para enviar o publicar. El destinatario y el tono
 * cambian según la persona:
 *  - contacto_es_apoderado (niños): se dirige al apoderado, felicitando al niño.
 *  - joven: pool de jóvenes.
 *  - resto: pool de adultos.
 * Dentro de cada pool rota por (id + año): misma persona, distinta variante
 * cada año, estable si el flujo se reintenta el mismo día.
 */
export function mensajeCumpleanos(p: PersonaCumple): string {
  const quien = primerNombre(p.nombre);
  const anio = new Date().getFullYear();

  if (p.contacto_es_apoderado) {
    const apo = primerNombre(p.contacto_nombre);
    const idx = (Number(p.id || 0) + anio) % APODERADO.length;
    return APODERADO[idx].replace(/\{apo\}/g, apo).replace(/\{nino\}/g, quien);
  }

  if (p.source_tipo === 'joven') {
    const idx = (Number(p.id || 0) + anio) % JOVENES.length;
    return JOVENES[idx].replace(/\{nombre\}/g, quien);
  }

  const idx = (Number(p.id || 0) + anio) % ADULTOS.length;
  return ADULTOS[idx].replace(/\{nombre\}/g, quien);
}

/**
 * Link de WhatsApp con el mensaje ya escrito. Al abrirlo desde el celular,
 * WhatsApp arranca con el texto puesto — solo falta apretar enviar.
 * Devuelve null si la persona no tiene un teléfono usable.
 */
export function linkWhatsApp(p: PersonaCumple, mensaje?: string): string | null {
  const numero = telefonoParaWhatsApp(p.contacto_telefono);
  if (!numero) return null;
  const texto = encodeURIComponent(mensaje ?? mensajeCumpleanos(p));
  return `https://wa.me/${numero}?text=${texto}`;
}

/** Etiqueta legible del tipo de persona. */
export const LABEL_TIPO_PERSONA: Record<string, string> = {
  adulto: 'Adulto',
  joven: 'Youth',
  nino: 'Niño',
};

/** '14 de agosto' — para mostrar la fecha del cumpleaños sin el año. */
export function fechaCumpleLegible(cumpleDia: number, cumpleMes: number): string {
  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${cumpleDia} de ${MESES[cumpleMes - 1] ?? ''}`;
}
