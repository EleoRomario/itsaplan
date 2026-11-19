import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { useTranslations } from 'next-intl';
import { useShell } from '@/context/shellContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const DAY_MS = 86_400_000;

// Average days active issues have spent in each non-terminal status column.
export default function StatusAgingWidget() {
  const t = useTranslations('dashboards.statusAging');
  const { project } = useShell();

  const rows = useMemo(() => {
    if (!project) return [];
    const now = Date.now();
    const activeColumns = project.columns.filter(
      (c) => c.stateType !== 'completed' && c.stateType !== 'canceled',
    );
    const stats = new Map<number, { sumDays: number; count: number }>();

    for (const item of project.issues) {
      const since = Date.parse(item.statusSince);
      if (Number.isNaN(since)) continue;
      const days = Math.max(0, (now - since) / DAY_MS);
      const cur = stats.get(item.columnId) ?? { sumDays: 0, count: 0 };
      cur.sumDays += days;
      cur.count += 1;
      stats.set(item.columnId, cur);
    }

    return activeColumns.map((col) => {
      const cur = stats.get(col.id);
      const avgDays = cur && cur.count > 0 ? Math.round((cur.sumDays / cur.count) * 10) / 10 : 0;
      return {
        id: col.id,
        name: col.name,
        avgDays,
        count: cur?.count ?? 0,
        color: col.color || '#64748b',
      };
    });
  }, [project]);

  const chartConfig: ChartConfig = {
    avgDays: { label: t('avgDays') },
  };

  if (!project) return <Skeleton className="h-[180px] w-full" />;
  if (rows.every((r) => r.count === 0)) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-xs text-muted-foreground">{t('caption')}</p>
      <ChartContainer dir="ltr" config={chartConfig} className="min-h-[150px] w-full flex-1">
        <BarChart data={rows}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={6} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} width={32} fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
          <Bar dataKey="avgDays" radius={[4, 4, 0, 0]}>
            {rows.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
