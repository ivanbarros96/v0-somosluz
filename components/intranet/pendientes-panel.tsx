'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getPersonas } from '@/lib/datos';
import { useMembers } from '@/lib/members-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, X, Link2, UserRoundPlus, AlertTriangle, Eye } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Pendiente {
  id: number;
  nombre: string;
  source_tipo: string;
  sexo: string | null;
  edad: number | null;
  telefono: string | null;
  email: string | null;
  comuna: string | null;
  nombre_apoderado: string | null;
  created_at: string | null;
  // Andreytha (reunión 24/08/2026) pedía revisar la ficha ANTES de aprobar:
  // "no sé si le falta algún dato, o si está la fecha de nacimiento completa".
  // El resumen de la fila no alcanza, así que la ficha completa trae también
  // estos campos. El endpoint ya los devolvía; solo no se estaban leyendo.
  fecha_nacimiento: string | null;
  whatsapp: string | null;
  region: string | null;
  direccion: string | null;
  bautizado: string | null;
  tiempo_conversion: string | null;
  primera_iglesia: boolean | null;
  telefono_apoderado: string | null;
}

const ETIQUETA: Record<string, string> = { adulto: 'Adulto', joven: 'Youth', nino: 'Niño' };

/**
 * Fichas llegadas por el link público de auto-registro. Están guardadas en la
 * base con todos sus datos, pero fuera de listados, asistencia y estadísticas
 * hasta que alguien las apruebe acá.
 */
