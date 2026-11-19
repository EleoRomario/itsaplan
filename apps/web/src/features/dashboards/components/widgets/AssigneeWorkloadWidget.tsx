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
  completed: '#22c55e',
  inProgress: '#f59e0b',
  open: '#3b82f6',
  overdue: '#ef4444',
};

// Horizontal stacked bar chart of issues per assignee split by state and overdue status.
export default function AssigneeWorkloadWidget() {
  const t = useTranslations('dashboards.assigneeWorkload');
  const { project } = useShell();

  const chartData = useMemo(() => {
    if (!project) return [];
    const today = new Date().toISOString().slice(0, 10);
    const stateByColumn = new Map(project.columns.map((c) => [c.id, c.stateType]));
    const nameByUser = new Map(project.assignees.map((a) => [a.userId, a.name]));
    const buckets = new Map<
      string,
      { name: string; completed: number; inProgress: number; open: number; overdue: number }
    >();

    for (const item of project.issues) {
      const state = stateByColumn.get(item.columnId);
      if (state === 'canceled') continue;
      const key = item.assigneeUserId ?? '__unassigned__';
      const label = item.assigneeUserId
        ? (nameByUser.get(item.assigneeUserId) ?? t('unassigned'))
        : t('unassigned');
      const row = buckets.get(key) ?? {
        name: label,
        completed: 0,
        inProgress: 0,
        open: 0,
        overdue: 0,
      };
      const isOverdue = Boolean(
        item.dueDate && item.dueDate.slice(0, 10) < today && state !== 'completed',
      );
      if (state === 'completed') row.completed += 1;
      else if (isOverdue) row.overdue += 1;
      else if (state === 'started') row.inProgress += 1;
      else row.open += 1;
      buckets.set(key, row);
    }

    return [...buckets.values()].sort(
      (a, b) =>
        b.completed +
        b.inProgress +
        b.open +
        b.overdue -
        (a.completed + a.inProgress + a.open + a.overdue),
    );
  }, [project, t]);

  const chartConfig: ChartConfig = {
    completed: { label: t('completed'), color: SERIES_COLOR.completed },
    inProgress: { label: t('inProgress'), color: SERIES_COLOR.inProgress },
    open: { label: t('open'), color: SERIES_COLOR.open },
    overdue: { label: t('overdue'), color: SERIES_COLOR.overdue },
  };

  if (!project) return <Skeleton className="h-[180px] w-full" />;
  if (chartData.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <ChartContainer dir="ltr" config={chartConfig} className="h-full min-h-[180px] w-full">
      <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={90}
          fontSize={11}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" />
        <Bar dataKey="inProgress" stackId="a" fill="var(--color-inProgress)" />
        <Bar dataKey="open" stackId="a" fill="var(--color-open)" />
        <Bar dataKey="overdue" stackId="a" fill="var(--color-overdue)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
