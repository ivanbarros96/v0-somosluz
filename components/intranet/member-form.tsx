'use client';

import { useState, useEffect } from 'react';
import { useMembers } from '@/lib/members-store';
import type { Member, AdultoMember, NinoMember } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Modo = 'adulto' | 'nino' | 'nuevo';

interface MemberFormProps {
  member?: Member | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PAISES = [
  { flag: '🇨🇱', code: '+56' },
  { flag: '🇻🇪', code: '+58' },
  { flag: '🇵🇪', code: '+51' },
  { flag: '🇨🇴', code: '+57' },
  { flag: '🇧🇴', code: '+591' },
  { flag: '🇭🇹', code: '+509' },
  { flag: '🇦🇷', code: '+54' },
  { flag: '🇧🇷', code: '+55' },
  { flag: '🇪🇨', code: '+593' },
  { flag: '🇩🇴', code: '+1' },
];

const REGIONES: Record<string, string[]> = {
  'Arica y Parinacota': ['Arica', 'Camarones', 'Putre', 'General Lagos'],
  'Tarapacá': ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Camiña', 'Colchane', 'Huara', 'Pica'],
  'Antofagasta': ['Antofagasta', 'Mejillones', 'Sierra Gorda', 'Taltal', 'Calama', 'Ollagüe', 'San Pedro de Atacama', 'Tocopilla', 'María Elena'],
  'Atacama': ['Copiapó', 'Caldera', 'Tierra Amarilla', 'Chañaral', 'Diego de Almagro', 'Vallenar', 'Alto del Carmen', 'Freirina', 'Huasco'],
  'Coquimbo': ['La Serena', 'Coquimbo', 'Andacollo', 'La Higuera', 'Paihuano', 'Vicuña', 'Illapel', 'Canela', 'Los Vilos', 'Salamanca', 'Ovalle', 'Combarbalá', 'Monte Patria', 'Punitaqui', 'Río Hurtado'],
  'Valparaíso': ['Valparaíso', 'Casablanca', 'Concón', 'Juan Fernández', 'Puchuncaví', 'Quintero', 'Viña del Mar', 'Los Andes', 'Calle Larga', 'Rinconada', 'San Esteban', 'La Ligua', 'Cabildo', 'Papudo', 'Petorca', 'Zapallar', 'Quillota', 'Calera', 'Hijuelas', 'La Cruz', 'Limache', 'Nogales', 'Olmué', 'San Antonio', 'Algarrobo', 'Cartagena', 'El Quisco', 'El Tabo', 'Santo Domingo', 'San Felipe', 'Catemu', 'Llaillay', 'Panquehue', 'Putaendo', 'Santa María', 'Quilpué', 'Villa Alemana'],
  'Región Metropolitana': ['Santiago', 'Cerrillos', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central', 'Huechuraba', 'Independencia', 'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'La Reina', 'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul', 'Maipú', 'Ñuñoa', 'Pedro Aguirre Cerda', 'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca', 'San Joaquín', 'San Miguel', 'San Ramón', 'Vitacura', 'Puente Alto', 'Pirque', 'San José de Maipo', 'Colina', 'Lampa', 'Tiltil', 'San Bernardo', 'Buin', 'Calera de Tango', 'Paine', 'Melipilla', 'Alhué', 'Curacaví', 'María Pinto', 'San Pedro', 'Talagante', 'El Monte', 'Isla de Maipo', 'Padre Hurtado', 'Peñaflor'],
  "O'Higgins": ['Rancagua', 'Codegua', 'Coinco', 'Coltauco', 'Doñihue', 'Graneros', 'Las Cabras', 'Machalí', 'Malloa', 'Mostazal', 'Olivar', 'Peumo', 'Pichidegua', 'Quinta de Tilcoco', 'Rengo', 'Requínoa', 'San Vicente', 'Pichilemu', 'La Estrella', 'Litueche', 'Marchihue', 'Navidad', 'Paredones', 'San Fernando', 'Chépica', 'Chimbarongo', 'Lolol', 'Nancagua', 'Palmilla', 'Peralillo', 'Placilla', 'Pumanque', 'Santa Cruz'],
  'Maule': ['Talca', 'Constitución', 'Curepto', 'Empedrado', 'Maule', 'Pelarco', 'Pencahue', 'Río Claro', 'San Clemente', 'San Rafael', 'Cauquenes', 'Chanco', 'Pelluhue', 'Curicó', 'Hualañé', 'Licantén', 'Molina', 'Rauco', 'Romeral', 'Sagrada Familia', 'Teno', 'Vichuquén', 'Linares', 'Colbún', 'Longaví', 'Parral', 'Retiro', 'San Javier', 'Villa Alegre', 'Yerbas Buenas'],
  'Ñuble': ['Chillán', 'Bulnes', 'Chillán Viejo', 'El Carmen', 'Pemuco', 'Pinto', 'Quillón', 'San Ignacio', 'Yungay', 'Cobquecura', 'Coelemu', 'Ninhue', 'Portezuelo', 'Quirihue', 'Ránquil', 'Treguaco', 'Coihueco', 'Ñiquén', 'San Carlos', 'San Fabián', 'San Nicolás'],
  'Biobío': ['Concepción', 'Coronel', 'Chiguayante', 'Florida', 'Hualqui', 'Lota', 'Penco', 'San Pedro de la Paz', 'Santa Juana', 'Talcahuano', 'Tomé', 'Hualpén', 'Lebu', 'Arauco', 'Cañete', 'Contulmo', 'Curanilahue', 'Los Álamos', 'Tirúa', 'Los Ángeles', 'Antuco', 'Cabrero', 'Laja', 'Mulchén', 'Nacimiento', 'Negrete', 'Quilaco', 'Quilleco', 'San Rosendo', 'Santa Bárbara', 'Tucapel', 'Yumbel', 'Alto Biobío'],
  'La Araucanía': ['Temuco', 'Carahue', 'Cunco', 'Curarrehue', 'Freire', 'Galvarino', 'Gorbea', 'Lautaro', 'Loncoche', 'Melipeuco', 'Nueva Imperial', 'Padre las Casas', 'Perquenco', 'Pitrufquén', 'Pucón', 'Saavedra', 'Teodoro Schmidt', 'Toltén', 'Vilcún', 'Villarrica', 'Cholchol', 'Angol', 'Collipulli', 'Curacautín', 'Ercilla', 'Lonquimay', 'Los Sauces', 'Lumaco', 'Purén', 'Renaico', 'Traiguén', 'Victoria'],
  'Los Ríos': ['Valdivia', 'Corral', 'Futrono', 'La Unión', 'Lago Ranco', 'Lanco', 'Los Lagos', 'Máfil', 'Mariquina', 'Paillaco', 'Panguipulli', 'Río Bueno'],
  'Los Lagos': ['Puerto Montt', 'Calbuco', 'Cochamó', 'Fresia', 'Frutillar', 'Los Muermos', 'Llanquihue', 'Maullín', 'Puerto Varas', 'Castro', 'Ancud', 'Chonchi', 'Curaco de Vélez', 'Dalcahue', 'Puqueldón', 'Queilén', 'Quellón', 'Quémchi', 'Quinchao', 'Osorno', 'Puerto Octay', 'Purranque', 'Puyehue', 'Río Negro', 'San Juan de la Costa', 'San Pablo', 'Chaitén', 'Futaleufú', 'Hualaihué', 'Palena'],
  'Aysén': ['Coyhaique', 'Lago Verde', 'Aysén', 'Cisnes', 'Guaitecas', 'Cochrane', "O'Higgins", 'Tortel', 'Chile Chico', 'Río Ibáñez'],
  'Magallanes': ['Punta Arenas', 'Laguna Blanca', 'Río Verde', 'San Gregorio', 'Cabo de Hornos', 'Antártica', 'Porvenir', 'Primavera', 'Timaukel', 'Natales', 'Torres del Paine'],
};

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);
const ANIOS = Array.from({ length: new Date().getFullYear() - 1929 }, (_, i) => new Date().getFullYear() - i);
const NUMS_CONVERSION = Array.from({ length: 50 }, (_, i) => i + 1);