export function PendientesPanel() {
  const { members, refreshMembers } = useMembers();
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [viendo, setViendo] = useState<Pendiente | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/personas?soloPendientes=1', { cache: 'no-store' });
      const { personas } = await res.json();
      setPendientes(personas ?? []);
    } catch {
      toast.error('No se pudieron cargar los registros pendientes.');
    }
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Aviso de posible duplicado. No bloquea: puede haber dos personas con el
  // mismo nombre, pero quien revisa merece saberlo antes de aprobar.
  const yaExiste = (nombre: string) =>
    members.some((m) => m.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());

  async function resolver(p: Pendiente, accion: 'aprobar' | 'rechazar') {
    setTrabajando(p.id);
    const res = await fetch(`/api/personas/pendientes/${p.id}`, {
      method: accion === 'aprobar' ? 'POST' : 'DELETE',
    });
    if (res.ok) {
      toast.success(
        accion === 'aprobar'
          ? `${p.nombre} ya es miembro.`
          : `Se descartó el registro de ${p.nombre}.`,
      );
      await cargar();
      if (accion === 'aprobar') await refreshMembers();
    } else {
      const { error } = await res.json().catch(() => ({ error: 'No se pudo completar.' }));
      toast.error(error ?? 'No se pudo completar.');
    }
    setTrabajando(null);
  }

  async function copiarLink() {
    const url = `${window.location.origin}/registro`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      toast.success('Link copiado. Ya lo puedes compartir.');
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error(`Copia el link a mano: ${url}`);
    }
  }

  return (
    <div className="space-y-4 px-6 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-sm text-muted-foreground">
          Comparte este link para que la gente se registre sola. Lo que llegue aparece acá
          para que lo revises antes de que entre a la lista.
        </p>
        <Button size="sm" variant="outline" onClick={copiarLink} className="shrink-0 gap-1.5">
          {copiado ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          {copiado ? 'Copiado' : 'Copiar link'}
        </Button>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
        </div>
      ) : pendientes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <UserRoundPlus className="h-6 w-6 text-muted-foreground/60" aria-hidden />
          <p className="text-sm text-muted-foreground">
            No hay registros esperando revisión.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {pendientes.map((p) => {
            const duplicado = yaExiste(p.nombre);
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-foreground">{p.nombre}</p>
                    <Badge variant="outline" className="text-xs">
                      {ETIQUETA[p.source_tipo] ?? p.source_tipo}
                    </Badge>
                    {duplicado && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-200 bg-amber-50 text-xs text-amber-700"
                        title="Ya hay un miembro con este mismo nombre"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Posible duplicado
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[
                      p.edad != null ? `${p.edad} años` : null,
                      p.sexo,
                      p.telefono,
                      p.comuna,
                      p.nombre_apoderado ? `Apoderado: ${p.nombre_apoderado}` : null,
                    ].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title="Ver la ficha completa antes de aprobar"
                    aria-label={`Ver la ficha de ${p.nombre}`}
                    onClick={() => setViendo(p)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={trabajando === p.id}
                    onClick={() => resolver(p, 'rechazar')}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Descartar
                  </Button>
                  <Button size="sm" disabled={trabajando === p.id} onClick={() => resolver(p, 'aprobar')}>
                    {trabajando === p.id
                      ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      : <Check className="mr-1 h-3.5 w-3.5" />}
                    Aprobar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Ficha completa. El objetivo no es solo "ver los datos" sino detectar
          los que FALTAN antes de aprobar: un miembro sin fecha de nacimiento
          nunca aparece en cumpleaños, y sin teléfono no se le puede llamar
          para el seguimiento. Por eso los vacíos se marcan en ámbar en vez de
          mostrar un guión discreto. */}
      <Dialog open={!!viendo} onOpenChange={(o) => { if (!o) setViendo(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{viendo?.nombre}</DialogTitle>
            <DialogDescription>
              Se registró por el link público · {ETIQUETA[viendo?.source_tipo ?? ''] ?? viendo?.source_tipo}
            </DialogDescription>
          </DialogHeader>

          {viendo && (() => {
            const esNino = viendo.source_tipo === 'nino';

            // Las mismas secciones y en el mismo orden que el formulario de
            // registro (member-form): quien revisa lee la ficha con la misma
            // estructura con que se llenó, no en una grilla suelta que obliga
            // a buscar cada dato.
            type Campo = [etiqueta: string, valor: string | null, importante: boolean];

            const personales: Campo[] = [
              ['Nombre', viendo.nombre, true],
              ['Sexo', viendo.sexo, true],
              ['Fecha de nacimiento', viendo.fecha_nacimiento, true],
              ['Edad', viendo.edad != null ? `${viendo.edad} años` : null, true],
            ];
            // A un niño no se le pide contacto propio: el suyo es el apoderado.
            const contacto: Campo[] = esNino ? [] : [
              ['Teléfono', viendo.telefono, true],
              ['WhatsApp', viendo.whatsapp, false],
              ['Email', viendo.email, false],
              ['Región', viendo.region, false],
              ['Comuna', viendo.comuna, false],
              ['Dirección', viendo.direccion, false],
            ];
            const apoderado: Campo[] = esNino ? [
              ['Nombre del apoderado', viendo.nombre_apoderado, true],
              ['Teléfono del apoderado', viendo.telefono_apoderado, true],
            ] : [];
            // A los niños no se les pregunta por su camino de fe.
            const fe: Campo[] = esNino ? [] : [
              ['Bautizado', viendo.bautizado === 'si' ? 'Sí' : viendo.bautizado === 'no' ? 'No' : null, false],
              ['Primera iglesia', viendo.primera_iglesia === true ? 'Sí' : viendo.primera_iglesia === false ? 'No' : null, false],
              ['Tiempo en el evangelio', viendo.tiempo_conversion, false],
            ];

            const secciones: [string, Campo[]][] = [
              [esNino ? 'Datos del Niño' : 'Datos Personales', personales],
              ['Contacto', contacto],
              ['Apoderado', apoderado],
              ['Fe y Comunidad', fe],
            ];
            const faltan = [...personales, ...contacto, ...apoderado, ...fe]
              .filter(([, v, importante]) => importante && !v);

            return (
              <div className="space-y-4">
                {faltan.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Falta{faltan.length > 1 ? 'n' : ''}{' '}
                      <strong>{faltan.map(([l]) => l.toLowerCase()).join(', ')}</strong>.
                      Puedes aprobar igual y completarlo después desde Miembros.
                    </span>
                  </div>
                )}

                {secciones.filter(([, campos]) => campos.length > 0).map(([titulo, campos]) => (
                  <Card key={titulo}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">
                        {titulo}
                      </CardTitle>
                    </CardHeader>
                    {/* Dos columnas en pantalla grande: es una ficha de LECTURA,
                        no de edición, y en una sola columna obligaba a scrollear
                        toda la pantalla para revisar 13 campos antes de aprobar. */}
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      {campos.map(([label, valor, importante]) => (
                        <div key={label} className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">{label}</p>
                          <p className={valor ? 'text-sm' : `text-sm ${importante ? 'font-medium text-amber-700' : 'text-muted-foreground'}`}>
                            {valor ?? (importante ? 'Falta' : '—')}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              disabled={trabajando === viendo?.id}
              onClick={() => { if (viendo) { const p = viendo; setViendo(null); resolver(p, 'rechazar'); } }}
            >
              <X className="mr-1 h-4 w-4" />
              Descartar
            </Button>
            <Button
              disabled={trabajando === viendo?.id}
              onClick={() => { if (viendo) { const p = viendo; setViendo(null); resolver(p, 'aprobar'); } }}
            >
              <Check className="mr-1 h-4 w-4" />
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
