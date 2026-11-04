'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Bot,
  Building2,
  Calendar,
  CircleDot,
  Clock,
  FolderKanban,
  HardDrive,
  Search,
  Target,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import SectionPageView from '@/components/common/page/SectionPageView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspaceDashboardQuery } from '@/services/workspaces.service';
import { formatDate } from '@/utils/dates';
import { formatSize } from '@/utils/fileSize';

export default function WorkspaceDashboard({ workspaceId }: { workspaceId: number }) {
  const t = useTranslations('sections.previews.dashboard');
  const { data, isLoading } = useWorkspaceDashboardQuery(workspaceId);
  const [search, setSearch] = useState('');

  const filteredProjects = useMemo(() => {
    if (!data?.projects) return [];
    if (!search.trim()) return data.projects;
    const query = search.toLowerCase();
    return data.projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.key.toLowerCase().includes(query) ||
        p.teamName.toLowerCase().includes(query),
    );
  }, [data?.projects, search]);

  const globalCompletionRate = useMemo(() => {
    if (!data?.totals || data.totals.totalIssues === 0) return 0;
    return Math.round((data.totals.completedIssues / data.totals.totalIssues) * 100);
  }, [data?.totals]);

  return (
    <SectionPageView title={t('title')} description={t('description')} wide>
      <div className="flex flex-col gap-8 pb-10">
        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t('summary.teams')}</span>
              <Building2 className="size-4" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{data?.totals.teams ?? 0}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t('summary.projects')}</span>
              <FolderKanban className="size-4" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{data?.totals.projects ?? 0}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t('summary.people')}</span>
              <Users className="size-4" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{data?.totals.people ?? 0}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t('summary.agents')}</span>
              <Bot className="size-4" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{data?.totals.agents ?? 0}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t('summary.openIssues')}</span>
              <CircleDot className="size-4" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{data?.totals.openIssues ?? 0}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">{t('summary.storage')}</span>
              <HardDrive className="size-4" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">
                {formatSize(data?.totals.storageBytes ?? 0)}
              </p>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Projects and Progress Section */}
          <div className="flex flex-col gap-4 lg:col-span-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-semibold">{t('blocks.projects')}</h2>
                <p className="text-xs text-muted-foreground">
                  Avance y fechas de los proyectos activos del espacio de trabajo
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar proyectos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
                <FolderKanban className="size-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm font-medium">No se encontraron proyectos</p>
                <p className="text-xs text-muted-foreground">
                  {search
                    ? 'Ningún proyecto coincide con la búsqueda.'
                    : 'Crea un proyecto en tus equipos para ver su avance aquí.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    className="group relative flex flex-col gap-3.5 rounded-xl border bg-card p-4 transition-colors hover:border-border/80 hover:bg-accent/20"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/${encodeURIComponent(p.teamRef)}/${encodeURIComponent(p.key)}`}
                          className="flex items-center gap-1 text-sm font-semibold hover:underline"
                        >
                          {p.name}
                          <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {p.key}
                        </Badge>
                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          {p.teamName}
                        </Badge>
                      </div>

                      {/* Dates / Cycle indicator */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {p.activeCycle ? (
                          <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            <Clock className="size-3" />
                            <span>
                              {p.activeCycle.name}: {formatDate(p.activeCycle.startDate)} –{' '}
                              {formatDate(p.activeCycle.endDate)}
                            </span>
                          </div>
                        ) : p.activeInitiative ? (
                          <div className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                            <Target className="size-3" />
                            <span>
                              {p.activeInitiative.title}
                              {p.activeInitiative.startDate && p.activeInitiative.targetDate
                                ? `: ${formatDate(p.activeInitiative.startDate)} – ${formatDate(p.activeInitiative.targetDate)}`
                                : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Calendar className="size-3" />
                            <span>Creado {formatDate(p.createdAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar and metrics */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progreso de tareas</span>
                        <span className="font-semibold">{p.progressPercentage}%</span>
                      </div>
                      <Progress value={p.progressPercentage} className="h-2" />
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                        <span>
                          <strong className="text-foreground">{p.completedIssues}</strong> de{' '}
                          {p.totalIssues} completadas
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-foreground">{p.openIssues}</strong> abiertas
                        </span>
                        <span>•</span>
                        <span>
                          <strong className="text-foreground">{p.inProgressIssues}</strong> en
                          progreso
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar: Teams and Overview */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* Global resolution card */}
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold">Resolución global</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total completado</span>
                  <span className="font-semibold">{globalCompletionRate}%</span>
                </div>
                <Progress value={globalCompletionRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {data?.totals.completedIssues ?? 0} de {data?.totals.totalIssues ?? 0} tickets
                  resueltos en todos los proyectos.
                </p>
              </div>
            </div>

            {/* Teams List */}
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t('blocks.teams')}</h3>
                <span className="text-xs text-muted-foreground">
                  {data?.teams.length ?? 0} equipos
                </span>
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : data?.teams.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No hay equipos en este espacio de trabajo.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-border/60">
                  {data?.teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/${encodeURIComponent(team.ref)}`}
                          className="block truncate text-xs font-medium hover:underline"
                        >
                          {team.name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">
                          {team.memberCount} miembros · {team.projectCount} proyectos
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="icon-xs">
                        <Link href={`/${encodeURIComponent(team.ref)}`}>
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionPageView>
  );
}
