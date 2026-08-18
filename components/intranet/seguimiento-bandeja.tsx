'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MAX_CONTACTOS } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  PhoneCall, MessageCircle, Users, Loader2, CheckCircle2, XCircle, PhoneOff, Plus,
} from 'lucide-react';

export type Canal = 'llamada' | 'whatsapp' | 'presencial';
export type Resultado = 'contesto' | 'no_contesto' | 'mensaje';
export type Desenlace = 'volvio' | 'se_retiro' | 'sin_contacto';

export interface Contacto {
  id: number;
  canal: Canal;
  resultado: Resultado;
  nota: string | null;
  created_at: string;
}

export interface CasoEnBandeja {
  personaId: number;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  /** Por qué está en la bandeja, en palabras. Ej: "No viene hace 6 domingos" */
  razon: string;
  motivo: 'ausencia' | 'nuevo_en_la_fe';
  casoId: number | null;
  contactos: Contacto[];
}

export const CANAL_LABEL: Record<Canal, string> = {
  llamada: 'Llamada', whatsapp: 'WhatsApp', presencial: 'En persona',
};
export const RESULTADO_LABEL: Record<Resultado, string> = {
  contesto: 'Contestó', no_contesto: 'No contestó', mensaje: 'Dejé mensaje',
};
const DESENLACE_LABEL: Record<Desenlace, string> = {
  volvio: 'Volvió a la iglesia',
  se_retiro: 'Se retiró',
  sin_contacto: 'No se logró contacto',
};

const soloDigitos = (t: string) => t.replace(/\D/g, '');
const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });

/**
 * Bandeja de trabajo del Co-pastor: una sola lista con todos los casos, cada
 * uno etiquetado con POR QUÉ está ahí. La acción siempre es la misma —
 * contactar a la persona— aunque la conversación cambie según el motivo.
 *
 * `soloLectura` = vista del Pastor: ve el trabajo hecho pero no registra.
 */
