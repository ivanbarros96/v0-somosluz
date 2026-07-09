// Contenido de la página pública — editar aquí, no en los componentes.
// Fuente: material entregado por la iglesia (julio 2026).

export const REDES = {
  instagramIglesia: 'https://www.instagram.com/somosluz.iglesia/',
  instagramYouth: 'https://www.instagram.com/somosluz.youth/',
  youtube: 'https://youtube.com/@somosluz-iglesia',
  spotify: 'https://open.spotify.com/artist/2wX0Vu0yhd8BEr7cIvDj9j',
  spotifyArtistId: '2wX0Vu0yhd8BEr7cIvDj9j',
} as const;

export const HERO = {
  overline: 'Iglesia Cristiana · Valparaíso, Chile',
  titulo: 'Somos Luz',
  subtitulo: 'Una generación que manifiesta el Reino de Dios en la tierra.',
} as const;

// Frases de identidad tomadas del Instagram (bio, captions y highlights)
export const FRASES_MARQUEE = [
  'Identidad y Propósito',
  'Somos Familia',
  'Fe · Familia · Propósito',
  'Siempre habrá un lugar para ti',
  'Una familia para crecer, servir y caminar juntos',
] as const;

// Cita del post sobre la construcción del templo (jun-2026)
export const PULL_QUOTE = {
  texto: 'Antes de levantar un templo, Dios levanta personas.',
  contexto: 'Fuimos llamados a reflejar Su Reino. A manifestar Su vida. A llevar Su luz.',
} as const;

// Serie de predicación actual
export const SERIE = {
  etiqueta: 'Serie actual',
  nombre: 'No Pierdas la Esencia',
  bajada: 'Sal y luz — lo que eres en Cristo no se negocia.',
  descripcion:
    'Vivimos rodeados de voces que intentan moldear quiénes somos. En esta serie volvemos a lo esencial: una identidad que nace en la presencia de Dios, un primer amor que no se apaga y una luz que no se esconde. Porque cuando la sal conserva su sabor, transforma todo lo que toca.',
  versiculo: 'Mateo 5:13',
} as const;

export const SOBRE_NOSOTROS = {
  parrafo:
    'En Somos Luz creemos que la transformación de una persona comienza en la presencia de Dios. Por eso, nuestra visión es formar discípulos que busquen a Dios por sobre todas las cosas, vivan llenos del Espíritu Santo, reflejen el carácter de Cristo y manifiesten el Reino de Dios en cada área de su vida. Nuestro anhelo es levantar líderes que amen a Jesús, vivan para hacer la voluntad del Padre y sean luz donde Dios los ha puesto.',
  versiculo:
    'Ustedes son la luz del mundo. Una ciudad en lo alto de una colina no puede esconderse.',
  cita: 'Mateo 5:14',
} as const;

export const PASTORES = {
  nombres: 'Jonathan Zúñiga & Cinthia Fuentes',
  titulo: 'Nuestros Pastores',
  bio: 'Anhelamos ver una generación que manifieste el Reino de Dios en la tierra, viviendo en una relación profunda con Él y siendo guiada por el Espíritu Santo. Nuestra pasión es formar discípulos con el carácter de Cristo, comprometidos con hacer la voluntad del Padre, descubrir su propósito y desarrollar el liderazgo al que Dios los ha llamado, para influir en sus familias, la iglesia y la sociedad con la luz de Jesús.',
  foto: '/pastores.jpg',
} as const;

export interface ActividadSemanal {
  dia: string;
  hora: string;
  nombre: string;
  tipo: string;
  online?: boolean;
  destacado?: boolean;
}

