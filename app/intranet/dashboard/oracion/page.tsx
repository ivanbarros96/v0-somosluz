'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HandHeart, Clock, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Estado = 'pendiente' | 'orando' | 'completada';

interface Peticion {
  id: string;
  nombre: string;
  email: string | null;
  peticion: string;
  estado: Estado;
  created_at: string;
}

const FILTROS: { valor: Estado | 'todas'; label: string }[] = [
  { valor: 'todas', label: 'Todas' },
  { valor: 'pendiente', label: 'Pendientes' },
  { valor: 'orando', label: 'Orando' },
  { valor: 'completada', label: 'Completadas' },
];

const ESTADO_STYLE: Record<Estado, string> = {
  pendiente: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  orando: 'bg-primary/10 text-primary',
  completada: 'bg-green-500/10 text-green-600 dark:text-green-400',
};

const ESTADO_LABEL: Record<Estado, string> = {
  pendiente: 'Pendiente',
  orando: 'Orando',
  completada: 'Completada',
};

export default function OracionPage() {
  const [peticiones, setPeticiones] = useState<Peticion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Estado | 'todas'>('todas');
  const [actualizando, setActualizando] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/oracion');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPeticiones(data.peticiones ?? []);
    } catch {
      toast.error('No pudimos cargar las peticiones');
    } finally {
      setLoading(false);
    }
  }

  async function cambiarEstado(id: string, estado: Estado) {
    setActualizando(id);
    // Optimista
    const prev = peticiones;
    setPeticiones((ps) => ps.map((p) => (p.id === id ? { ...p, estado } : p)));
    try {
      const res = await fetch('/api/oracion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPeticiones(prev); // rollback
      toast.error('No pudimos actualizar el estado');
    } finally {
      setActualizando(null);
    }
  }

  const pendientesCount = useMemo(
    () => peticiones.filter((p) => p.estado === 'pendiente').length,
    [peticiones],
  );

  const visibles = useMemo(
    () => (filtro === 'todas' ? peticiones : peticiones.filter((p) => p.estado === filtro)),
    [peticiones, filtro],
  );

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <HandHeart className="h-6 w-6 text-primary" />
          Peticiones de Oración
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Peticiones enviadas desde el sitio web
          {pendientesCount > 0 && (
            <> · <span className="font-medium text-orange-600 dark:text-orange-400">{pendientesCount} sin revisar</span></>
          )}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={cn(
              'text-xs md:text-sm px-3 py-1.5 rounded-full border transition',
              filtro === f.valor
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="font-semibold text-foreground text-lg">Nada por aquí</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {filtro === 'todas'
                ? 'Aún no hay peticiones de oración.'
                : 'No hay peticiones en este estado.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibles.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{p.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(parseISO(p.created_at), { addSuffix: true, locale: es })}
                      </span>
                      {p.email && (
                        <a
                          href={`mailto:${p.email}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {p.email}
                        </a>
                      )}
                    </div>
                  </div>
                  <span className={cn('text-xs px-2 py-1 rounded-md font-medium shrink-0', ESTADO_STYLE[p.estado])}>
                    {ESTADO_LABEL[p.estado]}
                  </span>
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap text-pretty">
                  {p.peticion}
                </p>

                <div className="flex items-center gap-2 mt-4">
                  {p.estado !== 'orando' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={actualizando === p.id}
                      onClick={() => cambiarEstado(p.id, 'orando')}
                    >
                      Marcar “Orando”
                    </Button>
                  )}
                  {p.estado !== 'completada' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={actualizando === p.id}
                      onClick={() => cambiarEstado(p.id, 'completada')}
                    >
                      Marcar completada
                    </Button>
                  )}
                  {p.estado !== 'pendiente' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      disabled={actualizando === p.id}
                      onClick={() => cambiarEstado(p.id, 'pendiente')}
                    >
                      Reabrir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
