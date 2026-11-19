'use client';

import { GanttChart, Table2, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type InitiativesView = 'table' | 'timeline';

const VIEWS: { value: InitiativesView; icon: LucideIcon }[] = [
  { value: 'table', icon: Table2 },
  { value: 'timeline', icon: GanttChart },
];

export default function InitiativesViewToggle({
  view,
  onChange,
}: {
  view: InitiativesView;
  onChange: (next: InitiativesView) => void;
}) {
  const t = useTranslations('display.layouts');

  return (
    <div
      role="group"
      aria-label={t('table')}
      className="inline-flex h-8 items-center rounded-md border bg-muted/40 p-0.5"
    >
      {VIEWS.map(({ value, icon: Icon }) => {
        const active = view === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={active}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            <span>{t(value)}</span>
          </button>
        );
      })}
    </div>
  );
}
