import { useState, type ReactNode } from 'react';
import { Building2, Check, AlertTriangle, CircleDashed, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  trigger,
  readOnly,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  trigger?: ReactNode;
  readOnly?: boolean;
}) {
  const t = useTranslations('companies.select');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: companies = [], isLoading } = useCompaniesQuery({
    search: query.trim() || undefined,
  });

  const current = companies.find((c) => c.id === value) ?? null;

  const select = (id: number | null) => {
    onChange(id);
    setOpen(false);
  };

  const displayText = current ? `${current.name} (${current.taxId})` : t('label');
  const fullTooltipText = current
    ? `${current.name} — RUC: ${current.taxId}${current.isBlacklisted ? ` [${t('blacklist')}: ${current.blacklistReason || 'Sancionada'}]` : ''}`
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

  const triggerPill = trigger ?? (
    <Pill
      active={value != null}
      className={
        current?.isBlacklisted
          ? 'border-destructive/50 bg-destructive/10 text-destructive'
          : undefined
      }
    >
      {value != null ? (
        current?.isBlacklisted ? (
          <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
        ) : (
          <Building2 className="size-3.5 shrink-0" />
        )
      ) : (
        <CircleDashed className="size-3.5 shrink-0" />
      )}
      <span className="max-w-[160px] truncate">{displayText}</span>
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
                  onSelect={() => select(c.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex min-w-0 flex-col pr-2">
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
