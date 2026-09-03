// Fuente única de verdad de los usuarios/roles de la intranet.
// Las contraseñas viven en variables de entorno de Vercel (una por usuario).
import type { CultoTipo } from './cultos-tipos';

export const ROLES = {
  pastor: { name: 'Pastor', badge: 'Gerencial', envVar: 'PASTOR_PASSWORD', ministerio: null },
  // Co-pastor: seguimiento a las personas. Llama y acompaña a quienes están
  // faltando y a quienes recién llegan. Ve y registra gente, pero no toca
  // Finanzas ni Configuración — ver esRolCopastor().
  copastor: { name: 'Co-pastor', badge: 'Pastoral', envVar: 'COPASTOR_PASSWORD', ministerio: null },
  // Oración: entra SOLO al panel de peticiones. Ve todo (interno + externo),
  // anota las peticiones de los propios miembros y lleva la trazabilidad
  // (en espera → orando → contestada). No ve el resto de la intranet, igual
  // que un ministerio pero con su propio panel — ver esRolOracion().
  oracion: { name: 'Oración', badge: 'Pastoral', envVar: 'ORACION_PASSWORD', ministerio: null },
  // Secretaría: mantiene los datos de las personas — registro, miembros,
  // asistencia y cumpleaños — sin importar de qué reunión vengan. Se llamaba
  // "Somos Luz", que se confundía con el nombre de la iglesia y no decía qué
  // hacía. La clave interna del rol y su env var NO cambian: renombrarlas
  // cerraría las sesiones activas y obligaría a reconfigurar Vercel.
  somosluz: { name: 'Secretaría', badge: 'Operativo', envVar: 'SOMOSLUZ_PASSWORD', ministerio: null },
  // Insignia "Reunión" y no "Ministerio": Viernes de Discipulado es una
  // reunión de formación, no un ministerio, y las cinco comparten insignia.
  // Es solo texto visible — ningún permiso depende de este campo.
  amadas: { name: 'Amadas', badge: 'Reunión', envVar: 'AMADAS_PASSWORD', ministerio: 'mujeres' },
  hombres: { name: 'Hombría al Máximo', badge: 'Reunión', envVar: 'HOMBRES_PASSWORD', ministerio: 'hombres' },
  discipulado: { name: 'Viernes de Discipulado', badge: 'Reunión', envVar: 'DISCIPULADO_PASSWORD', ministerio: 'discipulado' },
  youth: { name: 'Generación Youth', badge: 'Reunión', envVar: 'YOUTH_PASSWORD', ministerio: 'youth' },
  // Kids sí tiene reunión propia desde el 09/08/2026: la clase de niños corre
  // en paralelo al dominical. Antes compartía el registro del general y las
  // marcas se pisaban (ver lib/cultos-tipos.ts). Sigue siendo especial en dos
  // cosas — no abre ni cierra su culto (se crea solo con el dominical) y solo
  // ve el que está abierto — ver esRolKids().
  kids: { name: 'Kids', badge: 'Reunión', envVar: 'KIDS_PASSWORD', ministerio: 'kids' },
} as const satisfies Record<
  string,
  { name: string; badge: string; envVar: string; ministerio: CultoTipo | null }
>;

export type UserRole = keyof typeof ROLES;

// Para middleware (Edge) y session: lista plana sin dependencias
export const VALID_ROLES = Object.keys(ROLES) as UserRole[];

export function esRolValido(v: unknown): v is UserRole {
  return typeof v === 'string' && v in ROLES;
}

// Ministerio (tipo de culto) al que está limitado un rol. null = sin límite por tipo.
export function ministerioDeRol(role: string): CultoTipo | null {
  return esRolValido(role) ? ROLES[role].ministerio : null;
}

// Kids es un ministerio como los demás (ministerio: 'kids'), pero con dos
// reglas propias: su culto lo crea y cierra el sistema junto con el dominical
// —nunca la maestra— y solo ve el que está abierto, para no tocar historial.
export function esRolKids(role: string): boolean {
  return role === 'kids';
}

