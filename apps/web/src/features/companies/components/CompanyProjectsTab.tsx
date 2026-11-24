'use client';

import Link from 'next/link';
import { AlertTriangle, FolderKanban, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CompanyProjectItem } from '@/lib/api/endpoints/companies';
import { projectPath } from '@/utils/paths';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function CompanyProjectsTab({
  projects,
  isLoading,
  onCreateProject,
}: {
  projects: CompanyProjectItem[];
  isLoading: boolean;
  onCreateProject?: () => void;
}) {
  const t = useTranslations('companies');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{t('projects.description')}</span>
        {onCreateProject && (
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={onCreateProject}>
            <Plus className="h-3.5 w-3.5" />
            {t('projects.create')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">{t('loading')}</div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
          {t('projects.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const pct =
              p.totalIssues > 0 ? Math.round((p.completedIssues / p.totalIssues) * 100) : 0;
            return (
              <Link
                key={p.id}
                href={projectPath(p.ref)}
                className="flex flex-col justify-between rounded-lg border bg-card p-3.5 transition-colors hover:border-primary/50"
              >
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{p.name}</span>
                    </div>
                    <Badge variant="outline" className="h-5 shrink-0 font-mono text-[10px]">
                      {p.key}
                    </Badge>
                  </div>
                  <div className="mb-3 text-[11px] text-muted-foreground">{p.teamName}</div>
                </div>

                <div className="space-y-1.5 border-t pt-2.5 text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      {p.completedIssues}/{p.totalIssues} ({pct}%) · {p.openIssues}{' '}
                      {t('portfolio.open')}
                    </span>
                    {p.overdueIssues > 0 && (
                      <Badge variant="destructive" className="h-4 gap-0.5 px-1 text-[9px]">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {p.overdueIssues}
                      </Badge>
                    )}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