function emptyForm() {
  return {
    nombre: '',
    sexo: '',
    codTel: '+56', telefono: '',
    codWa: '+56', whatsapp: '',
    email: '',
    region: '', comuna: '',
    direccion: '',
    bautizado: false,
    convNum: '', convUnidad: '',
    dia: '', mes: '', anio: '',
    nombre_apoderado: '',
    telefono_apoderado: '',
  };
}

function parseTelefono(full: string | null) {
  if (!full) return { code: '+56', num: '' };
  const p = PAISES.find((p) => full.startsWith(p.code));
  if (p) return { code: p.code, num: full.slice(p.code.length).trim() };
  return { code: '+56', num: full.trim() };
}

function calcEdad(d: number, m: number, a: number) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - a;
  const dm = hoy.getMonth() + 1 - m;
  if (dm < 0 || (dm === 0 && hoy.getDate() < d)) edad--;
  return edad;
}

function parseTiempoConversion(val: string | null) {
  if (!val) return { num: '', unidad: '' };
  const parts = val.trim().split(' ');
  return { num: parts[0] ?? '', unidad: parts[1] ?? '' };
}

export function MemberForm({ member, onSuccess, onCancel }: MemberFormProps) {
  const { addMember, updateMember } = useMembers();
  const isEditing = !!member;

  const [modo, setModo] = useState<Modo>(() => {
    if (!member) return 'adulto';
    return member.tipo === 'nino' ? 'nino' : 'adulto';
  });

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!member) { setForm(emptyForm()); return; }
    const tel = parseTelefono(member.telefono);
    const base = {
      nombre: member.nombre ?? '',
      sexo: member.sexo ?? '',
      codTel: tel.code, telefono: tel.num,
      codWa: '+56', whatsapp: '',
      email: member.email ?? '',
      region: member.region ?? '',
      comuna: member.comuna ?? '',
      direccion: member.direccion ?? '',
      bautizado: false,
      convNum: '', convUnidad: '',
      dia: '', mes: '', anio: '',
      nombre_apoderado: '',
      telefono_apoderado: '',
    };

    if (member.tipo === 'adulto') {
      const a = member as AdultoMember;

      // WhatsApp
      const wa = parseTelefono(a.whatsapp);
      base.codWa = wa.code;
      base.whatsapp = wa.num;

      // Bautizado
      base.bautizado = a.bautizado === 'si';

      // Tiempo conversión
      const conv = parseTiempoConversion(a.tiempo_conversion);
      base.convNum = conv.num;
      base.convUnidad = conv.unidad;

      // ✅ Fecha nacimiento adulto
      const fechaAdulto = (a as any).fecha_nacimiento ?? null;
      if (fechaAdulto) {
        const [d, m, an] = fechaAdulto.split('/');
        base.dia = d ?? '';
        base.mes = m ?? '';
        base.anio = an ?? '';
      }
    }

    if (member.tipo === 'nino') {
      const n = member as NinoMember;
      if (n.fecha_nacimiento) {
        const [d, m, a] = n.fecha_nacimiento.split('/');
        base.dia = d ?? '';
        base.mes = m ?? '';
        base.anio = a ?? '';
      }
      base.nombre_apoderado = n.nombre_apoderado ?? '';
      const apo = parseTelefono(n.telefono_apoderado);
      base.telefono_apoderado = apo.num;
    }

    setForm(base);
  }, [member]);

  const set = (key: string, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleRegionChange = (val: string) => {
    setForm((f) => ({ ...f, region: val, comuna: '' }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setOk(false);
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (modo !== 'nuevo' && !form.sexo) { setError('Selecciona el sexo.'); return; }
    if (modo === 'nino' && !form.nombre_apoderado.trim()) { setError('El nombre del apoderado es obligatorio.'); return; }

    setLoading(true);
    try {
      const telFull = form.telefono ? `${form.codTel} ${form.telefono}` : null;
      const waFull = form.whatsapp
        ? `${form.codWa} ${form.whatsapp}`
        : form.telefono
          ? `${form.codTel} ${form.telefono}`
          : null;
      const convFull = (form.convNum && form.convUnidad)
        ? `${form.convNum} ${form.convUnidad}` : null;

      if (form.email.trim()) {
        const { data: existing } = await supabase
          .from('personas')
          .select('id, nombre')
          .eq('email', form.email.trim().toLowerCase())
          .neq('id', member?.id ?? 0)
          .single();
        if (existing) {
          setError(`Este email ya está registrado para: ${existing.nombre}`);
          setLoading(false);
          return;
        }
      }

      const fecha = (form.dia && form.mes && form.anio)
        ? `${form.dia}/${form.mes}/${form.anio}` : null;
      const edad = (form.dia && form.mes && form.anio)
        ? calcEdad(+form.dia, +form.mes, +form.anio) : null;

      if (modo === 'nino') {
        const data: Omit<NinoMember, 'id' | 'created_at'> = {
          tipo: 'nino',
          source_id: member?.source_id ?? undefined,
          fecha_registro: member?.fecha_registro ?? new Date().toISOString(),
          nombre: form.nombre.trim(),
          sexo: form.sexo || null,
          telefono: telFull,
          whatsapp: null,
          email: null,
          region: null, comuna: null, direccion: null,
          fecha_nacimiento: fecha,
          edad,
          nombre_apoderado: form.nombre_apoderado.trim() || null,
          telefono_apoderado: form.telefono_apoderado
            ? `${form.codTel} ${form.telefono_apoderado}` : null,
        };
        isEditing ? await updateMember(member!.id, data) : await addMember(data);
      } else {
        const data: Omit<AdultoMember, 'id' | 'created_at'> = {
          tipo: 'adulto',
          source_id: member?.source_id ?? undefined,
          fecha_registro: member?.fecha_registro ?? new Date().toISOString(),
          nombre: form.nombre.trim(),
          sexo: modo === 'nuevo' ? null : form.sexo || null,
          telefono: telFull,
          whatsapp: waFull,
          email: form.email.trim() || null,
          region: form.region || null,
          comuna: form.comuna || null,
          direccion: form.direccion.trim() || null,
          bautizado: form.bautizado ? 'si' : 'no',
          tiempo_conversion: convFull,
          fecha_nacimiento: fecha,
          edad,
        } as any;
        isEditing ? await updateMember(member!.id, data) : await addMember(data);
      }

      setOk(true);
      if (!isEditing) setForm(emptyForm());
      onSuccess?.();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar.');
    } finally {
      setLoading(false);
    }
  }

  const comunas = form.region ? (REGIONES[form.region] ?? []) : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {!isEditing && (
        <Tabs value={modo} onValueChange={(v) => { setModo(v as Modo); setError(''); setOk(false); }}>
          <TabsList className="w-full">
            <TabsTrigger value="adulto" className="flex-1">👤 Adulto</TabsTrigger>
            <TabsTrigger value="nino" className="flex-1">🧒 Niño / Joven</TabsTrigger>
            <TabsTrigger value="nuevo" className="flex-1">✨ Nuevo</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
            {modo === 'nino' ? 'Datos del Niño / Joven' : 'Datos Personales'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-1">
            <Label>Nombre Completo <span className="text-red-500">*</span></Label>
            <Input
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Ej: María Isabel García"
            />
          </div>

          {modo !== 'nuevo' && (
            <div className="space-y-1">
              <Label>Fecha de Nacimiento</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={form.dia} onValueChange={(v) => set('dia', v)}>
                  <SelectTrigger><SelectValue placeholder="Día" /></SelectTrigger>
                  <SelectContent>
                    {DIAS.map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.mes} onValueChange={(v) => set('mes', v)}>
                  <SelectTrigger><SelectValue placeholder="Mes" /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.anio} onValueChange={(v) => set('anio', v)}>
                  <SelectTrigger><SelectValue placeholder="Año" /></SelectTrigger>
                  <SelectContent>
                    {ANIOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {modo !== 'nuevo' && (
            <div className="space-y-1">
              <Label>Sexo <span className="text-red-500">*</span></Label>
              <div className="flex gap-3">
                {['Masculino', 'Femenino'].map((s) => (
                  <button
                    key={s} type="button"
                    onClick={() => set('sexo', s)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors
                      ${form.sexo === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {s === 'Masculino' ? '♂ Masculino' : '♀ Femenino'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {modo === 'adulto' && (
            <div className="border-t pt-4 space-y-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Fe y Comunidad</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Tiempo de Conversión</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={form.convNum} onValueChange={(v) => set('convNum', v)}>
                      <SelectTrigger><SelectValue placeholder="N°" /></SelectTrigger>
                      <SelectContent>
                        {NUMS_CONVERSION.map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={form.convUnidad} onValueChange={(v) => set('convUnidad', v)}>
                      <SelectTrigger><SelectValue placeholder="Unidad" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Meses">Meses</SelectItem>
                        <SelectItem value="Años">Años</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>¿Bautizado/a?</Label>
                  <div
                    onClick={() => set('bautizado', !form.bautizado)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none
                      ${form.bautizado ? 'bg-primary/10 border-primary' : 'bg-muted border-border'}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0
                      ${form.bautizado ? 'bg-primary border-primary' : 'bg-white border-border'}`}>
                      {form.bautizado && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">Sí, está bautizado/a</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {modo === 'nino' && (
            <div className="border-t pt-4 space-y-4">
              <p className="text-xs uppercase tracking-widest font-semibold text-purple-700">
                Datos del Apoderado
              </p>
              <div className="space-y-1">
                <Label>Nombre del Apoderado <span className="text-red-500">*</span></Label>
                <Input
                  value={form.nombre_apoderado}
                  onChange={(e) => set('nombre_apoderado', e.target.value)}
                  placeholder="Ej: Juan Carlos García"
                />
              </div>
              <div className="space-y-1">
                <Label>Teléfono del Apoderado</Label>
                <div className="flex gap-2">
                  <Select value={form.codTel} onValueChange={(v) => set('codTel', v)}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAISES.map((p) => <SelectItem key={p.code} value={p.code}>{p.flag} {p.code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={form.telefono_apoderado}
                    onChange={(e) => set('telefono_apoderado', e.target.value)}
                    placeholder="9 1234 5678"
                    className="flex-1"
                    inputMode="tel"
                  />
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-1">
            <Label>Teléfono</Label>
            <div className="flex gap-2">
              <Select value={form.codTel} onValueChange={(v) => set('codTel', v)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAISES.map((p) => <SelectItem key={p.code} value={p.code}>{p.flag} {p.code}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
                placeholder="9 1234 5678"
                className="flex-1"
                inputMode="tel"
              />
            </div>
          </div>

          {(modo === 'adulto' || modo === 'nuevo') && (
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
          )}

          {modo === 'adulto' && (
            <>
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <div className="flex gap-2">
                  <Select value={form.codWa} onValueChange={(v) => set('codWa', v)}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAISES.map((p) => <SelectItem key={p.code} value={p.code}>{p.flag} {p.code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => set('whatsapp', e.target.value)}
                    placeholder="9 1234 5678"
                    className="flex-1"
                    inputMode="tel"
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Ubicación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Región</Label>
                    <Select value={form.region} onValueChange={handleRegionChange}>
                      <SelectTrigger><SelectValue placeholder="Seleccione región..." /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(REGIONES).map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Comuna</Label>
                    <Select
                      value={form.comuna}
                      onValueChange={(v) => set('comuna', v)}
                      disabled={!form.region}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={form.region ? 'Seleccione comuna...' : 'Primero seleccione región'} />
                      </SelectTrigger>
                      <SelectContent>
                        {comunas.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Dirección</Label>
                  <Input
                    value={form.direccion}
                    onChange={(e) => set('direccion', e.target.value)}
                    placeholder="Ej: Av. Brasil 1234"
                  />
                </div>
              </div>
            </>
          )}

        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          ⚠ {error}
        </div>
      )}
      {ok && !isEditing && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          ✓ Miembro registrado exitosamente
        </div>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isEditing
            ? 'Guardar Cambios ✓'
            : modo === 'nino'
              ? 'Registrar Niño/Joven ✓'
              : modo === 'nuevo'
                ? 'Registrar Visita ✓'
                : 'Registrar Miembro ✓'}
        </Button>
      </div>

    </form>
  );
}