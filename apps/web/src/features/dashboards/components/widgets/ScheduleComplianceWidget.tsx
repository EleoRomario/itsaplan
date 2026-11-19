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

const BAR_COLOR = {
  onTime: '#22c55e',
  completedLate: '#f59e0b',
  overdue: '#ef4444',
  upcoming: '#3b82f6',
};

// Compares issues with a due date: completed on time, completed late, overdue, or upcoming.
export default function ScheduleComplianceWidget() {
  const t = useTranslations('dashboards.scheduleCompliance');
  const { project } = useShell();

  const summary = useMemo(() => {
    if (!project) return null;
    const today = new Date().toISOString().slice(0, 10);
    const stateByColumn = new Map(project.columns.map((c) => [c.id, c.stateType]));
    let onTime = 0;
    let completedLate = 0;
    let overdue = 0;
    let upcoming = 0;

    for (const item of project.issues) {
      if (!item.dueDate) continue;
      const state = stateByColumn.get(item.columnId);
      if (state === 'canceled') continue;
      const due = item.dueDate.slice(0, 10);
      if (state === 'completed') {
        const done = item.statusSince.slice(0, 10);
        if (done <= due) onTime += 1;
        else completedLate += 1;
      } else if (due < today) {
        overdue += 1;
      } else {
        upcoming += 1;
      }
    }

    const evaluated = onTime + completedLate + overdue;
    const onTimePct = evaluated > 0 ? Math.round((onTime / evaluated) * 100) : 0;
    const rows = [
      { key: 'onTime', label: t('onTime'), count: onTime, color: BAR_COLOR.onTime },
      {
        key: 'completedLate',
        label: t('completedLate'),
        count: completedLate,
        color: BAR_COLOR.completedLate,
      },
      { key: 'overdue', label: t('overdue'), count: overdue, color: BAR_COLOR.overdue },
      { key: 'upcoming', label: t('upcoming'), count: upcoming, color: BAR_COLOR.upcoming },
    ];
    return { totalWithDue: evaluated + upcoming, onTimePct, rows };
  }, [project, t]);

  const chartConfig: ChartConfig = {
    count: { label: t('issues') },
  };

  if (!summary) return <Skeleton className="h-[180px] w-full" />;
  if (summary.totalWithDue === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{t('onTimeRate')}</span>
        <span className="text-sm font-semibold tabular-nums">{summary.onTimePct}%</span>
      </div>
      <ChartContainer dir="ltr" config={chartConfig} className="min-h-[150px] w-full flex-1">
        <BarChart data={summary.rows}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} fontSize={11} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {summary.rows.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
