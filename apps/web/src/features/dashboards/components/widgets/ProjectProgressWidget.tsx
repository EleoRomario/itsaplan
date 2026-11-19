import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { useTranslations } from 'next-intl';
import { useShell } from '@/context/shellContext';
import { formatShortDate } from '@/utils/dates';
import { progressColor } from '@/utils/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const LINE_COLOR = {
  planned: '#3b82f6',
  approved: '#22c55e',
  overdue: '#ef4444',
};

// Shows the project's completion percentage with a percentage-colored bar, paired
// with a multi-line chart comparing due dates against completed/approved dates.
export default function ProjectProgressWidget() {
  const t = useTranslations('dashboards.projectProgress');
  const { project } = useShell();

  const stats = useMemo(() => {
    if (!project) return null;
    const stateByColumn = new Map(project.columns.map((c) => [c.id, c.stateType]));
    let completed = 0;
    let inProgress = 0;
    let open = 0;
    for (const item of project.issues) {
      const state = stateByColumn.get(item.columnId);
      if (state === 'completed') completed += 1;
      if (state === 'started') inProgress += 1;
      if (state !== 'completed' && state !== 'canceled') open += 1;
    }
    const total = project.issues.length;
    const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      total,
      completed,
      inProgress,
      open,
      progressPercentage,
      barColor: progressColor(progressPercentage),
    };
  }, [project]);

  const chartData = useMemo(() => {
    if (!project) return [];
    const stateByColumn = new Map(project.columns.map((c) => [c.id, c.stateType]));
    const dueDates: string[] = [];
    const approvedDates: string[] = [];
    const dateSet = new Set<string>();

    for (const item of project.issues) {
      const state = stateByColumn.get(item.columnId);
      if (item.dueDate) {
        const d = item.dueDate.slice(0, 10);
        dueDates.push(d);
        dateSet.add(d);
      }
      if (state === 'completed' && item.statusSince) {
        const d = item.statusSince.slice(0, 10);
        approvedDates.push(d);
        dateSet.add(d);
      }
    }

    const dates = [...dateSet].sort();
    return dates.map((date) => {
      const planned = dueDates.filter((d) => d <= date).length;
      const approved = approvedDates.filter((d) => d <= date).length;
      return {
        date,
        label: formatShortDate(date),
        planned,
        approved,
        overdue: Math.max(0, planned - approved),
      };
    });
  }, [project]);

  const chartConfig: ChartConfig = {
    planned: { label: t('planned'), color: LINE_COLOR.planned },
    approved: { label: t('approved'), color: LINE_COLOR.approved },
    overdue: { label: t('overdue'), color: LINE_COLOR.overdue },
  };

  if (!stats) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('taskProgress')}</span>
          <span className="text-sm font-semibold tabular-nums">{stats.progressPercentage}%</span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={stats.progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${stats.progressPercentage}%`, backgroundColor: stats.barColor }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
          <span>{t('completedOfTotal', { completed: stats.completed, total: stats.total })}</span>
          <span>•</span>
          <span>{t('openCount', { count: stats.open })}</span>
          <span>•</span>
          <span>{t('inProgressCount', { count: stats.inProgress })}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ChartContainer dir="ltr" config={chartConfig} className="min-h-[150px] w-full flex-1">
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                fontSize={11}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={28}
                fontSize={11}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="planned"
                stroke="var(--color-planned)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="approved"
                stroke="var(--color-approved)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="overdue"
                stroke="var(--color-overdue)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2.5 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
