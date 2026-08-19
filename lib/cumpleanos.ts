// Helpers de cumpleaños compartidos entre la intranet y los flujos de n8n.
//
// ⚠️ Si cambias las 30 variantes de saludo o la limpieza del teléfono, hay
// que reflejarlo también en el Code node del workflow de n8n
// ("🎂 Cumpleaños del día → Pastor"). La lógica de QUIÉN cumple y a QUIÉN se
// le escribe sí es única: vive en la función de Postgres `cumpleanos_proximos`.
//
// El saludo NO menciona la edad (queda mejor pensado para leerse en un grupo
// de WhatsApp, donde el pastor lo pega y la gente empieza a felicitar solo).
// Tampoco pide el saludo ("salúdenlo") — si el mensaje es cálido, nace solo.

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

/** 10 variantes por categoría — cercanas, humanas, sin edad y sin pedir el saludo. */
function variantesAdultos(quien: string, termino: string): string[] {
  return [
    `🎉 Hoy es el cumpleaños de ${quien}, y en esta familia eso siempre es motivo de alegría. Un año más de vida, de historia, de Dios cuidando cada paso. ¡Feliz cumpleaños, ${quien}!`,
    `Hoy cumple años ${quien} 🎂 y no se nos ocurre mejor forma de celebrarlo que recordando esta palabra: "Que el Señor te bendiga y te guarde" (Números 6:24). Te queremos mucho.`,
    `🎂 ¡Feliz cumpleaños, ${quien}! Que Dios siga escribiendo cosas hermosas en tu historia. Hoy celebramos contigo.`,
    `Hoy le damos gracias a Dios por la vida de ${quien} 🙏 Por tu cariño, por tu presencia, por todo lo que eres para esta familia. ¡Feliz cumpleaños!`,
    `${termino}, hoy es tu día 🎉 ${quien} está de cumpleaños y acá lo celebramos como se merece. Que la pases increíble junto a los tuyos.`,
    `Feliz cumpleaños, ${quien} 🎂 Que este nuevo año venga cargado de salud, paz y mucho propósito. Te queremos, familia Somos Luz.`,
    `Hoy celebramos la luz que ${quien} trae a esta familia ✨ Gracias por brillar como lo haces. ¡Feliz cumpleaños!`,
    `En esta familia hoy hay fiesta 🎉 ${quien} está de cumpleaños, y caminar contigo es un regalo para todos nosotros. ¡Que Dios te siga bendiciendo!`,
    `Hoy es un día especial: cumpleaños de ${quien} 🎂 Que este nuevo año esté lleno de bendición, alegría y mucha salud. Te queremos.`,
    `${quien}, hoy es tu cumpleaños y queríamos que lo supieras: eres parte importante de esta familia 💛 Que Dios te bendiga hoy y siempre.`,
  ];
}

function variantesJovenes(quien: string): string[] {
  return [
    `🔥 ¡Hoy es el cumple de ${quien}! Un año más creciendo, soñando en grande y dejando huella en este grupo. ¡Feliz cumple, crack!`,
    `🎉 ${quien} está de cumpleaños. Que este nuevo año venga con historias increíbles, risas y mucha bendición. Te queremos.`,
    `Hoy toca celebrar a ${quien} 🙌 Gracias por la energía que le pones a este grupo. ¡Feliz cumpleaños!`,
    `🎂 ¡${quien} cumple años hoy! Que Dios siga escribiendo una historia increíble en tu vida. Nos alegra tenerte en esta familia.`,
    `Hoy es el día de ${quien} 🎉 Que este año venga cargado de aventuras, propósito y mucha bendición. ¡Feliz cumple!`,
    `✨ ${quien} está de cumple. Gracias por ser parte de este equipo. Que Dios te bendiga muchísimo este nuevo año.`,
    `🎈 Hoy celebramos a ${quien}. Un año más de crecer junto a esta familia. ¡Feliz cumpleaños!`,
    `Hoy es un día especial para ${quien} 🎉 Que este nuevo año esté lleno de fe, risas y grandes momentos. Te queremos mucho.`,
    `🙌 ¡Feliz cumpleaños, ${quien}! Gracias por sumar tanto a este grupo. Que Dios te siga guiando en cada paso.`,
    `Hoy brilla más fuerte ${quien} 🌟 porque es su cumpleaños. ¡Que este año sea de puros logros y bendición!`,
  ];
}

function variantesNinos(quien: string): string[] {
  return [
    `🎈 ¡Hoy es el cumpleaños de ${quien}! Toda esta familia se alegra contigo. Que tengas un día lleno de risas y sorpresas.`,
    `🎂 ¡Feliz cumpleaños, ${quien}! Que Dios te cuide siempre y te llene de alegría en este nuevo año.`,
    `Hoy celebramos a ${quien} 🌈 Un peque muy especial para esta familia. ¡Feliz cumple!`,
    `🧸 ${quien} está de cumpleaños. Que este día esté lleno de juegos, torta y mucho cariño.`,
    `Hoy es un día muy especial: ¡${quien} cumple años! 🎉 Toda la familia Somos Luz te manda mucho cariño.`,
    `🎈 ¡Feliz cumpleaños, ${quien}! Que Dios bendiga tu vida y tu familia hoy y siempre.`,
    `Hoy brilla ${quien} 🌟 porque es su cumpleaños. ¡Que sea un día increíble!`,
    `🎂 ${quien} está de cumpleaños. Gracias a Dios por tu vida y por la alegría que le traes a esta familia.`,
    `Hoy celebramos con mucho cariño a ${quien} 🎈 ¡Feliz cumpleaños!`,
    `🌈 ¡Feliz cumpleaños, ${quien}! Que este nuevo añito venga lleno de risas, juegos y bendición.`,
  ];
}

/**
 * Mensaje de saludo listo para enviar o publicar en el grupo. El tono
 * cambia según la categoría de la persona (adulto/joven/niño); dentro de
 * cada categoría rota entre 10 variantes — misma persona, distinta variante
 * cada año, estable si el flujo se reintenta el mismo día.
 */
export function mensajeCumpleanos(p: PersonaCumple): string {
  const quien = primerNombre(p.nombre);
  const termino = p.sexo === 'Femenino' ? 'Comadre' : 'Compadre';
  const anio = new Date().getFullYear();
  const idx = (Number(p.id || 0) + anio) % 10;

  const variantes =
    p.source_tipo === 'joven' ? variantesJovenes(quien)
    : p.source_tipo === 'nino' ? variantesNinos(quien)
    : variantesAdultos(quien, termino);

  return variantes[idx];
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