// Tipos de persona (source_tipo) que Kids puede marcar presente. Los
// visitantes entran porque no traen edad ni categoría: se ven solo al activar
// "Ver todos" y ahí Kids decide si es un niño.
export const TIPOS_MARCABLES_KIDS = ['nino', 'nuevo'];

// Roles cuya única función es tomar asistencia: no ven el resto de la
// intranet (ver dashboard-sidebar.tsx y dashboard/layout.tsx).
export function soloTomaAsistencia(role: string): boolean {
  return ministerioDeRol(role) !== null || esRolKids(role);
}

// Quién abre y cierra cultos. Sirve para avisarle si dejó uno sin cerrar
// (ver lib/cultos-abiertos.ts y el aviso de la campana).
//
// Queda fuera Kids —su clase la abre y cierra el sistema junto al dominical,
// ver esRolKids()— y Oración, que no toma asistencia. El resto sí: Secretaría
// y Pastor abren el dominical, el Co-pastor puede, y cada ministerio abre su
// propia reunión (ver POST /api/cultos).
export function abreCultos(role: string): boolean {
  if (!esRolValido(role)) return false;
  return !esRolKids(role) && !esRolOracion(role);
}

// Quién da el visto bueno a una ficha nueva antes de que entre al padrón.
//
// Secretaría es la encargada habitual —mantiene los datos de las personas— y
// el Pastor puede hacerlo también si hace falta. Nadie más: antes bastaba con
// "no ser un ministerio", y eso dejaba entrar por descuido al perfil Oración,
// que no administra fichas.
//
// Toda ficha nueva nace pendiente (ver POST /api/personas), venga del
// formulario público o de la intranet. Ese paso es lo que evita que la misma
// persona entre dos veces por caminos distintos.
export function puedeAutorizarFichas(role: string): boolean {
  return role === 'somosluz' || role === 'pastor';
}

// Perfiles cuyos registros entran directo, sin esperar autorización. Solo
// Secretaría: no tiene sentido que se apruebe a sí misma.
export function registraSinAprobacion(role: string): boolean {
  return role === 'somosluz';
}

export function esRolCopastor(role: string): boolean {
  return role === 'copastor';
}

// Agenda compartida: quién confirma o rechaza una fecha propuesta.
//
// Secretaría, Pastor y Co-pastor (decisión de Iván, 29/08/2026). Es un grupo
// más amplio que el de las fichas —ahí el Co-pastor no entra— porque coordinar
// fechas es trabajo de agenda, no de padrón.
//
// Proponer, en cambio, lo puede hacer cualquier rol: ese es justamente el
// punto de la agenda, que cada ministerio avise lo suyo. Por eso no hay una
// función `puedeProponerEnAgenda`: sería `() => true`.
export function puedeAutorizarAgenda(role: string): boolean {
  return role === 'somosluz' || role === 'pastor' || role === 'copastor';
}

// Oración entra solo a su panel (/intranet/dashboard/oracion). Se bloquea
// también a nivel de ruta en dashboard/layout.tsx, no solo ocultando el menú.
export function esRolOracion(role: string): boolean {
  return role === 'oracion';
}

// Quiénes ven y gestionan el panel de oración: el Pastor (supervisa) y el
// perfil Oración (opera). Ningún otro rol lee peticiones — pueden traer
// información sensible de los miembros.
export function puedeVerOracion(role: string): boolean {
  return role === 'pastor' || esRolOracion(role);
}

// Intentos de contacto antes de tener que cerrar el caso con un desenlace.
// No es un tope arbitrario: convierte el seguimiento en un ciclo con final, en
// vez de una lista que crece para siempre.
export const MAX_CONTACTOS = 3;

// Rutas que el Co-pastor NO puede abrir. Su trabajo es el cuidado de las
// personas, no la administración: el dinero y los ajustes del sistema quedan
// fuera. Se valida también en dashboard/layout.tsx, no solo ocultando el menú.
export const RUTAS_VEDADAS_COPASTOR = [
  '/intranet/dashboard/finanzas',
  '/intranet/dashboard/reservas',
  '/intranet/dashboard/settings',
];

export function copastorPuedeVer(pathname: string): boolean {
  return !RUTAS_VEDADAS_COPASTOR.some((r) => pathname.startsWith(r));
}
