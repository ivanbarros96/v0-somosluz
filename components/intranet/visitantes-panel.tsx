'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, UserPlus, Sparkles } from 'lucide-react';
import { MemberForm, type VisitanteAConvertir } from '@/components/intranet/member-form';

interface VisitanteRow {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  visitas: number;
  ultimaVisita: string | null;
}

// A partir de cuántas visitas dejamos de tratar a alguien como "de paso". Solo
// afecta el destaque visual: no bloquea ni obliga a nada.
const VISITAS_HABITUAL = 3;

function formatFecha(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function VisitantesPanel() {
  const [visitantes, setVisitantes] = useState<VisitanteRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [convirtiendo, setConvirtiendo] = useState<VisitanteAConvertir | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch('/api/miembros-nuevos?conVisitas=1', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const { miembrosNuevos } = await res.json();
      // Primero quienes más han venido: son los candidatos naturales a miembro.
      setVisitantes(
        (miembrosNuevos ?? []).sort(
          (a: VisitanteRow, b: VisitanteRow) => b.visitas - a.visitas || a.nombre.localeCompare(b.nombre),
        ),
      );
    } catch {
      toast.error('No se pudieron cargar los visitantes.');
    }
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando visitantes...
      </div>
    );
  }

  if (visitantes.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground text-sm">
        No hay visitantes registrados.
      </p>
    );
  }

  const habituales = visitantes.filter((v) => v.visitas >= VISITAS_HABITUAL).length;

  return (
    <>
      {habituales > 0 && (
        <div className="mx-6 mb-4 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            <strong>{habituales}</strong>{' '}
            {habituales === 1 ? 'visitante ya vino' : 'visitantes ya vinieron'}{' '}
            {VISITAS_HABITUAL} veces o más. Al convertirlos en miembros conservan todo su
            historial de asistencia.
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-center">Visitas</TableHead>
              <TableHead>Última visita</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visitantes.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{v.telefono ?? '—'}</TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={v.visitas >= VISITAS_HABITUAL ? 'default' : 'secondary'}
                    className="tabular-nums"
                  >
                    {v.visitas}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatFecha(v.ultimaVisita)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConvirtiendo({
                      id: v.id, nombre: v.nombre, telefono: v.telefono, email: v.email,
                    })}
                  >
                    <UserPlus className="mr-1 h-4 w-4" />
                    Convertir en miembro
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!convirtiendo} onOpenChange={(o) => { if (!o) setConvirtiendo(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Convertir en miembro</DialogTitle>
            <DialogDescription>
              Elige la categoría y completa la ficha de{' '}
              <span className="font-semibold text-foreground">{convirtiendo?.nombre}</span>.
              Sus asistencias anteriores se conservan y pasan a la ficha nueva.
            </DialogDescription>
          </DialogHeader>
          {convirtiendo && (
            <MemberForm
              visitante={convirtiendo}
              onSuccess={() => {
                toast.success(`${convirtiendo.nombre} ahora es miembro, con su historial.`);
                setConvirtiendo(null);
                cargar();
              }}
              onCancel={() => setConvirtiendo(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
