'use client';

import Link from 'next/link';
import { CalendarRange, CircleDashed } from 'lucide-react';
import type { Initiative } from '@/lib/api/endpoints/initiatives';
import { formatShortDate } from '@/utils/dates';
import { STATUS_META } from '@/utils/initiativeMeta';
import { initiativePath } from '@/utils/paths';
import { progressPercent } from '@/utils/progress';
import {
  INITIATIVE_ROW_H,
  initiativeLength,
  type InitiativeSpan,
} from '../../utils/initiativeTimeline';

export default function InitiativeTimelineRow({
  initiative,
  projectKey,
  span,
  rect,
  labelW,
  trackWidth,
  dayLines,
  todayInRange,
  todayLeft,
  onOpen,
}: {
  initiative: Initiative;
  projectKey: string;
  span: InitiativeSpan | null;
  rect: { left: number; width: number } | null;
  labelW: number;
  trackWidth: number;
  dayLines: { backgroundImage: string };
  todayInRange: boolean;
  todayLeft: number;
  onOpen: (id: number) => void;
}) {
  const color = STATUS_META[initiative.status].color;
  const href = initiativePath(projectKey, initiative.id);
  const titleRange =
    initiative.startDate && initiative.targetDate
      ? `${formatShortDate(initiative.startDate)} – ${formatShortDate(initiative.targetDate)}`
      : initiative.targetDate
        ? formatShortDate(initiative.targetDate)
        : undefined;

  return (
    <div className="flex border-b hover:bg-accent/20" style={{ height: INITIATIVE_ROW_H }}>
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-2 overflow-hidden border-r bg-background px-3"
        style={{ width: labelW }}
      >
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <Link href={href} className="truncate text-sm font-medium hover:underline">
          {initiative.title}
        </Link>
      </div>

      <div className="relative overflow-hidden" style={{ width: trackWidth, ...dayLines }}>
        {todayInRange && (
          <div
            className="absolute top-0 bottom-0 z-0 w-px bg-primary/40"
            style={{ left: todayLeft }}
          />
        )}

        {rect && span && (
          <>
            <button
              type="button"
              onClick={() => onOpen(initiative.id)}
              title={titleRange}
              className="absolute top-1/2 z-[1] flex h-6 -translate-y-1/2 cursor-pointer items-center overflow-hidden rounded px-1.5 text-white select-none"
              style={{ left: rect.left, width: rect.width, backgroundColor: color }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-white/30"
                style={{ width: `${progressPercent(initiative.progress)}%` }}
              />
              <span className="relative truncate text-[11px] leading-none">{initiative.title}</span>
            </button>

            <div
              className="pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center gap-2.5 text-[11px] whitespace-nowrap text-muted-foreground tabular-nums"
              style={{ left: rect.left + rect.width + 8 }}
            >
              <span className="flex items-center gap-1">
                <CalendarRange className="size-3" />
                {initiativeLength(span)}d
              </span>
              {initiative.progress.total > 0 && (
                <span className="flex items-center gap-1">
                  <CircleDashed className="size-3" />
                  {initiative.progress.completed}/{initiative.progress.total}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
