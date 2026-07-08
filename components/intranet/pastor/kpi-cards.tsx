'use client';

import { Users, Baby, UserCheck, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface KpiData {
  totalMiembros: number;
  adultos: number;
  ninos: number;
  pctAsistenciaPromedio: number;
}

interface KpiCardsProps {
  data: KpiData;
}

const CARDS = [
  { key: 'totalMiembros' as keyof KpiData, label: 'Total Miembros', icon: Users, color: 'text-primary' },
  { key: 'adultos' as keyof KpiData, label: 'Adultos', icon: UserCheck, color: 'text-accent' },
  { key: 'ninos' as keyof KpiData, label: 'Niños', icon: Baby, color: 'text-green-600' },
  { key: 'pctAsistenciaPromedio' as keyof KpiData, label: 'Asistencia Prom.', icon: TrendingUp, color: 'text-orange-500', suffix: '%' },
] as const;

export function KpiCards({ data }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const suffix = 'suffix' in card ? card.suffix : '';
        return (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <Icon className={`h-4 w-4 shrink-0 ${card.color}`} />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-foreground">
                {data[card.key]}{suffix}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
