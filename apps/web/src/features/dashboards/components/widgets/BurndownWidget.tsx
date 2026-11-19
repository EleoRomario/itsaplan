import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { useTranslations } from 'next-intl';
import type { WidgetConfig } from '@/utils/dashboardWidgets';
import { formatShortDate } from '@/utils/dates';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useBurnupQuery } from '../../services/analytics.service';

const LINE_COLOR = {
  remaining: '#ef4444',
  ideal: '#94a3b8',
};

// Remaining open work over time compared against a linear ideal burndown line.
export default function BurndownWidget({
  projectKey,
  config,
}: {
  projectKey: string;
  config: WidgetConfig;
}) {
  const t = useTranslations('dashboards.burndown');
  const tDashboards = useTranslations('dashboards');
  const days = config.days ?? 30;
  const { data, isLoading } = useBurnupQuery(projectKey, {
    days,
    initiativeId: null,
    forecastWeeks: 4,
  });

  const chartData = useMemo(() => {
    const series = data?.days ?? [];
    if (series.length === 0) return [];
    const firstNonZero = series.findIndex((d) => d.scope > 0);
    const trimmed = firstNonZero >= 0 ? series.slice(firstNonZero) : series;
    const startRemaining = Math.max(0, trimmed[0]!.scope - trimmed[0]!.completed);
    const denom = Math.max(1, trimmed.length - 1);
    return trimmed.map((d, idx) => ({
      label: formatShortDate(d.date),
      remaining: Math.max(0, d.scope - d.completed),
      ideal: Math.round(startRemaining * (1 - idx / denom) * 10) / 10,
    }));
  }, [data]);

  const chartConfig: ChartConfig = {
    remaining: { label: t('remaining'), color: LINE_COLOR.remaining },
    ideal: { label: t('ideal'), color: LINE_COLOR.ideal },
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-xs text-muted-foreground">{tDashboards('lastDays', { days })}</p>
      {isLoading ? (
        <Skeleton className="h-[160px] w-full" />
      ) : chartData.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ChartContainer dir="ltr" config={chartConfig} className="min-h-[150px] w-full flex-1">
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} fontSize={11} />
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
              dataKey="remaining"
              stroke="var(--color-remaining)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="linear"
              dataKey="ideal"
              stroke="var(--color-ideal)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
}
