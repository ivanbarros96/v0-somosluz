'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { KpiCards, type KpiData } from '@/components/intranet/pastor/kpi-cards';
import { AsistenciaChart, type CultoAsistencia } from '@/components/intranet/pastor/asistencia-chart';
import { CrecimientoChart, type CrecimientoMes } from '@/components/intranet/pastor/crecimiento-chart';
import { BautizadosChart, type BautizadosData } from '@/components/intranet/pastor/bautizados-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, UserPlus, ClipboardList, UserX, Calendar } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Pastor Dashboard ────────────────────────────────────────────────────────

function PastorDashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KpiData>({ totalMiembros: 0, adultos: 0, ninos: 0, pctAsistenciaPromedio: 0 });
  const [asistenciaData, setAsistenciaData] = useState<CultoAsistencia[]>([]);
  const [crecimientoData, setCrecimientoData] = useState<CrecimientoMes[]>([]);
  const [bautizadosData, setBautizadosData] = useState<BautizadosData>({ bautizados: 0, en_proceso: 0, no_bautizados: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      // Personas
      const { data: personas } = await supabase
        .from('personas')
        .select('id, source_tipo, bautizado, created_at');

      const total = personas?.length ?? 0;
      const adultos = personas?.filter((p) => p.source_tipo === 'adulto').length ?? 0;
      const ninos = personas?.filter((p) => p.source_tipo === 'nino').length ?? 0;

      // Bautismo (adultos)
      const adultoRows = personas?.filter((p) => p.source_tipo === 'adulto') ?? [];
      const bautizados = adultoRows.filter((p) => p.bautizado === 'si').length;
      const en_proceso = adultoRows.filter((p) => p.bautizado === 'en_proceso').length;
      const no_bautizados = adultoRows.filter((p) => p.bautizado === 'no' || p.bautizado == null).length;

      // Crecimiento mensual (6 meses)
      const now = new Date();
      const meses: CrecimientoMes[] = [];
      let acumulado = 0;
      for (let i = 5; i >= 0; i--) {
        const mes = subMonths(now, i);
        const inicio = startOfMonth(mes).toISOString();
        const fin = endOfMonth(mes).toISOString();
        const nuevos = personas?.filter((p) => p.created_at && p.created_at >= inicio && p.created_at <= fin).length ?? 0;
        acumulado += nuevos;
        const label = format(mes, 'MMM', { locale: es });
        meses.push({ mes: label.charAt(0).toUpperCase() + label.slice(1), nuevos, acumulado });
      }

      // Últimos 8 cultos + asistencias
      const { data: cultos } = await supabase
        .from('cultos')
        .select('id, fecha, descripcion')
        .order('fecha', { ascending: false })
        .limit(8);

      let asistencias: CultoAsistencia[] = [];
      let totalPresencias = 0;

      if (cultos?.length) {
        const cultoIds = cultos.map((c) => c.id);
        const { data: rawAsist } = await supabase
          .from('asistencias')
          .select('culto_id')
          .in('culto_id', cultoIds);

        asistencias = cultos.map((culto) => {
          const n = rawAsist?.filter((a) => a.culto_id === culto.id).length ?? 0;
          totalPresencias += n;
          return { fecha: culto.fecha, total: n, descripcion: culto.descripcion };
        }).reverse();
      }

      const pctAsistenciaPromedio = cultos?.length && total > 0
        ? Math.round((totalPresencias / cultos.length / total) * 100)
        : 0;

      setKpis({ totalMiembros: total, adultos, ninos, pctAsistenciaPromedio });
      setAsistenciaData(asistencias);
      setCrecimientoData(meses);
      setBautizadosData({ bautizados, en_proceso, no_bautizados });
      setLoading(false);
    }

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Panel gerencial · Somos Luz Iglesia
        </p>
      </div>

      <KpiCards data={kpis} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AsistenciaChart data={asistenciaData} />
        <CrecimientoChart data={crecimientoData} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BautizadosChart data={bautizadosData} />

        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base">Accesos Rápidos</CardTitle>
            <CardDescription>Funciones principales del sistema</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { href: '/intranet/dashboard/members', icon: Users, label: 'Ver Miembros', desc: 'Lista completa' },
                { href: '/intranet/dashboard/asistencia', icon: ClipboardList, label: 'Asistencia', desc: 'Registrar culto' },
                { href: '/intranet/dashboard/ausentes', icon: UserX, label: 'Ausentes', desc: '+30 días sin ir' },
                { href: '/intranet/dashboard/settings', icon: Calendar, label: 'Configuración', desc: 'Ajustes del sistema' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block p-4 rounded-lg border border-border hover:bg-secondary transition"
                >
                  <item.icon className="h-6 w-6 text-primary mb-2" />
                  <h3 className="font-semibold text-foreground text-sm">{item.label}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Somos Luz Dashboard ─────────────────────────────────────────────────────

function SomosluzDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, recientes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('personas').select('id, created_at').then(({ data }) => {
      const total = data?.length ?? 0;
      const hace3m = subMonths(new Date(), 3).toISOString();
      const recientes = data?.filter((p) => p.created_at && p.created_at >= hace3m).length ?? 0;
      setStats({ total, recientes });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Panel operativo · Somos Luz Iglesia
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Nuevos (3 meses)</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-600 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-blue-600">{stats.recientes}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Acciones Rápidas</CardTitle>
          <CardDescription className="text-sm">Funciones principales</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: '/intranet/dashboard/registro', icon: UserPlus, label: 'Registrar Miembro', desc: 'Agregar nuevo' },
              { href: '/intranet/dashboard/members', icon: Users, label: 'Ver Miembros', desc: 'Lista completa' },
              { href: '/intranet/dashboard/asistencia', icon: ClipboardList, label: 'Asistencia', desc: 'Registrar culto' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block p-4 rounded-lg border border-border hover:bg-secondary transition"
              >
                <item.icon className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold text-foreground text-sm">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  return user?.role === 'pastor' ? <PastorDashboard /> : <SomosluzDashboard />;
}
