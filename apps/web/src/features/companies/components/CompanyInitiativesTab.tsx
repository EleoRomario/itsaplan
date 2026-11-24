'use client';

import Link from 'next/link';
import { Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CompanyInitiativeItem } from '@/lib/api/endpoints/companies';
import { initiativePath } from '@/utils/paths';
import { Badge } from '@/components/ui/badge';

export default function CompanyInitiativesTab({
  initiatives,
  isLoading,
}: {
  initiatives: CompanyInitiativeItem[];
  isLoading: boolean;
}) {
  const t = useTranslations('companies');

  if (isLoading) {
    return <div className="py-8 text-center text-xs text-muted-foreground">{t('loading')}</div>;
  }

  if (initiatives.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
        {t('initiatives.empty')}
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border bg-card">
      {initiatives.map((item) => {
        const pct =
          item.totalIssues > 0 ? Math.round((item.completedIssues / item.totalIssues) * 100) : 0;
        return (
          <Link
            key={item.id}
            href={initiativePath(item.projectRef, item.id)}
            className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-muted/40"
          >
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{item.title}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{item.projectName}</span>
                <span>•</span>
                <Badge variant="outline" className="h-4 text-[10px]">
                  {item.status}
                </Badge>
                {item.targetDate && <span>• {item.targetDate}</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-14 text-end text-[11px] text-muted-foreground">
                {item.completedIssues}/{item.totalIssues}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
