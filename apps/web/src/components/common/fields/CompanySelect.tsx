'use client';

import { useContext, useState, type ReactNode } from 'react';
import { Building2, Check, AlertTriangle, CircleDashed, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CompanyRef, CompanySummary } from '@/lib/api/endpoints/companies';
import { ShellCtx } from '@/context/shellContext';
import { useCompaniesQuery } from '@/services/companies.service';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Pill } from '@/components/common/fields/Pill';
import { Badge } from '@/components/ui/badge';

export default function CompanySelect({
  value,
  onChange,
  onSelectCompany,
  fallbackCompany,
  inherited,
  teamId,
  trigger,
  readOnly,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  onSelectCompany?: (company: CompanySummary | null) => void;
  fallbackCompany?: CompanyRef | null;
  inherited?: boolean;
  teamId?: number;
  trigger?: ReactNode;
  readOnly?: boolean;
}) {
  const t = useTranslations('companies.select');
  const shell = useContext(ShellCtx);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: companies = [], isLoading } = useCompaniesQuery({
    search: query.trim() || undefined,
    teamId: teamId ?? shell?.project?.project.teamId,
  });

  const fromList = companies.find((c) => c.id === value) ?? null;
  const current =
    fromList ??
    (fallbackCompany && (value == null || fallbackCompany.id === value) ? fallbackCompany : null);

  const select = (company: CompanySummary | null) => {
    onChange(company?.id ?? null);
    onSelectCompany?.(company);
    setOpen(false);
  };

  const inheritedSuffix = inherited ? ` (${t('inherited')})` : '';
  const displayText = current
    ? `${current.code ? `${current.code} · ` : ''}${current.name}${inheritedSuffix}`
    : t('label');
  const fullTooltipText = current
    ? `${current.code ? `[${current.code}] ` : ''}${current.name} — RUC: ${current.taxId}${inheritedSuffix}${current.isBlacklisted ? ` [${t('blacklist')}: ${current.blacklistReason || 'Sancionada'}]` : ''}`
    : null;

  if (readOnly) {
    if (!current) return null;
    const readOnlyContent = (
      <div className="flex max-w-[260px] items-center gap-1.5 text-xs">
        {current.isBlacklisted ? (
          <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
        ) : (
          <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate font-medium">{current.name}</span>
        <span className="shrink-0 font-mono text-muted-foreground">({current.taxId})</span>
        {inherited && (
          <Badge variant="outline" className="h-4 shrink-0 px-1 text-[10px]">
            {t('inherited')}
          </Badge>
        )}
        {current.isBlacklisted && (
          <Badge variant="destructive" className="h-4 shrink-0 gap-0.5 px-1 text-[10px]">
            <AlertTriangle className="size-2.5" />
            {t('blacklist')}
          </Badge>
        )}
      </div>
    );

    if (fullTooltipText) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex max-w-full cursor-default">{readOnlyContent}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {fullTooltipText}
          </TooltipContent>
        </Tooltip>
      );
    }

    return readOnlyContent;
  }

  let triggerIcon: ReactNode;
  if (current == null) {
    triggerIcon = <CircleDashed className="size-3.5 shrink-0" />;
  } else if (current.isBlacklisted) {
    triggerIcon = <AlertTriangle className="size-3.5 shrink-0 text-destructive" />;
  } else {
    triggerIcon = <Building2 className="size-3.5 shrink-0" />;
  }

  const triggerPill = trigger ?? (
    <Pill
      active={current != null}
      className={
        current?.isBlacklisted
          ? 'border-destructive/50 bg-destructive/10 text-destructive'
          : undefined
      }
    >
      {triggerIcon}
      <span className="max-w-[180px] truncate">{displayText}</span>
    </Pill>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>{triggerPill}</PopoverTrigger>
        </TooltipTrigger>
        {fullTooltipText && !open && (
          <TooltipContent side="top" className="max-w-xs text-xs">
            {fullTooltipText}
          </TooltipContent>
        )}
      </Tooltip>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={t('search')} value={query} onValueChange={setQuery} />
          <CommandList>
            {isLoading && (
              <div className="p-2 text-center text-xs text-muted-foreground">{t('loading')}</div>
            )}
            {!isLoading && companies.length === 0 && <CommandEmpty>{t('notFound')}</CommandEmpty>}
            <CommandGroup>
              {value != null && (
                <CommandItem
                  onSelect={() => select(null)}
                  className="justify-between text-muted-foreground"
                >
                  <span className="flex items-center gap-2">
                    <X className="size-3.5" />
                    {t('clear')}
                  </span>
                </CommandItem>
              )}
              {companies.map((c) => (
                <CommandItem
                  key={c.id}
                  value={String(c.id)}
                  onSelect={() => select(c)}
                  className="flex items-center justify-between"
                >
                  <div className="flex min-w-0 flex-col pe-2">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium">{c.name}</span>
                      {c.isBlacklisted && (
                        <Badge variant="destructive" className="h-3.5 gap-0.5 px-1 text-[9px]">
                          <AlertTriangle className="size-2.5" />
                          {t('blacklist')}
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {c.code ? `${c.code} • ` : ''}
                      {c.taxId} {c.city ? `• ${c.city}` : ''}
                    </span>
                  </div>
                  {c.id === value && <Check className="size-3.5 shrink-0 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
