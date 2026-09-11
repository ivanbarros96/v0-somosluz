'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useIdioma } from '@/lib/idioma';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, UserPlus, Sparkles, Eye, Pencil, Trash2, ShieldAlert } from 'lucide-react';
import { MemberForm, type VisitanteAConvertir } from '@/components/intranet/member-form';
import { useAuth } from '@/lib/auth-context';

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

// Mismo criterio que el buscador de Miembros: sin tildes, para que "Benjamin"
// encuentre a "Benjamín".
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');
function sinTildes(texto: string) {
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase();
}

function formatFecha(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

interface VisitantesPanelProps {
  /** Término del buscador de Miembros: la misma caja filtra ambas listas. */
  query?: string;
}

export function VisitantesPanel({ query = '' }: VisitantesPanelProps) {
  const { t } = useIdioma();
  const { user } = useAuth();
  // El pastor borra directo: su sesión ya lo identifica. Igual que en Miembros.
  const esPastor = user?.role === 'pastor';

  const [visitantes, setVisitantes] = useState<VisitanteRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [convirtiendo, setConvirtiendo] = useState<VisitanteAConvertir | null>(null);
  const [viendo, setViendo] = useState<VisitanteRow | null>(null);
  const [editando, setEditando] = useState<VisitanteRow | null>(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '' });
  const [eliminando, setEliminando] = useState<VisitanteRow | null>(null);
  const [pwd, setPwd] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [trabajando, setTrabajando] = useState(false);

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
      toast.error('No se pudieron cargar las visitas.');
    }
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirEditar = (v: VisitanteRow) => {
    setEditando(v);
    setForm({ nombre: v.nombre, telefono: v.telefono ?? '', email: v.email ?? '' });
    setErrorAccion('');
  };

  async function guardarEdicion() {
    if (!editando) return;
    if (!form.nombre.trim()) { setErrorAccion('El nombre no puede quedar vacío.'); return; }
    setTrabajando(true);
    setErrorAccion('');
    try {
      const res = await fetch(`/api/miembros-nuevos/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim() || null,
          email: form.email.trim() || null,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'No se pudo guardar.' }));
        setErrorAccion(error ?? 'No se pudo guardar.');
        return;
      }
      toast.success('Visita actualizada.');
      setEditando(null);
      cargar();
    } finally {
      setTrabajando(false);
    }
  }

  async function confirmarEliminar() {
    if (!eliminando) return;
    setTrabajando(true);
    setErrorAccion('');
    try {
      const res = await fetch(`/api/miembros-nuevos/${eliminando.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: esPastor ? undefined : pwd }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'No se pudo eliminar.' }));
        setErrorAccion(error ?? 'No se pudo eliminar.');
        return;
      }
      toast.success(`${eliminando.nombre} fue eliminada.`);
      setEliminando(null);
      setPwd('');
      cargar();
    } finally {
      setTrabajando(false);
    }
  }

  if (cargando) {
    return (
      <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />{t('Cargando visitantes...')}</div>
    );
  }

  if (visitantes.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground text-sm">{t('No hay visitas registradas.')}</p>
    );
  }

  // La caja de búsqueda de Miembros filtra también esta lista: una sola
  // búsqueda cubre miembros y visitas por igual.
  const q = sinTildes(query.trim());
  const digitos = q.replace(/[^0-9]/g, '');
  const visibles = !q
    ? visitantes
    : visitantes.filter(
        (v) =>
          sinTildes(v.nombre).includes(q) ||
          sinTildes(v.email ?? '').includes(q) ||
          (digitos.length >= 3 &&
            (v.telefono ?? '').replace(/[^0-9]/g, '').includes(digitos)),
      );

  if (visibles.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground text-sm">
        Ninguna visita coincide con «{query.trim()}».
      </p>
    );
  }

  const habituales = visibles.filter((v) => v.visitas >= VISITAS_HABITUAL).length;

  return (
    <>
      {habituales > 0 && (
        <div className="mx-6 mb-4 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            <strong>{habituales}</strong>{' '}
            {t(habituales === 1 ? 'visita ya vino' : 'visitas ya vinieron')}{' '}
            {VISITAS_HABITUAL}{' '}
            {t('veces o más. Al convertirlos en miembros conservan todo su historial de asistencia.')}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Nombre')}</TableHead>
              <TableHead>{t('Teléfono')}</TableHead>
              <TableHead className="text-center">{t('N° visitas')}</TableHead>
              <TableHead>{t('Última visita')}</TableHead>
              <TableHead className="text-right">{t('Acciones')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map((v) => (
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
                  {/* Las cuatro acciones NO pesan igual, así que no se ven
                      igual: convertir es lo que uno QUIERE que pase con una
                      visita, y por eso conserva su botón con texto. Ver, editar
                      y eliminar son correcciones puntuales y van como iconos.
                      No existe "Dar de baja": esa registra un retiro contra
                      `personas` y una visita no tiene ficha ahí. */}
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setViendo(v)} title={t('Ver ficha')}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => abrirEditar(v)} title={t('Editar')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      title={t('Eliminar definitivamente')}
                      onClick={() => { setEliminando(v); setPwd(''); setErrorAccion(''); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-1"
                      title={t('Conserva todo su historial de asistencia')}
                      onClick={() => setConvirtiendo({
                        id: v.id, nombre: v.nombre, telefono: v.telefono, email: v.email,
                      })}
                    >
                      <UserPlus className="mr-1 h-4 w-4" />{t('Convertir en miembro')}</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Ver ficha */}
      <Dialog open={!!viendo} onOpenChange={(o) => { if (!o) setViendo(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{viendo?.nombre}</DialogTitle>
            <DialogDescription>{t('Visita registrada')}</DialogDescription>
          </DialogHeader>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t('Teléfono')}</dt>
              <dd className="font-medium">{viendo?.telefono ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t('Email')}</dt>
              <dd className="font-medium break-all">{viendo?.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t('Veces que ha venido')}</dt>
              <dd className="font-medium tabular-nums">{viendo?.visitas ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t('Última visita')}</dt>
              <dd className="font-medium tabular-nums">{formatFecha(viendo?.ultimaVisita ?? null)}</dd>
            </div>
          </dl>
          {viendo && viendo.visitas >= VISITAS_HABITUAL && (
            <p className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
              Ya vino {viendo.visitas} veces. Convertirla en miembro conserva todo su historial.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editando} onOpenChange={(o) => { if (!o && !trabajando) { setEditando(null); setErrorAccion(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Editar visita')}</DialogTitle>
            <DialogDescription>{t('Una visita solo guarda nombre y contacto. La ficha completa se llena al convertirla en miembro.')}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); guardarEdicion(); }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="v-nombre">{t('Nombre')}</Label>
              <Input
                id="v-nombre"
                value={form.nombre}
                onChange={(e) => { setForm({ ...form, nombre: e.target.value }); setErrorAccion(''); }}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-telefono">{t('Teléfono')}</Label>
              <Input
                id="v-telefono"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+56 9 ..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-email">{t('Email')}</Label>
              <Input
                id="v-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            {errorAccion && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorAccion}</p>
            )}
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditando(null)} disabled={trabajando}>{t('Cancelar')}</Button>
            <Button onClick={guardarEdicion} disabled={trabajando || !form.nombre.trim()}>
              {trabajando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('Guardando...')}</> : t('Guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar */}
      <Dialog open={!!eliminando} onOpenChange={(o) => { if (!o && !trabajando) { setEliminando(null); setPwd(''); setErrorAccion(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />{t('Eliminar visita')}</DialogTitle>
            <DialogDescription>
              {t('Vas a eliminar a')}{' '}
              <span className="font-semibold text-foreground">{eliminando?.nombre}</span>
              {eliminando && eliminando.visitas > 0 && (
                <>{' '}{t('y sus')}{' '}<strong>{eliminando.visitas}</strong>{' '}
                  {t(eliminando.visitas === 1 ? 'marca de asistencia' : 'marcas de asistencia')}</>
              )}
              {t(', para siempre. Esta acción no se puede deshacer.')}
              {eliminando && eliminando.visitas > 0 && (
                <span className="mt-1.5 inline-block">
                  {t('Si lo que quieres es conservar su historial, cierra esto y usa')}{' '}
                  <strong>{t('Convertir en miembro')}</strong>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {!esPastor && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t('Eliminar requiere autorización. Ingresa la')}{' '}<strong>{t('contraseña del pastor')}</strong>.</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-pwd">{t('Contraseña del pastor')}</Label>
                <Input
                  id="v-pwd"
                  type="password"
                  value={pwd}
                  autoFocus
                  onChange={(e) => { setPwd(e.target.value); setErrorAccion(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && pwd) confirmarEliminar(); }}
                  placeholder="••••••••"
                  disabled={trabajando}
                />
              </div>
            </div>
          )}

          {errorAccion && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorAccion}</p>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEliminando(null); setPwd(''); setErrorAccion(''); }} disabled={trabajando}>{t('Cancelar')}</Button>
            <Button
              variant="destructive"
              onClick={confirmarEliminar}
              disabled={trabajando || (!esPastor && !pwd)}
            >
              {trabajando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('Eliminando...')}</> : t('Eliminar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!convirtiendo} onOpenChange={(o) => { if (!o) setConvirtiendo(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('Convertir en miembro')}</DialogTitle>
            <DialogDescription>
              {t('Elige la categoría y completa la ficha de')}{' '}
              <span className="font-semibold text-foreground">{convirtiendo?.nombre}</span>{t('. Sus asistencias anteriores se conservan y pasan a la ficha nueva.')}</DialogDescription>
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
