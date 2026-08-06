'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  getCumpleanos, getCultos, getAsistencias, type CumpleanosRow,
} from '@/lib/datos';
import { ministerioDeRol } from '@/lib/roles';
import { CULTO_TIPOS, idsQueAsistieron } from '@/lib/cultos-tipos';
import {
  linkWhatsApp, mensajeCumpleanos, LABEL_TIPO_PERSONA, fechaCumpleLegible,
} from '@/lib/cumpleanos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Cake, Loader2, Search, Eye, EyeOff, MessageCircle, Copy, PartyPopper, ChevronDown,
} from 'lucide-react';

const MESES_NOMBRE = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const BADGE_TIPO: Record<string, string> = {
  adulto: 'bg-primary/10 text-primary border-primary/25',
  joven: 'bg-accent/10 text-accent border-accent/25',
  nino: 'bg-secondary text-secondary-foreground border-border',
};

function FilaCumple({ p, mostrarDias }: { p: CumpleanosRow; mostrarDias?: boolean }) {
  const wa = linkWhatsApp(p);

  const copiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(mensajeCumpleanos(p));
      toast.success('Mensaje copiado.');
    } catch {
      toast.error('No se pudo copiar.');
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">{p.nombre}</span>
          <Badge variant="outline" className={`text-[10px] ${BADGE_TIPO[p.source_tipo] ?? ''}`}>
            {LABEL_TIPO_PERSONA[p.source_tipo] ?? p.source_tipo}
          </Badge>
          <span className="text-xs text-muted-foreground shrink-0">
            cumple {p.edad_que_cumple}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {fechaCumpleLegible(p.cumple_dia, p.cumple_mes)}
          {mostrarDias && p.dias_hasta > 0 && (
            <> · en {p.dias_hasta} {p.dias_hasta === 1 ? 'día' : 'días'}</>
          )}
          {p.contacto_es_apoderado && (
            <> · escribir a <span className="text-foreground">{p.contacto_nombre}</span> (apoderado)</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {wa ? (
          <>
            <Button variant="ghost" size="icon" onClick={copiarMensaje} title="Copiar el mensaje">
              <Copy className="h-4 w-4" />
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-1.5 text-green-600" />
                Saludar
              </a>
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground italic">sin teléfono</span>
        )}
      </div>
    </div>
  );
}

export default function CumpleanosPage() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<CumpleanosRow[]>([]);
  const [asistioYouthIds, setAsistioYouthIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [verTodos, setVerTodos] = useState(false);
  const [mesAbierto, setMesAbierto] = useState<number | null>(new Date().getMonth() + 1);

  const ministerio = ministerioDeRol(user?.role ?? '');

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        // Los cultos/asistencias solo hacen falta para el rol Youth, que decide
        // su audiencia por asistencia previa y no solo por edad.
        const [cumples, cultos, asistencias] = await Promise.all([
          getCumpleanos(400),
          ministerio === 'youth' ? getCultos({ tipo: 'youth' }) : Promise.resolve([]),
          ministerio === 'youth' ? getAsistencias() : Promise.resolve([]),
        ]);
        if (!vivo) return;
        setTodos(cumples);
        if (ministerio === 'youth') {
          setAsistioYouthIds(idsQueAsistieron(cultos, asistencias, 'youth'));
        }
      } catch {
        if (vivo) toast.error('No pudimos cargar los cumpleaños.');
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => { vivo = false; };
  }, [ministerio]);

  const enAudiencia = (p: CumpleanosRow) => {
    if (!ministerio || verTodos) return true;
    return CULTO_TIPOS[ministerio].elegibilidad({
      source_tipo: p.source_tipo as 'adulto' | 'nino' | 'joven' | 'nuevo',
      sexo: p.sexo,
      edad: p.edad_actual,
      asistioAYouthAlgunaVez: asistioYouthIds.has(Number(p.id)),
    }) !== 'no';
  };

  const visibles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return todos
      .filter(enAudiencia)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todos, query, ministerio, verTodos, asistioYouthIds]);

  const hoy = visibles.filter((p) => p.es_hoy);
  const semana = visibles.filter((p) => !p.es_hoy && p.dias_hasta <= 7);
  const mesActual = new Date().getMonth() + 1;
  const restoDelMes = visibles.filter(
    (p) => !p.es_hoy && p.dias_hasta > 7 && p.cumple_mes === mesActual,
  );

  const porMes = useMemo(() => {
    const mapa = new Map<number, CumpleanosRow[]>();
    for (const p of visibles) {
      const arr = mapa.get(p.cumple_mes) ?? [];
      arr.push(p);
      mapa.set(p.cumple_mes, arr);
    }
    // Dentro de cada mes, ordenar por día (no por proximidad)
    for (const arr of mapa.values()) arr.sort((a, b) => a.cumple_dia - b.cumple_dia);
    return mapa;
  }, [visibles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Cake className="h-6 w-6 text-primary" />
          Cumpleaños
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          {ministerio && !verTodos
            ? `Mostrando el público de ${CULTO_TIPOS[ministerio].label}`
            : 'Toda la congregación · el botón Saludar abre WhatsApp con el mensaje ya escrito'}
        </p>
      </div>

      <div className="mb-5 flex items-center gap-2 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre..."
            className="pl-9"
          />
        </div>
        {ministerio && (
          <Button size="sm" variant={verTodos ? 'default' : 'outline'} onClick={() => setVerTodos((v) => !v)}>
            {verTodos ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {verTodos ? 'Solo mi público' : 'Ver todos'}
          </Button>
        )}
      </div>

      <div className="space-y-5">
        {/* Hoy */}
        <Card className={hoy.length > 0 ? 'border-primary/40 bg-primary/5' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PartyPopper className={`h-4 w-4 ${hoy.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
              Hoy
              {hoy.length > 0 && <Badge variant="secondary">{hoy.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {hoy.length === 0 ? (
              <p className="px-4 md:px-6 text-sm text-muted-foreground">Nadie cumple hoy.</p>
            ) : (
              <div className="divide-y divide-border">
                {hoy.map((p) => <FilaCumple key={p.id} p={p} />)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos 7 días */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Próximos 7 días
              {semana.length > 0 && <Badge variant="secondary">{semana.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {semana.length === 0 ? (
              <p className="px-4 md:px-6 text-sm text-muted-foreground">Sin cumpleaños esta semana.</p>
            ) : (
              <div className="divide-y divide-border">
                {semana.map((p) => <FilaCumple key={p.id} p={p} mostrarDias />)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resto del mes en curso */}
        {restoDelMes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Resto de {MESES_NOMBRE[mesActual - 1]}
                <Badge variant="secondary">{restoDelMes.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <div className="divide-y divide-border">
                {restoDelMes.map((p) => <FilaCumple key={p.id} p={p} mostrarDias />)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendario anual */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Todo el año</CardTitle>
            <p className="text-xs text-muted-foreground">
              {visibles.length} {visibles.length === 1 ? 'persona' : 'personas'} con fecha de nacimiento registrada
            </p>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <div className="divide-y divide-border">
              {MESES_NOMBRE.map((nombreMes, i) => {
                const mes = i + 1;
                const gente = porMes.get(mes) ?? [];
                const abierto = mesAbierto === mes;
                return (
                  <div key={mes}>
                    <button
                      type="button"
                      onClick={() => setMesAbierto(abierto ? null : mes)}
                      className="w-full flex items-center justify-between gap-2 px-4 md:px-6 py-3 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${mes === mesActual ? 'text-primary' : 'text-foreground'}`}>
                          {nombreMes}
                        </span>
                        {mes === mesActual && (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                            mes actual
                          </Badge>
                        )}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">{gente.length}</Badge>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${abierto ? 'rotate-180' : ''}`} />
                      </span>
                    </button>
                    {abierto && (
                      gente.length === 0 ? (
                        <p className="px-4 md:px-6 pb-3 text-sm text-muted-foreground">
                          Nadie cumple en {nombreMes.toLowerCase()}.
                        </p>
                      ) : (
                        <div className="divide-y divide-border border-t border-border bg-muted/30">
                          {gente.map((p) => <FilaCumple key={p.id} p={p} />)}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