export function SeguimientoBandeja({
  casos, soloLectura = false, onCambio,
}: {
  casos: CasoEnBandeja[];
  soloLectura?: boolean;
  onCambio?: () => void;
}) {
  const [registrando, setRegistrando] = useState<CasoEnBandeja | null>(null);
  const [cerrando, setCerrando] = useState<CasoEnBandeja | null>(null);
  const [canal, setCanal] = useState<Canal>('llamada');
  const [resultado, setResultado] = useState<Resultado>('contesto');
  const [nota, setNota] = useState('');
  const [desenlace, setDesenlace] = useState<Desenlace>('volvio');
  const [guardando, setGuardando] = useState(false);

  const abrirRegistro = (c: CasoEnBandeja) => {
    setRegistrando(c);
    setCanal('llamada');
    setResultado('contesto');
    setNota('');
  };

  async function guardarContacto() {
    if (!registrando) return;
    setGuardando(true);
    const res = await fetch('/api/seguimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona_id: registrando.personaId,
        motivo: registrando.motivo,
        canal, resultado, nota,
      }),
    });
    if (res.ok) {
      toast.success(`Contacto registrado con ${registrando.nombre}.`);
      setRegistrando(null);
      onCambio?.();
    } else {
      const { error } = await res.json().catch(() => ({ error: 'No se pudo registrar.' }));
      toast.error(error ?? 'No se pudo registrar.');
    }
    setGuardando(false);
  }

  async function cerrarCaso() {
    if (!cerrando?.casoId) return;
    setGuardando(true);
    const res = await fetch(`/api/seguimiento/${cerrando.casoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desenlace }),
    });
    if (res.ok) {
      toast.success(
        desenlace === 'se_retiro'
          ? `Caso cerrado. Recuerda darlo de baja en Miembros si corresponde.`
          : `Caso de ${cerrando.nombre} cerrado.`,
      );
      setCerrando(null);
      onCambio?.();
    } else {
      const { error } = await res.json().catch(() => ({ error: 'No se pudo cerrar.' }));
      toast.error(error ?? 'No se pudo cerrar.');
    }
    setGuardando(false);
  }

  if (casos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary/60" aria-hidden />
        <p className="text-sm text-muted-foreground">Nada pendiente por acá.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {casos.map((c) => {
          const intentos = c.contactos.length;
          const topeAlcanzado = intentos >= MAX_CONTACTOS;
          const wa = c.whatsapp ?? c.telefono;

          return (
            <li key={c.personaId} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{c.nombre}</p>
                    <Badge
                      variant="outline"
                      className={
                        c.motivo === 'nuevo_en_la_fe'
                          ? 'border-primary/25 bg-primary/5 text-xs text-primary'
                          : 'text-xs'
                      }
                    >
                      {c.motivo === 'nuevo_en_la_fe' ? 'Nuevo en la fe' : 'Ausencia'}
                    </Badge>
                    {intentos > 0 && (
                      <Badge
                        variant="outline"
                        className={`text-xs tabular-nums ${topeAlcanzado ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}`}
                      >
                        {intentos}/{MAX_CONTACTOS} intentos
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.razon}
                    {c.telefono && ` · ${c.telefono}`}
                  </p>
                </div>

                {!soloLectura && (
                  <div className="flex shrink-0 items-center gap-2">
                    {c.telefono && (
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                        <a href={`tel:${c.telefono}`} title="Llamar" aria-label={`Llamar a ${c.nombre}`}>
                          <PhoneCall className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {wa && (
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                        <a
                          href={`https://wa.me/${soloDigitos(wa)}`}
                          target="_blank" rel="noopener noreferrer"
                          title="WhatsApp" aria-label={`WhatsApp a ${c.nombre}`}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {topeAlcanzado ? (
                      <Button size="sm" onClick={() => { setCerrando(c); setDesenlace('volvio'); }}>
                        Cerrar caso
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => abrirRegistro(c)}>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Anotar contacto
                      </Button>
                    )}
                    {intentos > 0 && !topeAlcanzado && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => { setCerrando(c); setDesenlace('volvio'); }}
                      >
                        Cerrar
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Historial: lo que de verdad convierte esto en seguimiento y no
                  en una lista de teléfonos. */}
              {intentos > 0 && (
                <ol className="mt-3 space-y-1.5 border-l-2 border-border pl-3">
                  {c.contactos.map((ct, i) => (
                    <li key={ct.id} className="text-xs">
                      <span className="font-medium text-foreground">
                        {i + 1}. {CANAL_LABEL[ct.canal]} · {RESULTADO_LABEL[ct.resultado]}
                      </span>
                      <span className="text-muted-foreground"> — {fechaCorta(ct.created_at)}</span>
                      {ct.nota && <p className="mt-0.5 italic text-muted-foreground">{ct.nota}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>

      {/* Anotar contacto */}
      <Dialog open={!!registrando} onOpenChange={(o) => { if (!o && !guardando) setRegistrando(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anotar contacto</DialogTitle>
            <DialogDescription>
              Con <span className="font-semibold text-foreground">{registrando?.nombre}</span>.
              Intento {(registrando?.contactos.length ?? 0) + 1} de {MAX_CONTACTOS}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>¿Por dónde?</Label>
              <div className="flex gap-2">
                {(['llamada', 'whatsapp', 'presencial'] as Canal[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCanal(v)}
                    aria-pressed={canal === v}
                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      canal === v
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {CANAL_LABEL[v]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>¿Qué pasó?</Label>
              <div className="flex gap-2">
                {(['contesto', 'no_contesto', 'mensaje'] as Resultado[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setResultado(v)}
                    aria-pressed={resultado === v}
                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      resultado === v
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {RESULTADO_LABEL[v]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nota-contacto">Nota</Label>
              <Textarea
                id="nota-contacto"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej: Está enfermo, vuelve en dos semanas"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Solo la ven el Pastor y el Co-pastor.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRegistrando(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardarContacto} disabled={guardando}>
              {guardando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cerrar caso */}
      <Dialog open={!!cerrando} onOpenChange={(o) => { if (!o && !guardando) setCerrando(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cerrar el caso</DialogTitle>
            <DialogDescription>
              ¿Cómo terminó el acompañamiento a{' '}
              <span className="font-semibold text-foreground">{cerrando?.nombre}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {(['volvio', 'se_retiro', 'sin_contacto'] as Desenlace[]).map((v) => {
              const Icono = v === 'volvio' ? CheckCircle2 : v === 'se_retiro' ? XCircle : PhoneOff;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDesenlace(v)}
                  aria-pressed={desenlace === v}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    desenlace === v
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icono className="h-4 w-4 shrink-0" aria-hidden />
                  {DESENLACE_LABEL[v]}
                </button>
              );
            })}
          </div>

          {desenlace === 'se_retiro' && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Cerrar el caso no da de baja a nadie. Si corresponde, hazlo desde Miembros con
              <strong> Dar de baja</strong>.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCerrando(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={cerrarCaso} disabled={guardando}>
              {guardando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cerrando...</> : 'Cerrar caso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