export const AGENDA_SEMANAL: ActividadSemanal[] = [
  { dia: 'Martes', hora: '19:30', nombre: 'Hombría al Máximo', tipo: 'Discipulado · Varones', online: true },
  { dia: 'Martes', hora: '21:00', nombre: 'Amadas', tipo: 'Discipulado · Mujeres', online: true },
  { dia: 'Viernes', hora: '19:30', nombre: 'Viernes de Discipulado', tipo: 'Formación espiritual' },
  { dia: 'Sábado', hora: '17:00', nombre: 'Generación Youth', tipo: 'Jóvenes' },
  { dia: 'Domingo', hora: '11:00', nombre: 'Iglesia de Niños', tipo: 'Ministerio infantil' },
  { dia: 'Domingo', hora: '11:30', nombre: 'Culto General', tipo: 'Reunión congregacional', destacado: true },
];

export const CULTO_GENERAL = {
  descripcion:
    'Nuestro principal tiempo como iglesia para adorar a Dios, crecer en Su Palabra y experimentar Su presencia en comunidad. Cada reunión es una oportunidad para fortalecer la fe, ser transformados por el Espíritu Santo y responder al llamado de Dios.',
} as const;

export interface Ministerio {
  id: string;
  nombre: string;
  horario: string;
  publico: string;
  descripcion: string;
  instagram?: string;
}

export const MINISTERIOS: Ministerio[] = [
  {
    id: 'hombria',
    nombre: 'Hombría al Máximo',
    horario: 'Martes 19:30 · Online',
    publico: 'Espacio para varones',
    descripcion:
      'Un lugar donde los hombres son fortalecidos en su identidad en Cristo para crecer en carácter, liderazgo, fe y propósito, edificando matrimonios sólidos, familias saludables y una vida de influencia para el Reino de Dios.',
  },
  {
    id: 'amadas',
    nombre: 'Amadas',
    horario: 'Martes 21:00 · Online',
    publico: 'Espacio para mujeres',
    descripcion:
      'Un lugar donde cada mujer puede conocer más a Dios, afirmar su identidad en Cristo, crecer espiritualmente y desarrollar relaciones sanas que la impulsen a vivir el propósito de Dios para su vida, su hogar y su familia.',
  },
  {
    id: 'discipulado',
    nombre: 'Viernes de Discipulado',
    horario: 'Viernes 19:30',
    publico: 'Formación espiritual',
    descripcion:
      'Un tiempo de enseñanza y crecimiento donde acompañamos a cada persona a conocer más a Dios, ser transformada a la imagen de Cristo, vivir guiada por el Espíritu Santo y descubrir el propósito para el cual Dios la ha llamado.',
  },
  {
    id: 'youth',
    nombre: 'Generación Youth',
    horario: 'Sábados 17:00',
    publico: 'Espacio para jóvenes',
    descripcion:
      'Una comunidad para adolescentes y jóvenes donde encuentran amistad, enseñanza bíblica y un ambiente que los desafía a seguir a Jesús con pasión, descubrir su propósito y ser luz en su generación.',
    instagram: 'https://www.instagram.com/somosluz.youth/',
  },
  {
    id: 'ninos',
    nombre: 'Iglesia de Niños',
    horario: 'Domingos 11:00',
    publico: 'Ministerio infantil',
    descripcion:
      'Un espacio diseñado para que los niños conozcan a Jesús de una manera dinámica, segura y divertida, aprendiendo la Palabra de Dios mientras desarrollan valores, fe y amistad.',
  },
];

export const UBICACION = {
  ciudad: 'Valparaíso, Chile',
  direccion: 'Almirante Goñi 251, esquina Cochrane, Valparaíso',
  mapsQuery: 'Almirante Goñi 251, Valparaíso, Chile',
  // Ficha de Google Maps de la iglesia (negocio registrado jul-2026)
  mapsUrl: 'https://maps.app.goo.gl/xFLZAB7GXtCm3ZeaA',
  lat: -33.0372517,
  lon: -71.629905,
} as const;

// Deep links a apps de navegación — abren la app nativa con la ruta en móvil.
export const COMO_LLEGAR = {
  googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${UBICACION.lat},${UBICACION.lon}`,
  waze: `https://waze.com/ul?ll=${UBICACION.lat},${UBICACION.lon}&navigate=yes`,
  ficha: UBICACION.mapsUrl,
} as const;
