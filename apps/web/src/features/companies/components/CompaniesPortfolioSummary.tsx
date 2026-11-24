'use client';

import { AlertTriangle, Building2, CheckCircle2, FolderKanban } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CompanySummary } from '@/lib/api/endpoints/companies';

export default function CompaniesPortfolioSummary({ companies }: { companies: CompanySummary[] }) {
  const t = useTranslations('companies.portfolio');

  let totalProjects = 0;
  let totalIssues = 0;
  let openIssues = 0;
  let completedIssues = 0;
  let overdueIssues = 0;

  for (const c of companies) {
    if (!c.stats) continue;
    totalProjects += c.stats.projectCount;
    totalIssues += c.stats.totalIssues;
    openIssues += c.stats.openIssues;
    completedIssues += c.stats.completedIssues;
    overdueIssues += c.stats.overdueIssues;
  }

  const pct = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-lg border bg-card p-3.5">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('companies')}</span>
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <div className="text-xl font-semibold">{companies.length}</div>
      </div>

      <div className="rounded-lg border bg-card p-3.5">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('projects')}</span>
          <FolderKanban className="h-3.5 w-3.5" />
        </div>
        <div className="text-xl font-semibold">{totalProjects}</div>
      </div>

      <div className="rounded-lg border bg-card p-3.5">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('progress')}</span>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold">{pct}%</span>
          <span className="text-xs text-muted-foreground">
            {completedIssues}/{totalIssues} · {openIssues} {t('open')}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div
        className={`rounded-lg border p-3.5 ${
          overdueIssues > 0 ? 'border-destructive/40 bg-destructive/5' : 'bg-card'
        }`}
      >
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('overdue')}</span>
          <AlertTriangle className={`h-3.5 w-3.5 ${overdueIssues > 0 ? 'text-destructive' : ''}`} />
        </div>
        <div className={`text-xl font-semibold ${overdueIssues > 0 ? 'text-destructive' : ''}`}>
          {overdueIssues}
        </div>
      </div>
    </div>
  );
}
