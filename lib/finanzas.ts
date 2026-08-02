// Tipos y helpers del módulo de Finanzas (acceso exclusivo del rol pastor).

import { eachMonthOfInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';

export type TipoIngreso = 'diezmo' | 'ofrenda' | 'ofrenda_especial';

export const TIPOS_INGRESO: { value: TipoIngreso; label: string }[] = [
  { value: 'diezmo', label: 'Diezmo' },
  { value: 'ofrenda', label: 'Ofrenda' },
  { value: 'ofrenda_especial', label: 'Ofrenda Especial' },
];

export const LABEL_TIPO_INGRESO: Record<TipoIngreso, string> = {
  diezmo: 'Diezmo',
  ofrenda: 'Ofrenda',
  ofrenda_especial: 'Ofrenda Especial',
};

export function esTipoIngreso(v: unknown): v is TipoIngreso {
  return v === 'diezmo' || v === 'ofrenda' || v === 'ofrenda_especial';
}

// Categoría opcional de egreso — no obliga a clasificar, solo se ofrece.
export type CategoriaEgreso = 'aseo' | 'servicios_basicos' | 'mantencion' | 'transporte' | 'otros';

export const CATEGORIAS_EGRESO: { value: CategoriaEgreso; label: string }[] = [
  { value: 'aseo', label: 'Aseo' },
  { value: 'servicios_basicos', label: 'Servicios básicos' },
  { value: 'mantencion', label: 'Mantención' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'otros', label: 'Otros' },
];

export const LABEL_CATEGORIA_EGRESO: Record<CategoriaEgreso, string> = {
  aseo: 'Aseo',
  servicios_basicos: 'Servicios básicos',
  mantencion: 'Mantención',
  transporte: 'Transporte',
  otros: 'Otros',
};

export function esCategoriaEgreso(v: unknown): v is CategoriaEgreso {
  return typeof v === 'string' && CATEGORIAS_EGRESO.some((c) => c.value === v);
}

export interface Ingreso {
  id: number;
  fecha: string; // YYYY-MM-DD
  tipo: TipoIngreso;
  monto: number;
  notas: string | null;
  persona_id: number | null;
  persona_nombre: string | null;
  created_at: string;
}

export interface Egreso {
  id: number;
  fecha: string; // YYYY-MM-DD
  detalle: string;
  monto: number;
  categoria: CategoriaEgreso | null;
  persona_id: number | null;
  persona_nombre: string | null;
  comprobante_path: string | null;
  comprobante_url?: string | null; // URL firmada, agregada solo en el GET
  created_at: string;
}

// Movimiento combinado (ingreso + egreso) en orden cronológico, con saldo
// corrido acumulado desde el primer registro histórico — NO reinicia por mes,
// igual que una cartola bancaria real.
export interface Movimiento {
  id: string; // `ingreso-<id>` o `egreso-<id>`, único entre ambas tablas
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  detalle: string;
  categoria?: CategoriaEgreso | null;
  personaNombre?: string | null;
  monto: number; // siempre positivo; el signo lo da `tipo`
  saldo: number; // saldo acumulado histórico hasta esta fila, inclusive
  comprobante_url?: string | null;
}

// Rango [desde, hasta) para filtrar por mes calendario 'YYYY-MM'. Si el mes
// viene inválido o ausente, usa el mes actual — nunca deja el filtro abierto.
export function rangoMes(mes: string | null | undefined): { desde: string; hasta: string } {
  const base = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : new Date().toISOString().slice(0, 7);
  const [y, m] = base.split('-').map(Number);
  const desde = `${base}-01`;
  const siguiente = new Date(Date.UTC(y, m, 1)); // primer día del mes siguiente
  const hasta = siguiente.toISOString().slice(0, 10);
  return { desde, hasta };
}

export interface OpcionMes {
  value: string; // 'YYYY-MM' o 'general'
  label: string;
}

// Arma el listado de meses para el selector: desde el primer registro
// histórico (o el mes actual si aún no hay nada) hasta el mes actual, más
// reciente primero, con "General" (todo el historial) siempre al inicio.
export function opcionesMes(desde: string | null): OpcionMes[] {
  const inicio = desde ? new Date(`${desde}T00:00:00`) : new Date();
  const fin = new Date();
  const meses = eachMonthOfInterval({ start: inicio, end: fin })
    .map((d) => {
      const value = d.toISOString().slice(0, 7);
      const texto = format(d, 'LLLL yyyy', { locale: es });
      return { value, label: texto.charAt(0).toUpperCase() + texto.slice(1) };
    })
    .reverse();
  return [{ value: 'general', label: 'General (todo el historial)' }, ...meses];
}

export function formatCLP(monto: number | string): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(monto));
}

export function formatFechaCL(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
