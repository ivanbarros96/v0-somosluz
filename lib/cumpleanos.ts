// Helpers de cumpleaños compartidos entre la intranet y los flujos de n8n.
//
// ⚠️ Si cambias el texto de los mensajes o la limpieza del teléfono, hay que
// reflejarlo también en el Code node de los workflows de n8n
// ("🎂 Cumpleaños del día" y "🎂 Resumen semanal"). La lógica de QUIÉN cumple
// y a QUIÉN se le escribe sí es única: vive en la función de Postgres
// `cumpleanos_proximos`.

export interface PersonaCumple {
  nombre: string;
  source_tipo: string;
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

/**
 * Mensaje de saludo listo para enviar. Cambia según a quién se le escribe:
 * al cumpleañero directo, o a su apoderado (niños, y jóvenes sin teléfono).
 */
export function mensajeCumpleanos(p: PersonaCumple): string {
  const nombreCorto = primerNombre(p.nombre);

  if (p.contacto_es_apoderado) {
    const apoderado = primerNombre(p.contacto_nombre);
    return (
      `¡Hola ${apoderado}! Desde la familia de Somos Luz Iglesia queremos saludar a ` +
      `${nombreCorto}, que hoy cumple ${p.edad_que_cumple} años. ` +
      `Le deseamos un día muy feliz y que Dios lo siga bendiciendo junto a toda la familia. 🎉`
    );
  }

  return (
    `¡Feliz cumpleaños, ${nombreCorto}! 🎉 Hoy cumples ${p.edad_que_cumple} años y desde ` +
    `Somos Luz Iglesia queremos bendecirte en este nuevo año de vida. ` +
    `Que el Señor te llene de salud, paz y propósito. ¡Te queremos!`
  );
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
