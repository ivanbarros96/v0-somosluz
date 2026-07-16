'use client';

import { Users, Baby, UserCheck, TrendingUp, Repeat, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface KpiData {
  totalMiembros: number;
  adultos: number;
  jovenes: number;
  ninos: number;
  pctAsistenciaPromedio: number;
  // % de visitantes nuevos que volvieron al menos una segunda vez. null = aún sin datos.
  retencionVisitantes: number | null;
}

interface KpiCardsProps {
  data: KpiData;
}

const CARDS = [
  { key: 'totalMiembros' as const, label: 'Total Miembros', icon: Users, color: 'text-primary' },
  { key: 'adultos' as const, label: 'Adultos', icon: UserCheck, color: 'text-accent' },
  { key: 'jovenes' as const, label: 'Jóvenes', icon: Flame, color: 'text-[#c08a3e]' },
  { key: 'ninos' as const, label: 'Niños', icon: Baby, color: 'text-green-600' },
  { key: 'pctAsistenciaPromedio' as const, label: 'Asistencia Prom.', icon: TrendingUp, color: 'text-orange-500', suffix: '%' },
  { key: 'retencionVisitantes' as const, label: 'Retención Visitantes', icon: Repeat, color: 'text-primary', suffix: '%', title: 'Porcentaje de visitantes nuevos que volvieron una segunda vez. Se calcula al registrar la asistencia de los visitantes cada culto. Muestra "—" hasta tener datos suficientes.' },
];

export function KpiCards({ data }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-6">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const valor = data[card.key];
        return (
          <Card key={card.key} title={'title' in card ? card.title : undefined}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <Icon className={`h-4 w-4 shrink-0 ${card.color}`} />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-foreground tabular-nums">
                {valor === null ? '—' : `${valor}${card.suffix ?? ''}`}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
