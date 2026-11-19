'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Initiative } from '@/lib/api/endpoints/initiatives';
import type { InitiativesTab } from '@/utils/paths';
import { initiativePath } from '@/utils/paths';
import { useElementWidth } from '@/hooks/useElementWidth';
import { usePersistedWidth } from '@/hooks/usePersistedWidth';
import { LABEL_MAX_W, LABEL_MIN_W, LABEL_NARROW_W, LABEL_W } from '@/utils/timelineTrack';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/page/EmptyState';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import { TimelineHeader } from '@/components/common/timeline/TimelineHeader';
import { TimelineLabelResizer } from '@/components/common/timeline/TimelineLabelResizer';
import {
  buildInitiativeTimeline,
  INITIATIVE_DAY_W,
  initiativeLabelWidthKey,
} from '../../utils/initiativeTimeline';
import InitiativeTimelineRow from './InitiativeTimelineRow';

export default function InitiativesTimeline({
  initiatives,
  projectKey,
  isLoading,
  canCreate,
  onCreate,
  statusTab,
}: {
  initiatives: Initiative[];
  projectKey: string;
  isLoading: boolean;
  canCreate: boolean;
  onCreate: () => void;
  statusTab: Exclude<InitiativesTab, 'all'> | undefined;
}) {
  const t = useTranslations('initiatives');
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolledToToday = useRef(false);
  const viewportW = useElementWidth(scrollRef);

  const { width: labelWidth, setWidth: setLabelWidth } = usePersistedWidth(
    initiativeLabelWidthKey(projectKey),
    LABEL_W,
    LABEL_MIN_W,
    LABEL_MAX_W,
  );
  const narrow = viewportW < 640;
  const labelW = narrow ? LABEL_NARROW_W : labelWidth;

  const { rows, days, months, trackWidth, todayLeft, todayInRange, dayLines, spanToRect } =
    buildInitiativeTimeline({
      initiatives,
      viewportW,
      labelW,
      dayW: INITIATIVE_DAY_W,
    });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || scrolledToToday.current || rows.length === 0) return;
    scrolledToToday.current = true;
    el.scrollLeft = Math.max(0, todayLeft - labelW);
  }, [rows.length, todayLeft, labelW]);

  if (isLoading) return <ListSkeleton className="px-4 py-6" rowClassName="h-12" />;

  if (initiatives.length === 0) {
    if (statusTab) {
      return (
        <EmptyState title={t(`emptyTab.${statusTab}`)} description={t('emptyTabDescription')} />
      );
    }
    return (
      <EmptyState title={t('emptyTitle')} description={t('emptyDescription')}>
        {canCreate && (
          <Button size="sm" onClick={onCreate}>
            <Plus className="size-3.5" />
            {t('newInitiative')}
          </Button>
        )}
      </EmptyState>
    );
  }

  const openInitiative = (id: number) => router.push(initiativePath(projectKey, id));

  return (
    <div ref={scrollRef} dir="ltr" className="flex-1 overflow-auto border-t">
      <div className="relative" style={{ width: labelW + trackWidth }}>
        <TimelineHeader
          labelW={labelW}
          trackWidth={trackWidth}
          dayW={INITIATIVE_DAY_W}
          months={months}
          days={days}
        />
        {!narrow && <TimelineLabelResizer labelW={labelW} onResize={setLabelWidth} />}

        {rows.map(({ initiative, span }) => (
          <InitiativeTimelineRow
            key={initiative.id}
            initiative={initiative}
            projectKey={projectKey}
            span={span}
            rect={span ? spanToRect(span.start, span.end) : null}
            labelW={labelW}
            trackWidth={trackWidth}
            dayLines={dayLines}
            todayInRange={todayInRange}
            todayLeft={todayLeft}
            onOpen={openInitiative}
          />
        ))}
      </div>
    </div>
  );
}
