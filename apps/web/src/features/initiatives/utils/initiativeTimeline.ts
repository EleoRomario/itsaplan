import type { Initiative } from '@/lib/api/endpoints/initiatives';
import { addDays, daysBetween, parseDate } from '@/utils/dates';
import { buildDayTrack, type DayTrack } from '@/utils/timelineTrack';

export const INITIATIVE_DAY_W = 12;
export const INITIATIVE_ROW_H = 40;

export function initiativeLabelWidthKey(projectKey: string): string {
  return `initiatives-timeline-label-width:${projectKey}`;
}

export interface InitiativeSpan {
  start: Date;
  end: Date;
}

export function initiativeSpan(initiative: Initiative): InitiativeSpan | null {
  const start = parseDate(initiative.startDate);
  const target = parseDate(initiative.targetDate);
  if (start && target) return target >= start ? { start, end: target } : { start, end: start };
  if (target) {
    const created = parseDate(initiative.createdAt.slice(0, 10));
    const fallbackStart = created && created <= target ? created : target;
    return { start: fallbackStart, end: target };
  }
  if (start) return { start, end: addDays(start, 6) };
  return null;
}

export function initiativeLength(span: InitiativeSpan): number {
  return daysBetween(span.start, span.end) + 1;
}

export interface InitiativeTimelineRowItem {
  initiative: Initiative;
  span: InitiativeSpan | null;
}

export interface InitiativeTimelineModel extends DayTrack {
  rows: InitiativeTimelineRowItem[];
}

export function buildInitiativeTimeline({
  initiatives,
  viewportW,
  labelW,
  dayW,
}: {
  initiatives: Initiative[];
  viewportW: number;
  labelW: number;
  dayW: number;
}): InitiativeTimelineModel {
  const rows: InitiativeTimelineRowItem[] = [];
  let min: Date | null = null;
  let max: Date | null = null;

  for (const initiative of initiatives) {
    const span = initiativeSpan(initiative);
    if (span) {
      if (!min || span.start < min) min = span.start;
      if (!max || span.end > max) max = span.end;
    }
    rows.push({ initiative, span });
  }

  return { rows, ...buildDayTrack({ min, max, viewportW, labelW, dayW }) };
}
