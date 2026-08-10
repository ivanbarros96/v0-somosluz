import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// POST /api/registro-publico — ÚNICO endpoint de la app SIN sesión que escribe
// en la base. Todo lo que entra queda con pendiente_revision=true, así que no
// aparece en listados, asistencia ni estadísticas hasta que alguien lo apruebe
// desde la intranet.
//
// Reglas de seguridad que sostienen eso:
//  - Es solo de ESCRITURA. Nunca devuelve datos de la congregación: ni
//    confirma si un nombre ya existe (eso filtraría quién es miembro), ni
//    ofrece autocompletar de apoderados. El apoderado de un niño es siempre
//    el adulto que está llenando el formulario, así que no hace falta
//    mostrarle ninguna lista a un desconocido.
//  - Campo trampa (honeypot): invisible para una persona, los bots lo llenan.
//  - Freno global: si llegan demasiados registros en poco rato, se corta.
//  - Todo se recorta a largos máximos antes de guardar.

const MAX_NINOS = 10;
const MAX_TEXTO = 120;
const MAX_DIRECCION = 200;

// Freno de emergencia: más de esto en la ventana y se rechaza. No es un límite
// por persona (una familia entera puede registrarse junta) sino contra una
// inundación automatizada.
const VENTANA_MINUTOS = 10;
const MAX_EN_VENTANA = 25;

const TIPOS_PERSONA = ['adulto', 'joven'] as const;
const SEXOS = ['Masculino', 'Femenino'] as const;

const texto = (v: unknown, max = MAX_TEXTO): string | null => {
  if (typeof v !== 'string') return null;
  const limpio = v.trim().slice(0, max);
  return limpio.length > 0 ? limpio : null;
};

// Acepta solo DD/MM/AAAA, que es lo que entiende el trigger
// personas_sync_fecha_nac (via parse_fecha_dmy) para derivar fecha_nac y el
// cumpleaños. Una fecha inválida se guarda como null en vez de romper.
function fechaValida(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mes, anio] = m.map(Number) as unknown as [string, number, number, number];
  if (mes < 1 || mes > 12 || d < 1 || d > 31) return null;
  const anioActual = new Date().getFullYear();
  if (anio < 1900 || anio > anioActual) return null;
  const fecha = new Date(anio, mes - 1, d);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== d) return null;
  return `${d}/${mes}/${anio}`;
}

function edadDesde(fecha: string | null): number | null {
  if (!fecha) return null;
  const [d, m, a] = fecha.split('/').map(Number);
  const hoy = new Date();
  let edad = hoy.getFullYear() - a;
  const cumplioEsteAnio =
    hoy.getMonth() + 1 > m || (hoy.getMonth() + 1 === m && hoy.getDate() >= d);
  if (!cumplioEsteAnio) edad -= 1;
  return edad >= 0 && edad < 120 ? edad : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  // Honeypot: el formulario lo pinta fuera de pantalla y una persona nunca lo
  // ve. Si viene con algo, es un bot. Se responde ok para no enseñarle que fue
  // detectado, pero no se guarda nada.
  if (texto((body as { _web?: unknown })._web)) {
    return NextResponse.json({ ok: true });
  }

  const adulto = (body as { adulto?: Record<string, unknown> }).adulto;
  if (!adulto || typeof adulto !== 'object') {
    return NextResponse.json({ error: 'Faltan tus datos' }, { status: 400 });
  }

  const nombre = texto(adulto.nombre);
  if (!nombre) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }

  const tipo = TIPOS_PERSONA.includes(adulto.tipo as (typeof TIPOS_PERSONA)[number])
    ? (adulto.tipo as string)
    : 'adulto';
  const sexo = SEXOS.includes(adulto.sexo as (typeof SEXOS)[number]) ? (adulto.sexo as string) : null;
  if (!sexo) {
    return NextResponse.json({ error: 'Falta indicar el sexo' }, { status: 400 });
  }

  const ninosRaw = Array.isArray((body as { ninos?: unknown[] }).ninos)
    ? ((body as { ninos: unknown[] }).ninos as Record<string, unknown>[])
    : [];
  if (ninosRaw.length > MAX_NINOS) {
    return NextResponse.json(
      { error: `Puedes registrar hasta ${MAX_NINOS} niños a la vez` },
      { status: 400 },
    );
  }

  const db = getSupabaseAdmin();

  // Freno global contra inundación automatizada.
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60_000).toISOString();
  const { count } = await db
    .from('personas')
    .select('id', { count: 'exact', head: true })
    .eq('origen', 'publico')
    .gte('created_at', desde);
  if ((count ?? 0) >= MAX_EN_VENTANA) {
    return NextResponse.json(
      { error: 'Estamos recibiendo muchos registros. Intenta de nuevo en unos minutos.' },
      { status: 429 },
    );
  }

  const fechaAdulto = fechaValida(adulto.fecha_nacimiento);
  const telefonoAdulto = texto(adulto.telefono, 40);
  const ahora = new Date().toISOString();

  const comun = { pendiente_revision: true, origen: 'publico', fecha_registro: ahora };

  const filaAdulto = {
    ...comun,
    source_tipo: tipo,
    nombre,
    sexo,
    fecha_nacimiento: fechaAdulto,
    edad: edadDesde(fechaAdulto),
    telefono: telefonoAdulto,
    whatsapp: texto(adulto.whatsapp, 40) ?? telefonoAdulto,
    email: texto(adulto.email)?.toLowerCase() ?? null,
    region: texto(adulto.region),
    comuna: texto(adulto.comuna),
    direccion: texto(adulto.direccion, MAX_DIRECCION),
    bautizado: adulto.bautizado === true ? 'si' : 'no',
  };

  const { data: creado, error } = await db
    .from('personas')
    .insert(filaAdulto)
    .select('id')
    .single();
  if (error || !creado) {
    return NextResponse.json(
      { error: 'No se pudo guardar tu registro. Intenta de nuevo.' },
      { status: 500 },
    );
  }

  // Los niños se cuelgan del adulto que llenó el formulario: él es el
  // apoderado, por eso nunca hace falta exponer la lista de miembros.
  const ninos = ninosRaw
    .map((n) => {
      const nombreNino = texto(n.nombre);
      if (!nombreNino) return null;
      const f = fechaValida(n.fecha_nacimiento);
      return {
        ...comun,
        source_tipo: 'nino',
        nombre: nombreNino,
        sexo: SEXOS.includes(n.sexo as (typeof SEXOS)[number]) ? (n.sexo as string) : null,
        fecha_nacimiento: f,
        edad: edadDesde(f),
        nombre_apoderado: nombre,
        telefono_apoderado: telefonoAdulto,
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  if (ninos.length > 0) {
    const { error: errNinos } = await db.from('personas').insert(ninos);
    if (errNinos) {
      // El adulto ya quedó guardado; se avisa para que reintente solo los
      // niños en vez de perder todo lo que escribió.
      return NextResponse.json(
        {
          ok: true,
          aviso: 'Tu registro se guardó, pero no pudimos guardar a los niños. Avísale a alguien del equipo.',
        },
        { status: 207 },
      );
    }
  }

  return NextResponse.json({ ok: true, ninos: ninos.length });
}
