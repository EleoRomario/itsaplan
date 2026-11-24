'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Sparkles,
  User,
  Users,
  LayoutGrid,
  Table2,
  FolderKanban,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useShell } from '@/context/shellContext';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useCompaniesQuery,
  useCreateCompanyMutation,
  useLookupSunatMutation,
} from '@/services/companies.service';
import { useMembersQuery } from '@/services/members.service';
import { companyDetailPath } from '@/utils/paths';
import {
  COMPANY_CODE_MAX_LENGTH,
  normalizeCompanyCode,
  suggestCompanyCode,
} from '@/utils/companyCode';
import SectionPageView from '@/components/common/page/SectionPageView';
import CompaniesPortfolioSummary from './components/CompaniesPortfolioSummary';
import CompaniesTable from './components/CompaniesTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CompaniesPage() {
  const t = useTranslations('companies');
  const { project } = useShell();
  const { data: session } = useSession();
  const { can, isAdmin } = usePermissions(project);

  const [search, setSearch] = useState('');
  const [showBlacklistOnly, setShowBlacklistOnly] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<'mine' | 'all'>('mine');
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'overdue'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [taxId, setTaxId] = useState('');
  const [code, setCode] = useState('');
  const [codeEdited, setCodeEdited] = useState(false);
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [status, setStatus] = useState('ACTIVO');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('PE');
  const [notes, setNotes] = useState('');
  const [selectedOwnerUserId, setSelectedOwnerUserId] = useState<string>('');

  const projectKey = project?.project.ref ?? '';
  const teamId = project?.project.teamId;

  const membersQuery = useMembersQuery(projectKey, { kind: 'human', page: 1, pageSize: 50 });
  const members = membersQuery.data?.items ?? [];

  const { data: rawCompanies = [], isLoading } = useCompaniesQuery({
    search: search.trim() || undefined,
    isBlacklisted: showBlacklistOnly ? true : undefined,
    filter: isAdmin ? scopeFilter : 'mine',
  });

  const companies = rawCompanies.filter((c) => {
    if (activityFilter === 'active') {
      return (c.stats?.openIssues ?? 0) > 0 || (c.stats?.projectCount ?? 0) > 0;
    }
    if (activityFilter === 'overdue') {
      return (c.stats?.overdueIssues ?? 0) > 0;
    }
    return true;
  });

  const createMutation = useCreateCompanyMutation();
  const sunatMutation = useLookupSunatMutation();

  const handleLookupSunat = async () => {
    const cleanTaxId = taxId.trim();
    if (!cleanTaxId) return;

    try {
      const sunatData = await sunatMutation.mutateAsync(cleanTaxId);
      if (sunatData) {
        setName(sunatData.name);
        if (!codeEdited) setCode(suggestCompanyCode(sunatData.name, tradeName));
        setStatus(sunatData.status || 'ACTIVO');
        if (sunatData.address) setAddress(sunatData.address);
        const cityParts = [sunatData.district, sunatData.province, sunatData.department]
          .filter(Boolean)
          .join(', ');
        if (cityParts) setCity(cityParts);
        setCountry('PE');
      }
    } catch {
      // Handled by UI feedback
    }
  };

  const handleOpenCreate = () => {
    setFormError(null);
    setSelectedOwnerUserId(session?.user?.id ?? '');
    setCreating(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxId.trim() || !name.trim()) return;
    setFormError(null);

    try {
      await createMutation.mutateAsync({
        taxId: taxId.trim(),
        code: code.trim() || undefined,
        name: name.trim(),
        tradeName: tradeName.trim() || undefined,
        status: status || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        notes: notes.trim() || undefined,
        ownerUserId: isAdmin && selectedOwnerUserId ? selectedOwnerUserId : session?.user?.id,
        teamId,
      });

      setCreating(false);
      setTaxId('');
      setCode('');
      setCodeEdited(false);
      setName('');
      setTradeName('');
      setStatus('ACTIVO');
      setEmail('');
      setPhone('');
      setAddress('');
      setCity('');
      setNotes('');
      setSelectedOwnerUserId('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la empresa';
      setFormError(msg);
    }
  };

  const canCreate = can('companies', 'create') || isAdmin;

  return (
    <SectionPageView
      title={t('title')}
      description={t('description')}
      wide
      actions={
        canCreate ? (
          <Button className="gap-1.5" onClick={handleOpenCreate}>
            <Plus className="size-4" />
            {t('register')}
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        {!isLoading && <CompaniesPortfolioSummary companies={rawCompanies} />}

        {/* Filters bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm min-w-[240px]">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('searchPlaceholder')}
                className="ps-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {isAdmin && (
              <div className="flex items-center rounded-lg border bg-muted/40 p-1">
                <Button
                  variant={scopeFilter === 'mine' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs font-medium"
                  onClick={() => setScopeFilter('mine')}
                >
                  <User className="me-1 h-3.5 w-3.5" />
                  {t('myCompanies')}
                </Button>
                <Button
                  variant={scopeFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs font-medium"
                  onClick={() => setScopeFilter('all')}
                >
                  <Users className="me-1 h-3.5 w-3.5" />
                  {t('allCompanies')}
                </Button>
              </div>
            )}

            <div className="flex items-center rounded-lg border bg-muted/40 p-1">
              <Button
                variant={activityFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActivityFilter('all')}
              >
                {t('portfolio.filterAll')}
              </Button>
              <Button
                variant={activityFilter === 'active' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActivityFilter('active')}
              >
                {t('portfolio.filterActive')}
              </Button>
              <Button
                variant={activityFilter === 'overdue' ? 'destructive' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActivityFilter('overdue')}
              >
                {t('portfolio.filterOverdue')}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showBlacklistOnly ? 'destructive' : 'outline'}
              size="sm"
              className="h-9 gap-1.5 text-xs"
              onClick={() => setShowBlacklistOnly(!showBlacklistOnly)}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {showBlacklistOnly ? t('showingBlacklisted') : t('filterBlacklisted')}
            </Button>

            <div className="flex items-center rounded-lg border bg-muted/40 p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('table')}
                aria-label="Table view"
              >
                <Table2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Company list / grid */}
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{t('loading')}</div>
        ) : companies.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold">{t('noCompanies')}</h3>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">
              {search ? t('noCompaniesAdjust') : t('noCompaniesDesc')}
            </p>
            {canCreate && (
              <Button size="sm" onClick={handleOpenCreate}>
                {t('register')}
              </Button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <CompaniesTable companies={companies} projectKey={projectKey} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => {
              const s = c.stats;
              const total = s?.totalIssues ?? 0;
              const completed = s?.completedIssues ?? 0;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <Link
                  key={c.id}
                  href={companyDetailPath(projectKey, c.id)}
                  className={`group relative flex flex-col justify-between rounded-lg border p-4 transition-all hover:shadow-sm ${
                    c.isBlacklisted
                      ? 'border-destructive/40 bg-destructive/5 hover:border-destructive'
                      : 'bg-card hover:border-primary/50'
                  }`}
                >
                  <div>
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className={`rounded-md p-1.5 ${c.isBlacklisted ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}`}
                        >
                          <Building2 className="h-4 w-4" />
                        </div>
                        <span className="truncate text-sm font-semibold group-hover:text-primary">
                          {c.name}
                        </span>
                      </div>
                      {c.isBlacklisted ? (
                        <Badge variant="destructive" className="h-5 shrink-0 gap-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3" />
                          Blacklist
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="h-5 shrink-0 text-[10px]">
                          {c.status}
                        </Badge>
                      )}
                    </div>

                    <div className="mb-2 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      {c.code && (
                        <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
                          {c.code}
                        </Badge>
                      )}
                      <span>RUC: {c.taxId}</span>
                    </div>

                    {c.tradeName && (
                      <div className="mb-2 line-clamp-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{t('commercialName')}</span>{' '}
                        {c.tradeName}
                      </div>
                    )}

                    {/* Account executive badge */}
                    <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">{t('assignedExecutive')}:</span>
                      <span className="truncate">
                        {c.owner?.name || c.owner?.email || 'Sin asignar'}
                      </span>
                    </div>

                    {s && (s.projectCount > 0 || total > 0) && (
                      <div className="mb-3 space-y-1.5 rounded-md border bg-muted/30 p-2 text-[11px]">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            {s.projectCount} {t('portfolio.projects')}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span>
                              {completed}/{total} ({pct}%)
                            </span>
                            {s.overdueIssues > 0 && (
                              <Badge variant="destructive" className="h-4 px-1 text-[9px]">
                                {s.overdueIssues} {t('portfolio.overdue')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {total > 0 && (
                          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    )}

                    {c.isBlacklisted && c.blacklistReason && (
                      <div className="mb-2 rounded border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
                        <strong>{t('reason')}</strong> {c.blacklistReason}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                    <span>{c.city ? `${c.city}, ${c.country}` : c.country || 'Global'}</span>
                    <span className="flex items-center gap-1 group-hover:text-foreground">
                      {t('viewFile')}
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* New Company Modal with SUNAT lookup & Account Owner assignment */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('newModal.title')}
              </DialogTitle>
            </DialogHeader>

            {formError && (
              <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="leading-relaxed font-medium">{formError}</div>
              </div>
            )}

            <div className="space-y-3 py-4 text-sm">
              {/* Executive assignment */}
              <div className="space-y-1">
                <Label>{t('assignedExecutive')}</Label>
                {isAdmin ? (
                  <Select
                    value={selectedOwnerUserId || session?.user?.id || ''}
                    onValueChange={setSelectedOwnerUserId}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={t('selectExecutive')} />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId} className="text-xs">
                          {m.name || m.email}
                          {m.userId === session?.user?.id ? ' (Tú)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-xs text-muted-foreground">
                    <User className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    <span>
                      {session?.user?.name || session?.user?.email} ({t('assignedToYou')})
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="taxId">{t('newModal.taxIdLabel')}</Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="taxId"
                      required
                      placeholder="e.g. 20100070970"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0 gap-1 px-2.5 text-xs"
                      onClick={handleLookupSunat}
                      disabled={sunatMutation.isPending || !taxId.trim()}
                    >
                      {sunatMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      )}
                      SUNAT
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="country">{t('newModal.countryLabel')}</Label>
                  <Input
                    id="country"
                    placeholder="PE"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="name">{t('newModal.nameLabel')}</Label>
                  <Input
                    id="name"
                    required
                    placeholder="ACME Corporation S.A.C."
                    value={name}
                    onChange={(e) => {
                      const next = e.target.value;
                      setName(next);
                      if (!codeEdited) setCode(suggestCompanyCode(next, tradeName));
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="code">{t('newModal.codeLabel')}</Label>
                  <Input
                    id="code"
                    className="font-mono uppercase"
                    placeholder="ACIDE"
                    maxLength={COMPANY_CODE_MAX_LENGTH}
                    value={code}
                    onChange={(e) => {
                      const next = normalizeCompanyCode(e.target.value);
                      setCode(next);
                      setCodeEdited(next !== '');
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="tradeName">{t('newModal.tradeNameLabel')}</Label>
                  <Input
                    id="tradeName"
                    placeholder="ACME Tech"
                    value={tradeName}
                    onChange={(e) => {
                      const next = e.target.value;
                      setTradeName(next);
                      if (!codeEdited) setCode(suggestCompanyCode(name, next));
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="status">{t('status')}</Label>
                  <Input
                    id="status"
                    placeholder="ACTIVO"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="address">{t('newModal.addressLabel')}</Label>
                <Input
                  id="address"
                  placeholder="Av. Javier Prado Este 123"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="email">{t('contacts.emailLabel')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contacto@acme.pe"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">{t('contacts.phoneLabel')}</Label>
                  <Input
                    id="phone"
                    placeholder="+51 987654321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="city">{t('newModal.cityLabel')}</Label>
                <Input
                  id="city"
                  placeholder="San Borja, Lima, Lima"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">{t('newModal.notesLabel')}</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder={t('newModal.notesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreating(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : t('newModal.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionPageView>
  );
}
