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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

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
    tiempo_conversion: '',
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
      tiempo_conversion: '',
      dia: '', mes: '', anio: '',
      nombre_apoderado: '',
      telefono_apoderado: '',
    };
    if (member.tipo === 'adulto') {
      const a = member as AdultoMember;
      const wa = parseTelefono(a.whatsapp);
      base.codWa = wa.code;
      base.whatsapp = wa.num;
      base.bautizado = a.bautizado === 'si';
      base.tiempo_conversion = a.tiempo_conversion ?? '';
    }
    if (member.tipo === 'nino') {
      const n = member as NinoMember;
      if (n.fecha_nacimiento) {
        const [d, m, a] = n.fecha_nacimiento.split('/');
        base.dia = d ?? ''; base.mes = m ?? ''; base.anio = a ?? '';
      }
      base.nombre_apoderado = n.nombre_apoderado ?? '';
      const apo = parseTelefono(n.telefono_apoderado);
      base.telefono_apoderado = apo.num;
    }
    setForm(base);
  }, [member]);

  const set = (key: string, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setOk(false);
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (modo !== 'nuevo' && !form.sexo) { setError('Selecciona el sexo.'); return; }
    if (modo === 'nino' && !form.nombre_apoderado.trim()) { setError('El nombre del apoderado es obligatorio.'); return; }

    setLoading(true);
    try {
      const telFull = form.telefono ? `${form.codTel} ${form.telefono}` : null;
      const waFull = form.whatsapp ? `${form.codWa} ${form.whatsapp}` : null;

      if (modo === 'nino') {
        const fecha = (form.dia && form.mes && form.anio)
          ? `${form.dia}/${form.mes}/${form.anio}` : null;
        const edad = (form.dia && form.mes && form.anio)
          ? calcEdad(+form.dia, +form.mes, +form.anio) : null;
        const data: Omit<NinoMember, 'id' | 'created_at'> = {
          tipo: 'nino',
          source_id: member?.source_id ?? null,
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
          source_id: member?.source_id ?? null,
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
          tiempo_conversion: form.tiempo_conversion || null,
        };
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

  const dias = Array.from({ length: 31 }, (_, i) => i + 1);
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const anios = Array.from({ length: new Date().getFullYear() - 1929 }, (_, i) => new Date().getFullYear() - i);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Toggle modo — solo en registro nuevo */}
      {!isEditing && (
        <Tabs value={modo} onValueChange={(v) => { setModo(v as Modo); setError(''); setOk(false); }}>
          <TabsList className="w-full">
            <TabsTrigger value="adulto" className="flex-1">👤 Adulto</TabsTrigger>
            <TabsTrigger value="nino" className="flex-1">🧒 Niño / Joven</TabsTrigger>
            <TabsTrigger value="nuevo" className="flex-1">✨ Nuevo</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Card datos personales */}
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

          {/* Fecha nacimiento — solo niño */}
          {modo === 'nino' && (
            <div className="space-y-1">
              <Label>Fecha de Nacimiento</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={form.dia} onValueChange={(v) => set('dia', v)}>
                  <SelectTrigger><SelectValue placeholder="Día" /></SelectTrigger>
                  <SelectContent>{dias.map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.mes} onValueChange={(v) => set('mes', v)}>
                  <SelectTrigger><SelectValue placeholder="Mes" /></SelectTrigger>
                  <SelectContent>{meses.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.anio} onValueChange={(v) => set('anio', v)}>
                  <SelectTrigger><SelectValue placeholder="Año" /></SelectTrigger>
                  <SelectContent>{anios.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Sexo — no en nuevo */}
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

          {/* Fe y comunidad — solo adulto */}
          {modo === 'adulto' && (
            <div className="border-t pt-4 space-y-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Fe y Comunidad</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Tiempo de Conversión</Label>
                  <Input
                    value={form.tiempo_conversion}
                    onChange={(e) => set('tiempo_conversion', e.target.value)}
                    placeholder="Ej: 3 Años"
                  />
                </div>
                <div className="space-y-1">
                  <Label>¿Bautizado/a?</Label>
                  <div
                    onClick={() => set('bautizado', !form.bautizado)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${form.bautizado ? 'bg-primary/10 border-primary' : 'bg-muted border-border'}`}
                  >
                    <Checkbox checked={form.bautizado as boolean} readOnly />
                    <span className="text-sm">Sí, está bautizado/a</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Apoderado — solo niño */}
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

      {/* Card contacto */}
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
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </>
          )}

          {modo === 'nuevo' && (
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

          {/* Ubicación — solo adulto */}
          {modo === 'adulto' && (
            <div className="border-t pt-4 space-y-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Ubicación</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Región</Label>
                  <Input value={form.region} onChange={(e) => set('region', e.target.value)} placeholder="Ej: Valparaíso" />
                </div>
                <div className="space-y-1">
                  <Label>Comuna</Label>
                  <Input value={form.comuna} onChange={(e) => set('comuna', e.target.value)} placeholder="Ej: Viña del Mar" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Dirección</Label>
                <Input value={form.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Ej: Av. Brasil 1234" />
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Mensajes */}
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

      {/* Botones */}
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