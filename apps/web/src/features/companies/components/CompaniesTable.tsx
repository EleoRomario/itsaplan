'use client';

import Link from 'next/link';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CompanySummary } from '@/lib/api/endpoints/companies';
import { companyDetailPath } from '@/utils/paths';
import { Badge } from '@/components/ui/badge';

export default function CompaniesTable({
  companies,
  projectKey,
}: {
  companies: CompanySummary[];
  projectKey: string;
}) {
  const t = useTranslations('companies');

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-start text-xs">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 text-start font-medium">{t('table.company')}</th>
            <th className="px-3 py-2.5 text-start font-medium">{t('assignedExecutive')}</th>
            <th className="px-3 py-2.5 text-end font-medium">{t('portfolio.projects')}</th>
            <th className="px-3 py-2.5 text-start font-medium">{t('portfolio.progress')}</th>
            <th className="px-3 py-2.5 text-end font-medium">{t('portfolio.open')}</th>
            <th className="px-3 py-2.5 text-end font-medium">{t('portfolio.overdue')}</th>
            <th className="px-3 py-2.5 text-end font-medium">{t('table.lastActivity')}</th>
            <th className="w-8 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {companies.map((c) => {
            const s = c.stats;
            const total = s?.totalIssues ?? 0;
            const completed = s?.completedIssues ?? 0;
            const open = s?.openIssues ?? 0;
            const overdue = s?.overdueIssues ?? 0;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <tr
                key={c.id}
                className={`transition-colors hover:bg-muted/40 ${
                  c.isBlacklisted ? 'bg-destructive/5' : ''
                }`}
              >
                <td className="px-3 py-2.5">
                  <Link
                    href={companyDetailPath(projectKey, c.id)}
                    className="flex flex-col gap-0.5 hover:text-primary"
                  >
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <span className="truncate">{c.name}</span>
                      {c.isBlacklisted && (
                        <Badge variant="destructive" className="h-4 gap-0.5 px-1 text-[10px]">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Blacklist
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {c.code ? `${c.code} · ` : ''}
                      {c.taxId}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {c.owner?.name || c.owner?.email || '—'}
                </td>
                <td className="px-3 py-2.5 text-end font-medium">{s?.projectCount ?? 0}</td>
                <td className="min-w-[140px] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 text-end text-[11px] text-muted-foreground">
                      {completed}/{total}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-end">{open}</td>
                <td className="px-3 py-2.5 text-end">
                  {overdue > 0 ? (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                      {overdue}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-end text-muted-foreground">
                  {s?.lastActivityAt ? new Date(s.lastActivityAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-2 py-2.5 text-end">
                  <Link
                    href={companyDetailPath(projectKey, c.id)}
                    className="inline-flex text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
