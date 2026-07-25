// Tipos y helpers del módulo de Finanzas (acceso exclusivo del rol pastor).

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

export interface Ingreso {
  id: number;
  fecha: string; // YYYY-MM-DD
  tipo: TipoIngreso;
  monto: number;
  notas: string | null;
  created_at: string;
}

export interface Egreso {
  id: number;
  fecha: string; // YYYY-MM-DD
  detalle: string;
  monto: number;
  comprobante_path: string | null;
  comprobante_url?: string | null; // URL firmada, agregada solo en el GET
  created_at: string;
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
