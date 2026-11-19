import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useTranslations } from 'next-intl';
import { useShell } from '@/context/shellContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const SERIES_COLOR = {
  estimated: '#6366f1',
  logged: '#14b8a6',
};

function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

// Estimated hours vs logged worklog hours per assignee.
export default function TimeTrackingWidget() {
  const t = useTranslations('dashboards.timeTracking');
  const { project } = useShell();

  const summary = useMemo(() => {
    if (!project) return null;
    const nameByUser = new Map(project.assignees.map((a) => [a.userId, a.name]));
    const buckets = new Map<string, { name: string; estMin: number; logMin: number }>();
    let totalEstMin = 0;
    let totalLogMin = 0;

    for (const item of project.issues) {
      const est = item.estimateMinutes ?? 0;
      const log = item.loggedMinutes ?? 0;
      if (est === 0 && log === 0) continue;
      totalEstMin += est;
      totalLogMin += log;
      const key = item.assigneeUserId ?? '__unassigned__';
      const label = item.assigneeUserId
        ? (nameByUser.get(item.assigneeUserId) ?? t('unassigned'))
        : t('unassigned');
      const row = buckets.get(key) ?? { name: label, estMin: 0, logMin: 0 };
      row.estMin += est;
      row.logMin += log;
      buckets.set(key, row);
    }

    const rows = [...buckets.values()]
      .map((r) => ({
        name: r.name,
        estimated: toHours(r.estMin),
        logged: toHours(r.logMin),
      }))
      .sort((a, b) => b.estimated + b.logged - (a.estimated + a.logged));

    return {
      totalEstimated: toHours(totalEstMin),
      totalLogged: toHours(totalLogMin),
      rows,
    };
  }, [project, t]);

  const chartConfig: ChartConfig = {
    estimated: { label: t('estimated'), color: SERIES_COLOR.estimated },
    logged: { label: t('logged'), color: SERIES_COLOR.logged },
  };

  if (!summary) return <Skeleton className="h-[180px] w-full" />;
  if (summary.rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{t('totalEstimated', { hours: summary.totalEstimated })}</span>
        <span>•</span>
        <span>{t('totalLogged', { hours: summary.totalLogged })}</span>
      </div>
      <ChartContainer dir="ltr" config={chartConfig} className="min-h-[150px] w-full flex-1">
        <BarChart data={summary.rows}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={6} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} width={32} fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="estimated" fill="var(--color-estimated)" radius={3} />
          <Bar dataKey="logged" fill="var(--color-logged)" radius={3} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
