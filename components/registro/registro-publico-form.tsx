'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Loader2, Plus, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { PAISES, REGIONES } from '@/lib/chile';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: ANIO_ACTUAL - 1929 }, (_, i) => ANIO_ACTUAL - i);
const NUMS_CONVERSION = Array.from({ length: 50 }, (_, i) => i + 1);
const MAX_NINOS = 10;

interface Nino {
  nombre: string;
  sexo: string;
  dia: string;
  mes: string;
  anio: string;
}

const ninoVacio = (): Nino => ({ nombre: '', sexo: '', dia: '', mes: '', anio: '' });

const fechaDMY = (dia: string, mes: string, anio: string) =>
  dia && mes && anio ? `${dia}/${mes}/${anio}` : null;

// Selector de fecha en tres partes, igual que en la intranet: escribir una
// fecha a mano en el celular es donde más se equivoca la gente.
function SelectorFecha({
  dia, mes, anio, onChange, idBase,
}: {
  dia: string; mes: string; anio: string;
  onChange: (campo: 'dia' | 'mes' | 'anio', valor: string) => void;
  idBase: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={dia} onValueChange={(v) => onChange('dia', v)}>
        <SelectTrigger id={`${idBase}-dia`}><SelectValue placeholder="Día" /></SelectTrigger>
        <SelectContent>
          {DIAS.map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={mes} onValueChange={(v) => onChange('mes', v)}>
        <SelectTrigger id={`${idBase}-mes`}><SelectValue placeholder="Mes" /></SelectTrigger>
        <SelectContent>
          {MESES.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={anio} onValueChange={(v) => onChange('anio', v)}>
        <SelectTrigger id={`${idBase}-anio`}><SelectValue placeholder="Año" /></SelectTrigger>
        <SelectContent>
          {ANIOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function BotonesSexo({
  valor, onChange, idBase,
}: { valor: string; onChange: (v: string) => void; idBase: string }) {
  return (
    <div className="flex gap-2">
      {['Masculino', 'Femenino'].map((s) => (
        <button
          key={s}
          id={`${idBase}-${s}`}
          type="button"
          onClick={() => onChange(s)}
          aria-pressed={valor === s}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            valor === s
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          {s === 'Masculino' ? '♂ Masculino' : '♀ Femenino'}
        </button>
      ))}
    </div>
  );
}

export function RegistroPublicoForm() {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [tipo, setTipo] = useState<'adulto' | 'joven'>('adulto');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre: '', sexo: '',
    codTel: '+56', telefono: '',
    codWa: '+56', whatsapp: '',
    email: '',
    region: '', comuna: '',
    direccion: '',
    dia: '', mes: '', anio: '',
    bautizado: false,
    convNum: '', convUnidad: '',
    // '' = sin responder · 'si' = primera iglesia · 'no' = ya venía del evangelio
    primeraIglesia: '' as '' | 'si' | 'no',
  });
  // Casi siempre el WhatsApp es el mismo número. Marcado por defecto para no
  // hacer tipear dos veces lo mismo desde el celular; al desmarcar aparece el
  // campo aparte.
  const [waIgualTelefono, setWaIgualTelefono] = useState(true);
  const [ninos, setNinos] = useState<Nino[]>([]);
  // Campo trampa: una persona nunca lo ve (está fuera de pantalla). Si viene
  // con algo, quien envió es un bot.
  const [trampa, setTrampa] = useState('');

  const set = (campo: string, valor: string | boolean) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const comunas = useMemo(() => (form.region ? REGIONES[form.region] ?? [] : []), [form.region]);

  const puedeAvanzarPaso2 =
    form.nombre.trim().length > 1 && form.sexo !== '' && form.dia && form.mes && form.anio;

  async function enviar() {
    setEnviando(true);
    setError('');
    try {
      const res = await fetch('/api/registro-publico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _web: trampa,
          adulto: {
            tipo,
            nombre: form.nombre,
            sexo: form.sexo,
            fecha_nacimiento: fechaDMY(form.dia, form.mes, form.anio),
            telefono: form.telefono ? `${form.codTel} ${form.telefono}` : null,
            whatsapp: waIgualTelefono
              ? (form.telefono ? `${form.codTel} ${form.telefono}` : null)
              : (form.whatsapp ? `${form.codWa} ${form.whatsapp}` : null),
            email: form.email,
            region: form.region,
            comuna: form.comuna,
            direccion: form.direccion,
            // Nadie puede estar bautizado sin haber pisado una iglesia.
            bautizado: form.primeraIglesia === 'si' ? false : form.bautizado,
            primera_iglesia:
              form.primeraIglesia === 'si' ? true : form.primeraIglesia === 'no' ? false : null,
            // Si es su primera iglesia, el tiempo en el evangelio no aplica.
            tiempo_conversion:
              form.primeraIglesia === 'si' ? null
                : form.convNum && form.convUnidad ? `${form.convNum} ${form.convUnidad}` : null,
          },
          ninos: ninos
            .filter((n) => n.nombre.trim())
            .map((n) => ({
              nombre: n.nombre,
              sexo: n.sexo,
              fecha_nacimiento: fechaDMY(n.dia, n.mes, n.anio),
            })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 207) {
        throw new Error(data.error ?? 'No pudimos guardar tu registro.');
      }
      setListo(true);
    } catch (e: any) {
      setError(e?.message ?? 'No pudimos guardar tu registro. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <CheckCircle2 className="h-14 w-14 text-primary" aria-hidden />
          <h1 className="text-2xl font-bold text-foreground">¡Listo, {form.nombre.split(' ')[0]}!</h1>
          <p className="max-w-sm text-muted-foreground">
            Recibimos tus datos{ninos.filter((n) => n.nombre.trim()).length > 0 && ' y los de tus niños'}.
            Alguien del equipo los va a revisar. ¡Nos vemos pronto!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="Somos Luz" width={72} height={72} className="mb-3 h-16 w-auto" priority />
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Queremos conocerte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Déjanos tus datos. Toma menos de dos minutos.
        </p>
      </div>

      {/* Progreso: saber cuánto falta baja el abandono a la mitad del formulario */}
      <ol className="mb-6 flex items-center gap-2" aria-label="Progreso del registro">
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex flex-1 items-center gap-2">
            <span
              aria-current={paso === n ? 'step' : undefined}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                paso >= n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {n}
            </span>
            {n < 3 && <span className={`h-0.5 flex-1 rounded ${paso > n ? 'bg-primary' : 'bg-muted'}`} />}
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader className="p-5 md:p-6">
          <CardTitle className="text-lg">
            {paso === 1 && '¿Quién eres?'}
            {paso === 2 && 'Tus datos'}
            {paso === 3 && '¿Vienes con niños?'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {paso === 1 && 'Elige la opción que te describe'}
            {paso === 2 && 'Lo marcado con * es obligatorio'}
            {paso === 3 && 'Si no, puedes terminar aquí mismo'}
          </p>
        </CardHeader>

        <CardContent className="space-y-5 p-5 pt-0 md:p-6 md:pt-0">
          {/* Trampa para bots: fuera de pantalla, no anunciada a lectores */}
          <div className="absolute left-[-9999px]" aria-hidden>
            <label htmlFor="_web">No llenar</label>
            <input
              id="_web"
              name="_web"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={trampa}
              onChange={(e) => setTrampa(e.target.value)}
            />
          </div>

          {paso === 1 && (
            <div className="grid gap-3">
              {([
                ['adulto', 'Soy adulto', '18 años o más'],
                ['joven', 'Soy joven', 'Entre 15 y 20 años'],
              ] as const).map(([valor, titulo, ayuda]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => { setTipo(valor); setPaso(2); }}
                  className="flex items-center justify-between rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary hover:bg-muted"
                >
                  <span>
                    <span className="block font-semibold text-foreground">{titulo}</span>
                    <span className="block text-sm text-muted-foreground">{ayuda}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              ))}
              <p className="pt-2 text-center text-xs text-muted-foreground">
                Si vienes con tus hijos, los agregas en el último paso.
              </p>
            </div>
          )}

          {paso === 2 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre completo *</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                  placeholder="Ej: María Isabel García"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <BotonesSexo valor={form.sexo} onChange={(v) => set('sexo', v)} idBase="sexo" />
              </div>

              <div className="space-y-1.5">
                <Label>Fecha de nacimiento *</Label>
                <SelectorFecha
                  dia={form.dia} mes={form.mes} anio={form.anio}
                  onChange={(c, v) => set(c, v)}
                  idBase="nac"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono</Label>
                <div className="flex gap-2">
                  <Select value={form.codTel} onValueChange={(v) => set('codTel', v)}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAISES.map((p) => (
                        <SelectItem key={p.code} value={p.code}>{p.flag} {p.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="telefono"
                    value={form.telefono}
                    onChange={(e) => set('telefono', e.target.value)}
                    placeholder="9 1234 5678"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={waIgualTelefono}
                    onChange={(e) => setWaIgualTelefono(e.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <span className="text-foreground">Mi WhatsApp es el mismo número</span>
                </label>
                {!waIgualTelefono && (
                  <div className="space-y-1.5">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <div className="flex gap-2">
                      <Select value={form.codWa} onValueChange={(v) => set('codWa', v)}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAISES.map((p) => (
                            <SelectItem key={p.code} value={p.code}>{p.flag} {p.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="whatsapp"
                        value={form.whatsapp}
                        onChange={(e) => set('whatsapp', e.target.value)}
                        placeholder="9 1234 5678"
                        inputMode="tel"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Región</Label>
                  <Select value={form.region} onValueChange={(v) => { set('region', v); set('comuna', ''); }}>
                    <SelectTrigger><SelectValue placeholder="Seleccione región..." /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(REGIONES).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Comuna</Label>
                  <Select value={form.comuna} onValueChange={(v) => set('comuna', v)} disabled={!form.region}>
                    <SelectTrigger>
                      <SelectValue placeholder={form.region ? 'Seleccione comuna...' : 'Primero la región'} />
                    </SelectTrigger>
                    <SelectContent>
                      {comunas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={form.direccion}
                  onChange={(e) => set('direccion', e.target.value)}
                  placeholder="Ej: Av. Brasil 1234"
                  autoComplete="street-address"
                />
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Fe y comunidad
                </p>

                <div className="space-y-1.5">
                  <Label>¿Es tu primera vez en una iglesia cristiana?</Label>
                  <div className="flex gap-2">
                    {/* Solo "Sí" y "No" — mismo criterio que la intranet (reunión 24/08/2026). */}
                    {([['si', 'Sí'], ['no', 'No']] as const).map(([valor, texto]) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => set('primeraIglesia', form.primeraIglesia === valor ? '' : valor)}
                        aria-pressed={form.primeraIglesia === valor}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          form.primeraIglesia === valor
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {texto}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Solo aplica a quien ya venía del evangelio */}
                <div className={`space-y-1.5 ${form.primeraIglesia === 'si' ? 'hidden' : ''}`}>
                  <Label>Tiempo de conversión</Label>
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
                  <p className="text-xs text-muted-foreground">
                    Hace cuánto tomaste la decisión de seguir a Cristo.
                  </p>
                </div>

                {/* Depende de la primera pregunta: el bautismo ocurre EN una
                    iglesia, así que a quien nunca ha ido no se le pregunta. */}
                <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg border border-border p-3 ${form.primeraIglesia === 'si' ? 'hidden' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.bautizado}
                    onChange={(e) => set('bautizado', e.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <span className="text-sm text-foreground">Ya fui bautizado</span>
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setPaso(1)} className="gap-1">
                  <ArrowLeft className="h-4 w-4" aria-hidden /> Atrás
                </Button>
                <Button onClick={() => setPaso(3)} disabled={!puedeAvanzarPaso2} className="flex-1 gap-1">
                  Continuar <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              {!puedeAvanzarPaso2 && (
                <p className="text-center text-xs text-muted-foreground">
                  Completa nombre, sexo y fecha de nacimiento para continuar.
                </p>
              )}
            </>
          )}

          {paso === 3 && (
            <>
              {ninos.length === 0 ? (
                <p className="rounded-lg bg-muted/60 p-4 text-center text-sm text-muted-foreground">
                  Si vienes con niños menores de 15, agrégalos aquí. Tú quedas como su apoderado.
                </p>
              ) : (
                <div className="space-y-4">
                  {ninos.map((n, i) => (
                    <div key={i} className="space-y-3 rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Niño {i + 1}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setNinos((prev) => prev.filter((_, j) => j !== i))}
                          aria-label={`Quitar niño ${i + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`nino-${i}-nombre`}>Nombre completo</Label>
                        <Input
                          id={`nino-${i}-nombre`}
                          value={n.nombre}
                          onChange={(e) => setNinos((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))}
                          placeholder="Nombre del niño"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Sexo</Label>
                        <BotonesSexo
                          valor={n.sexo}
                          onChange={(v) => setNinos((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, sexo: v } : x)))}
                          idBase={`nino-${i}-sexo`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Fecha de nacimiento</Label>
                        <SelectorFecha
                          dia={n.dia} mes={n.mes} anio={n.anio}
                          onChange={(campo, valor) => setNinos((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)))}
                          idBase={`nino-${i}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ninos.length < MAX_NINOS && (
                <Button
                  variant="outline"
                  onClick={() => setNinos((prev) => [...prev, ninoVacio()])}
                  className="w-full gap-1"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  {ninos.length === 0 ? 'Agregar un niño' : 'Agregar otro niño'}
                </Button>
              )}

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setPaso(2)} disabled={enviando} className="gap-1">
                  <ArrowLeft className="h-4 w-4" aria-hidden /> Atrás
                </Button>
                <Button onClick={enviar} disabled={enviando} className="flex-1">
                  {enviando
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                    : 'Enviar mi registro'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Tus datos son solo para uso interno de la iglesia. No los compartimos con nadie.
      </p>
    </>
  );
}
