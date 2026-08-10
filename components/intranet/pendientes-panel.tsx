'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getPersonas } from '@/lib/datos';
import { useMembers } from '@/lib/members-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Link2, UserRoundPlus, AlertTriangle } from 'lucide-react';

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
    </div>
  );
}
